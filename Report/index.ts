import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import crypto from 'crypto';

import { validateManifest, Manifest, Validation } from '@pwabuilder/manifest-validation';
import { checkParams } from '../utils/checkParams.js';
import { getManifestByLink } from '../utils/getManifestByLink.js';
import {
  analyzeServiceWorker,
  AnalyzeServiceWorkerResponce,
} from '../utils/analyzeServiceWorker.js';
import { AnalyticsInfo, uploadToAppInsights } from '../utils/analytics.js';
import { Report } from './type.js';

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import childProcess, { ChildProcess, exec, spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
// const _root = `${__dirname}/../..`;

const AZURE_FUNC_TIMEOUT = 1.5 * 60 * 1000;
const SPAWN_TIMEOUT = AZURE_FUNC_TIMEOUT - 10 * 1000;

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  const checkResult = checkParams(req, ['site']);
  if (checkResult.status !== 200) {
    context.res = checkResult;
    context.log.error(`Report: ${checkResult.body?.error.message}`);
    return;
  }

  context.log.info(
    `Report: function is processing a request for site: ${req.query.site}`
  );

  const url = req.query.site as string;
  const desktop = req.query.desktop == 'true' ? true : undefined;

  try {
    const webAppReport = (await audit(url, desktop, context)) as Report;
    if (!webAppReport) throw new Error('Lighthouse audit failed');

    let analyticsInfo = new AnalyticsInfo();
    analyticsInfo.url = url;
    analyticsInfo.platformId = req.headers['platform-identifier'];
    analyticsInfo.platformIdVersion =
      req.headers['platform-identifier-version'];
    analyticsInfo.correlationId = req.headers['correlation-id'];
    await uploadToAppInsights(webAppReport, analyticsInfo);

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

const lighthouse = (params: string[]): { child: ChildProcess; promise: Promise<string | null> } => {
  const child = spawn(
    `node`, 
    [`${__dirname}/lighthouse.js`], 
    {
      stdio: 'pipe'
    }
  ) as ChildProcess;

  let output = '';

  return {
    child,
    promise: new Promise(resolveFunc => {
     
      // child.on('message', chunk => {
      //   output = JSON.stringify(chunk);
      // });
      child.stdout?.on('data', chunk => {
        output+=chunk;
      });

      child.on('exit', code => {
        resolveFunc(output);
      });
      child.on('error', err => {
        output = err.toString();
      });
    }),
  };
};

const killProcess = (pid?: number) => {
  if (pid)
    if (process.platform == 'win32') {
      exec(`taskkill /PID ${pid} /T /F`);
    } else {
      process.kill(-pid);
    }
};

const audit = async (
  url: string,
  desktop?: boolean,
  context?: Context
): Promise<Report | null> => {


  let rawResult: { audits?: unknown } = {};
  let spawnResult:
    | { child: ChildProcess; promise: Promise<String | null> }
    | undefined;


  try {

    spawnResult = lighthouse(
      [url, desktop ? 'desktop' : 'mobile']
    );

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
  } 

  const audits = rawResult?.audits || null;
  if (!audits) return null;

  const artifacts: {
    WebAppManifest?: {
      raw?: string;
      url?: string;
      json?: unknown;
      validation?: Validation[];
    };
    ServiceWorker?: {
      raw?: string[];
      url?: string;
    };
  } = {};
  let swFeatures: AnalyzeServiceWorkerResponce | null = null;

  const processServiceWorker = async () => {
    if (audits['service-worker']?.details?.scriptUrl) {
      artifacts.ServiceWorker = {
        url: audits['service-worker']?.details?.scriptUrl,
      };
      try {
        swFeatures = await analyzeServiceWorker(artifacts.ServiceWorker.url);
      } catch (error: any) {
        swFeatures = {
          error: error,
        };
      }
      artifacts.ServiceWorker.raw = swFeatures?.raw;
    }
  };

  const processManifest = async () => {
    if (audits['installable-manifest']?.details?.debugData?.manifestUrl) {
      artifacts.WebAppManifest = {
        url: audits['installable-manifest']?.details?.debugData?.manifestUrl,
      };

      if (artifacts.WebAppManifest.url) {
        const results = await getManifestByLink(
          artifacts.WebAppManifest.url,
          url
        );
        if (results && !results.error) {
          artifacts.WebAppManifest.raw = results.raw;
          artifacts.WebAppManifest.json = results.json;
          audits['installable-manifest'].details.validation = await validateManifest(results.json as Manifest, true);
        }
      }
    } else {
      delete artifacts.WebAppManifest;
    }
  };

  await Promise.allSettled([processServiceWorker(), processManifest()]);

  const report = {
    audits: {
      isOnHttps: { score: audits['is-on-https']?.score ? true : false },
      installableManifest: {
        score: audits['installable-manifest']?.score ? true : false,
        details: {
          url:
            audits['installable-manifest']?.details?.debugData?.manifestUrl ||
            undefined,
            validation: audits['installable-manifest']?.details?.validation || undefined
        },
      },
      serviceWorker: {
        score: audits['service-worker']?.score ? true : false,
        details: {
          url: audits['service-worker']?.details?.scriptUrl || undefined,
          scope: audits['service-worker']?.details?.scopeUrl || undefined,
          features: swFeatures
            ? { ...(swFeatures as object), raw: undefined }
            : undefined,
        },
      },
      maskableIcon: { score: audits['maskable-icon']?.score ? true : false },
      // splashScreen: { score: audits['splash-screen']?.score ? true : false },
      // themedOmnibox: { score: audits['themed-omnibox']?.score ? true : false },
      // viewport: { score: audits['viewport']?.score ? true : false },
    },
    artifacts: {
      webAppManifest: artifacts?.WebAppManifest,
      serviceWorker: artifacts?.ServiceWorker,
    },
  };

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
 */