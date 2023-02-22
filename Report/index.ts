import { AzureFunction, Context, HttpRequest } from '@azure/functions';


// import lighthouse from 'lighthouse';
// import { screenEmulationMetrics, /*userAgents */} from 'lighthouse/core/config/constants.js';


import { closeBrowser, getBrowser } from '../utils/browserLauncher.js';
import { checkParams } from '../utils/checkParams.js';
import { analyzeServiceWorker, AnalyzeServiceWorkerResponce } from '../utils/analyzeServiceWorker.js';


import { dirname } from 'path';
import { fileURLToPath } from 'url';
import childProcess from 'child_process';
import util from 'util';
const exec = util.promisify(childProcess.exec);
const __dirname = dirname(fileURLToPath(import.meta.url));


// import { LaunchedChrome } from 'chrome-launcher';
import puppeteer from 'puppeteer';
const browserFetcher = puppeteer.createBrowserFetcher();
const localRevisions = await browserFetcher.localRevisions();
const firstRevision = localRevisions?.length? browserFetcher.revisionInfo(localRevisions[0]) : null;



// custom use agents
const userAgents = {
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.42',
  mobile: 'Mozilla/5.0 (Linux; Android 12; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36 Edg/108.0.1462.42'
}

const MAX_WAIT_FOR_LOAD = 25; //seconds
const MAX_WAIT_FOR_FCP = 10; //seconds

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
    `Report function is processing a request for site: ${req.query.site}`
  );

  const url = req.query.site as string;
  const desktop = req.query.desktop == 'true'? true : undefined;
  // let currentBrowser: LaunchedChrome | undefined = undefined;

  try {
    // run lighthouse audit

    // currentBrowser = await getBrowser(context);

    if (true) {
      const webAppReport = await audit(null, url, desktop);
      if (!webAppReport)
        throw new Error('Lighthouse audit failed');

      // await closeBrowser(context, currentBrowser);

      context.res = {
        status: 200,
        body: {
          data: webAppReport,
        },
      };

      context.log.info(
        `Report function is DONE processing a request for site: ${req.query.site}`
      );
    }
  } catch (error: any) {
    // await closeBrowser(context, currentBrowser);

    context.res = {
      status: 500,
      body: {
        error: error?.toString?.() || error,
      },
    };

    if (error.name && error.name.indexOf('TimeoutError') > -1) {
      context.log.error(
        `Report function TIMED OUT processing a request for site: ${url}`
      );
    } else {
      context.log.error(
        `Report function failed for ${url} with the following error: ${error}
        paths: ${firstRevision?.executablePath} ${puppeteer.executablePath()}`
      );
    }
  }
};

const audit = async (browser: any, url: string, desktop?: boolean) => {

  // Puppeteer with Lighthouse
  // const config = {
  //   port: browser.port, //new URL(browser.wsEndpoint()).port,
  //   logLevel: 'info', // 'silent' | 'error' | 'info' | 'verbose'
  //   output: 'json',   // 'json' | 'html' | 'csv'
  //   locale: 'en-US',

  //   maxWaitForFcp: MAX_WAIT_FOR_FCP * 1000,
  //   maxWaitForLoad: MAX_WAIT_FOR_LOAD * 1000,

  //   // disableDeviceEmulation: true,
  //   // disableStorageReset: true,
  //   // chromeFlags: [/*'--disable-mobile-emulation',*/ '--disable-storage-reset'],
    
  //   skipAboutBlank: true,
  //   formFactor: desktop ? 'desktop' : 'mobile', // 'mobile'|'desktop';
  //   // screenEmulation: desktop ? screenEmulationMetrics.desktop : screenEmulationMetrics.mobile,  
  //   emulatedUserAgent: desktop ? userAgents.desktop : userAgents.mobile,  
  //   throttlingMethod: 'provided', // 'devtools'|'simulate'|'provided';
  //   throttling: false,
  //   onlyAudits: ['service-worker', 'installable-manifest', 'is-on-https', 'maskable-icon', 'apple-touch-icon', 'splash-screen', 'themed-omnibox', 'viewport'],
  //   // onlyCategories: ['pwa'] ,
  //   // skipAudits: ['pwa-cross-browser', 'pwa-each-page-has-url', 'pwa-page-transitions', 'full-page-screenshot', 'network-requests', 'errors-in-console', 'diagnostics'],
  // }
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
    `${__dirname}/../../node_modules/.bin/lighthouse ${throttling} ${url} --output json${desktop? ' --preset=desktop':''} ${onlyAudits} ${chromeFlags} --disable-full-page-screenshot --disable-storage-reset`
    ,
    { env: { ...process.env, CHROME_PATH: firstRevision?.executablePath || puppeteer.executablePath(), TEMP: `${__dirname}/../../temp` } }
    );
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
      json?: null
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

      try{
        artifacts.WebAppManifest.raw = await (await fetch(artifacts.WebAppManifest.url!)).text();
        artifacts.WebAppManifest.json = JSON.parse(artifacts.WebAppManifest.raw);
      } catch{}
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
      // appleTouchIcon: { score: audits['apple-touch-icon']?.score? true : false },
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
 *        - $ref: components.yaml#/parameters/site
 *        - name: desktop
 *          schema: 
 *            type: boolean
 *            # default: ''
 *          in: query
 *          description: Use desktop form factor
 *          required: false
 *      responses:
 *        '200':
 *          $ref: components.yaml#/responses/report/200
 */​
