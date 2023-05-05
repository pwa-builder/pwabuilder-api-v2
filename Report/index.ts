import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { promises as fs } from 'fs';
import crypto from 'crypto';

import { checkParams } from '../utils/checkParams.js';
import { getManifestByLink } from '../utils/getManifestByLink.js';
import { analyzeServiceWorker, AnalyzeServiceWorkerResponce } from '../utils/analyzeServiceWorker.js';
import { Report } from './type.js';

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import childProcess, { ChildProcess, exec, spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const _root = `${__dirname}/../..`;

import puppeteer from 'puppeteer';
import { BrowserFetcher } from 'puppeteer-core/lib/cjs/puppeteer/node/BrowserFetcher.js'
// @ts-ignore
const browserFetcher = new BrowserFetcher(_root, { path: join(_root, '.cache', 'puppeteer', 'chrome')});
const localRevisions = await browserFetcher.localRevisions();
const firstRevision = localRevisions?.length? browserFetcher.revisionInfo(localRevisions[0]) : null;

const AZURE_FUNC_TIMEOUT = 2 * 60  * 1000;
const SPAWN_TIMEOUT = AZURE_FUNC_TIMEOUT - 10 * 1000;
const LIGHTHOUSE_TIMEOUT = 15 * 1000;

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
    const webAppReport = await audit(url, desktop, context);
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

const lighthouse = (params: string[], options: childProcess.SpawnOptions): {child: ChildProcess, promise: Promise<string | null> } => {
  const child = spawn(
    `node`,
    params, 
    options) as ChildProcess;
  
  let output = '';

  return {
    child,
    promise: new Promise((resolveFunc) => {
      if (child.stdout)
        child.stdout.on("data", (chunk) => {
          output += chunk.toString();
        });
      
      child.on("exit", (code) => {
        resolveFunc(output);
      });
      // child.on("error", (err) => {
      //   child.kill();
      // });
    })
  }
   
}

const killProcess = (pid?: number) => {
  if (pid)
    if(process.platform == "win32"){
      exec(`taskkill /PID ${pid} /T /F`)
    }
    else{
        process.kill(-pid);
    }
}

const audit = async (url: string, desktop?: boolean, context?: Context): Promise<Report|null> => {

  const onlyAudits = `--only-audits=${[
    'service-worker',
    'installable-manifest',
    'is-on-https',
    'maskable-icon',
    'splash-screen',
    'themed-omnibox', 
    'viewport'
  ].join(',')}`;

  // adding puppeter's like flags https://github.com/puppeteer/puppeteer/blob/main/packages/puppeteer-core/src/node/ChromeLauncher.ts
  // on to op chrome-launcher https://github.com/GoogleChrome/chrome-launcher/blob/main/src/flags.ts#L13
  const chromeFlags = `--chrome-flags="${[
    '--headless=new',
   	'--no-sandbox',
    '--no-pings',
    '--enable-automation',
    // '--enable-features=NetworkServiceInProcess2',
    '--allow-pre-commit-input',
    '--deny-permission-prompts',
    '--disable-breakpad',
    '--disable-dev-shm-usage',
    '--disable-domain-reliability',
    '--disable-hang-monitor',
    '--disable-ipc-flooding-protection',
    '--disable-popup-blocking',
    '--disable-prompt-on-repost',
    '--disable-renderer-backgrounding',
    '--disabe-gpu',
    '--disable-dev-shm-usage',
    '--block-new-web-contents',
    // '--single-process',
  ].join(' ')}"`;
  const throttling = `--max-wait-for-load=${LIGHTHOUSE_TIMEOUT} --throttling-method=simulate --throttling.rttMs=0 --throttling.throughputKbps=0 --throttling.requestLatencyMs=0 --throttling.downloadThroughputKbps=0 --throttling.uploadThroughputKbps=0 --throttling.cpuSlowdownMultiplier=0`;
  
  let rawResult: { audits?: unknown} = {};
  let spawnResult: {child: ChildProcess, promise: Promise<String | null>} | undefined;

  const reportId = crypto.randomUUID();
  const tempFolder = `${_root}/temp`;
  const reportFile = `${tempFolder}/${reportId}_report.json`;

  try {
    await fs.mkdir(tempFolder).catch(() => {});
    // --output-path=${reportFile}
    spawnResult = lighthouse(
      [...`${_root}/node_modules/lighthouse/cli/index.js --quiet=true ${throttling} ${url} --output=json${desktop? ' --preset=desktop':''} ${onlyAudits} --disable-full-page-screenshot --disable-storage-reset`.split(' '), `${chromeFlags}`], 
      { env: { 
        ...process.env,
        CHROME_PATH: firstRevision?.executablePath || puppeteer.executablePath(), 
        TEMP: `${_root}/temp`,
        PATCHED: 'true',
      }
      // ,
      // cwd: `${_root}/node_modules/.bin/`,
      // shell: true,
      // stdio: 'pipe',
      // detached: true
    });

    const spawnTimeout = setTimeout(() => {
      killProcess(spawnResult?.child?.pid);
    }, SPAWN_TIMEOUT);

    let reportRaw = await spawnResult.promise;
    clearTimeout(spawnTimeout);

    if (typeof reportRaw == 'string' && reportRaw.length)
      rawResult = JSON.parse(reportRaw);
  } catch (error) {
    context?.log.warn(error);
    killProcess(spawnResult?.child?.pid);
  } finally{
    fs.unlink(reportFile).catch(() => {});
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
