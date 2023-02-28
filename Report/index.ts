import { AzureFunction, Context, HttpRequest } from '@azure/functions';

import { checkParams } from '../utils/checkParams.js';
import { analyzeServiceWorker, AnalyzeServiceWorkerResponce } from '../utils/analyzeServiceWorker.js';

import { dirname } from 'path';
import { fileURLToPath } from 'url';
import childProcess from 'child_process';
import util from 'util';
const exec = util.promisify(childProcess.exec);
const __dirname = dirname(fileURLToPath(import.meta.url));

import puppeteer from 'puppeteer';
import { getManifestByLink } from '../utils/getManifestByLink.js';
const browserFetcher = puppeteer.createBrowserFetcher();
const localRevisions = await browserFetcher.localRevisions();
const firstRevision = localRevisions?.length? browserFetcher.revisionInfo(localRevisions[0]) : null;


const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {

  const checkResult = checkParams(req, ['site']);
  if (checkResult.status !== 200){
    context.res = checkResult;
    context.log.error(`Report: ${checkResult.body?.error.message}`);
    return;
  }
  
  context.log.info(
    `Report: function is processing a request for site: ${req.query.site}`
  );

  const url = req.query.site as string;
  const desktop = req.query.desktop == 'true'? true : undefined;

  try {
    const webAppReport = await audit(url, desktop);
    if (!webAppReport)
      throw new Error('Lighthouse audit failed');

    context.res = {
      status: 200,
      body: {
        data: webAppReport,
      },
    };

    context.log.info(
      `Report: function is DONE processing a request for site: ${req.query.site}`
    );
    
  } catch (error: any) {
    context.res = {
      status: 500,
      body: {
        error: error?.toString?.() || error,
      },
    };

    if (error.name && error.name.indexOf('TimeoutError') > -1) {
      context.log.error(
        `Report: function TIMED OUT processing a request for site: ${url}`
      );
    } else {
      context.log.error(
        `Report: function failed for ${url} with the following error: ${error}`
      );
    }
  }
};

const audit = async (url: string, desktop?: boolean) => {

  const onlyAudits = `--only-audits=${[
    'service-worker',
    'installable-manifest',
    'is-on-https',
    'maskable-icon',
    // 'apple-touch-icon',
    'splash-screen',
    'themed-omnibox', 
    'viewport'
  ].join(',')}`;
  const chromeFlags = `--chrome-flags="${[
    '--headless',
   	'--no-sandbox',
	 	'--enable-automation',
    '--disable-background-networking',
    '--enable-features=NetworkServiceInProcess2',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-breakpad',
    '--disable-client-side-phishing-detection',
    '--disable-component-extensions-with-background-pages',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-dev-shm-usage',
    '--disable-domain-reliability',
    '--disable-extensions',
    '--disable-features=Translate,BackForwardCache,AcceptCHFrame,AvoidUnnecessaryBeforeUnloadCheckSync',
    '--disable-hang-monitor',
    '--disable-ipc-flooding-protection',
    '--disable-popup-blocking',
    '--disable-prompt-on-repost',
    '--disable-renderer-backgrounding',
    '--disable-sync',
    '--force-color-profile=srgb',
    '--metrics-recording-only',
    '--no-first-run',
    '--no-default-browser-check',
    '--mute-audio',
    '--password-store=basic',
    '--use-mock-keychain',
    '--enable-blink-features=IdleDetection',
    '--export-tagged-pdf',
    '--disabe-gpu',
  ].join(' ')}"`;
  const throttling = '--throttling-method=simulate --throttling.rttMs=0 --throttling.throughputKbps=0 --throttling.requestLatencyMs=0 --throttling.downloadThroughputKbps=0 --throttling.uploadThroughputKbps=0 --throttling.cpuSlowdownMultiplier=0'
  
  let { stdout, stderr } = await exec(
    `${__dirname}/../../node_modules/.bin/lighthouse ${throttling} ${url} --output json${desktop? ' --preset=desktop':''} ${onlyAudits} ${chromeFlags} --disable-full-page-screenshot --disable-storage-reset`,
    { env: { 
        ...process.env, 
        CHROME_PATH: firstRevision?.executablePath || puppeteer.executablePath(), 
        TEMP: `${__dirname}/../../temp`,
        PATCHED: 'true',
      } 
    });

  let rawResult: { audits?: unknown} = {};

  if (stdout)
    try {
      rawResult = JSON.parse(stdout);
    } catch (error) {
      return null;
    }

  const audits = rawResult?.audits || null;
  if (!audits)
    return null;

  const artifacts: {
    WebAppManifest?: {
      raw?: string,
      url?: string,
      json?: unknown
    },
    ServiceWorker?: {
      raw?: string[],
      url?: string,
    }
  } = {};
  let swFeatures: AnalyzeServiceWorkerResponce | null = null;

  const processServiceWorker = async () => {
    if (audits['service-worker']?.details?.scriptUrl) {
      artifacts.ServiceWorker = {
        url: audits['service-worker']?.details?.scriptUrl,
      };
      try{
        swFeatures = await analyzeServiceWorker(artifacts.ServiceWorker.url);
      }
      catch(error: any){
        swFeatures = {
          error: error
        }
      }
      artifacts.ServiceWorker.raw = swFeatures?.raw;
    }
  }
  
  const processManifest = async () => {
    if (audits['installable-manifest']?.details?.debugData?.manifestUrl) {
      artifacts.WebAppManifest = {
        url: audits['installable-manifest']?.details?.debugData?.manifestUrl,
      };

      if (artifacts.WebAppManifest.url){
        const results = await getManifestByLink(artifacts.WebAppManifest.url, url);
        if (results && !results.error) {
          artifacts.WebAppManifest.raw = results.raw;
          artifacts.WebAppManifest.json = results.json;
        }
      }
    }
    else {
      delete artifacts.WebAppManifest;
    }
  }

  await Promise.allSettled([processServiceWorker(), processManifest()]);
   

  const report = {
    audits: {
      isOnHttps: { score: audits['is-on-https']?.score? true : false },
      installableManifest: { 
        score: audits['installable-manifest']?.score? true : false,
        details: { url: audits['installable-manifest']?.details?.debugData?.manifestUrl || undefined }
      },
      serviceWorker: {
        score: audits['service-worker']?.score? true : false,
        details: {
          url: audits['service-worker']?.details?.scriptUrl || undefined,
          scope: audits['service-worker']?.details?.scopeUrl || undefined,
          features: swFeatures? {...(swFeatures as object), raw: undefined} : undefined
        }
       },
      maskableIcon: { score: audits['maskable-icon']?.score? true : false },
      splashScreen: { score: audits['splash-screen']?.score? true : false },
      themedOmnibox: { score: audits['themed-omnibox']?.score? true : false },
      viewport: { score: audits['viewport']?.score? true : false }
    },
    artifacts: {
      webAppManifest: artifacts?.WebAppManifest,
      serviceWorker: artifacts?.ServiceWorker,
    }
  }

  return report;
};

export default httpTrigger;

/**
 * @openapi
 *  /Report:
 *    get:
 *      summary: Lighthouse report
 *      description: Generate PWA-related Lighthouse report for webapp
 *      tags:
 *        - Report
 *      parameters:
 *        - $ref: ?file=components.yaml#/parameters/site
 *        - name: desktop
 *          schema: 
 *            type: boolean
 *            # default: ''
 *          in: query
 *          description: Use desktop form factor
 *          required: false
 *      responses:
 *        '200':
 *          $ref: ?file=components.yaml#/responses/report/200
 */​
