import { AzureFunction, Context, HttpRequest } from '@azure/functions';

import {
  validateManifest,
  Manifest,
  Validation,
} from '@pwabuilder/manifest-validation';
import { checkParams } from '../utils/checkParams.js';
import { getManifestByLink } from '../utils/getManifestByLink.js';
import {
  analyzeServiceWorker,
  AnalyzeServiceWorkerResponse,
} from '../utils/analyzeServiceWorker.js';
import { AnalyticsInfo, uploadToAppInsights } from '../utils/analytics.js';
import { Report } from './type.js';

import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { ChildProcess, exec, spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
// const _root = `${__dirname}/../..`;

const AZURE_FUNC_TIMEOUT = 3 * 60 * 1000;
const SPAWN_TIMEOUT = AZURE_FUNC_TIMEOUT - 15 * 1000;

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
  const validation = req.query.validation == 'true' ? true : undefined;

  try {
    const webAppReport = (await audit(
      url,
      desktop,
      validation,
      context
    )) as Report;
    if (!webAppReport || webAppReport.error) {
      throw new Error(webAppReport?.error || 'UnexpectedError');
    }

    let analyticsInfo = new AnalyticsInfo();
    analyticsInfo.url = url;
    analyticsInfo.platformId = req.headers['platform-identifier'];
    analyticsInfo.platformIdVersion =
      req.headers['platform-identifier-version'];
    analyticsInfo.correlationId = req.headers['correlation-id'];
    analyticsInfo.properties = req.query.ref ? { referrer: req.query.ref } : {};
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

const lighthouse = (
  params: string[]
): { child: ChildProcess; promise: Promise<string | null> } => {
  const child = spawn(
    `node`,
    [`${__dirname}/lighthouse/lighthouse.js`, ...params],
    {
      stdio: 'pipe',
    }
  ) as ChildProcess;

  let output = '';

  return {
    child,
    promise: new Promise(resolveFunc => {
      child.stdout?.on('data', chunk => {
        output += chunk;
      });

      child.on('exit', code => {
        resolveFunc(output);
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
  validation?: boolean,
  context?: Context
): Promise<Report | null> => {
  let rawResult: {
    audits?: unknown;
    artifacts?: {
      Manifest: { raw: string; url: string };
      ServiceWorker: { url: string };
    };
  } = {};
  let spawnResult:
    | { child: ChildProcess; promise: Promise<String | null> }
    | undefined;
  let timeoutError = false;

  try {
    spawnResult = lighthouse([url, desktop ? 'desktop' : 'mobile']);

    const spawnTimeout = setTimeout(() => {
      killProcess(spawnResult?.child?.pid);
      timeoutError = true;
    }, SPAWN_TIMEOUT);

    // @ts-ignore
    let reportRaw = await spawnResult.promise;
    clearTimeout(spawnTimeout);

    if (typeof reportRaw == 'string' && reportRaw.length)
      rawResult = JSON.parse(reportRaw);
  } catch (error) {
    context?.log.warn(error);
    killProcess(spawnResult?.child?.pid);
  }

  const audits = rawResult?.audits || null;
  const artifacts_lh = rawResult?.artifacts || null;
  if (!audits || timeoutError) {
    context?.log.warn(rawResult);
    return {
      error: timeoutError ? 'TimeoutError' : 'AuditFailed',
    };
  }

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
  let swFeatures: AnalyzeServiceWorkerResponse | null = null;

  const processServiceWorker = async () => {
    if (audits['service-worker-audit']?.details?.scriptUrl) {
      artifacts.ServiceWorker = {
        url: audits['service-worker-audit']?.details?.scriptUrl,
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

  const validateIconsMetadata = async (
    manifest: Manifest,
    manifestUrl: string
  ): Promise<Validation | null> => {
    // Map icon src to absolute URLs
    const iconUrls = (manifest.icons ?? []).map(icon => ({
      src: icon.src,
      url: new URL(icon.src, manifestUrl).toString(),
      type: icon.type,
      sizes: icon.sizes,
    }));

    // Perform HEAD requests to check existence
    const results = await Promise.all(
      iconUrls.map(async icon => {
        try {
          const res = await fetch(icon.url, { method: 'HEAD' });
          return {
            ...icon,
            exists: res.ok,
          };
        } catch {
          return {
            ...icon,
            exists: false,
          };
        }
      })
    );

    const isValid = results.every(icon => icon.exists);
    const missingIcons = results
      .filter(icon => !icon.exists)
      .map(icon => icon.src);
    const validation: Validation = {
      member: 'icons',
      category: 'required',
      displayString: 'Manifest icons exist',
      errorString: isValid
        ? ''
        : `Couldn't fetch the following icons: ${missingIcons.join(', ')}`,
      infoString:
        'The icons member specifies an array of objects representing image files that can serve as application icons for different contexts.',
      docsLink: 'https://docs.pwabuilder.com/#/builder/manifest?id=icons',
      quickFix: false,
      valid: isValid,
    };

    return validation;
  };

  const validateScreenshotsMetadata = async (
    manifest: Manifest,
    manifestUrl: string
  ): Promise<Validation | null> => {
    // Map screenshots src to absolute URLs
    const screenshotsUrls = (manifest.screenshots ?? []).map(screenshot => ({
      src: screenshot.src,
      url: new URL(screenshot.src, manifestUrl).toString(),
      type: screenshot.type,
      sizes: screenshot.sizes,
      platform: screenshot.platform,
    }));

    // Perform HEAD requests to check existence
    const results = await Promise.all(
      screenshotsUrls.map(async screenshot => {
        try {
          const res = await fetch(screenshot.url, { method: 'HEAD' });
          return {
            ...screenshot,
            exists: res.ok,
          };
        } catch {
          return {
            ...screenshot,
            exists: false,
          };
        }
      })
    );

    const isValid = results.every(screenshot => screenshot.exists);
    const missingScreenshots = results
      .filter(screenshot => !screenshot.exists)
      .map(screenshot => screenshot.src);

    const validation: Validation = {
      member: 'screenshots',
      category: 'required',
      displayString: 'Manifest screenshots exist',
      errorString: isValid
        ? ''
        : `Couldn't fetch the following screenshots: ${missingScreenshots.join(
            ', '
          )}`,
      infoString:
        'The screenshots member defines an array of screenshots intended to showcase the application.',
      docsLink: 'https://docs.pwabuilder.com/#/builder/manifest?id=screenshots',
      quickFix: false,
      valid: isValid,
    };

    return validation;
  };

  const processManifest = async () => {
    if (artifacts_lh?.Manifest?.url && artifacts_lh?.Manifest?.raw) {
      try {
        artifacts.WebAppManifest = {
          url: artifacts_lh?.Manifest?.url,
          raw: artifacts_lh?.Manifest?.raw,
          json: JSON.parse(artifacts_lh?.Manifest?.raw),
        };
        if (validation)
          audits['installable-manifest'].details.validation =
            await validateManifest(
              artifacts.WebAppManifest.json as Manifest,
              true
            );
        return;
      } catch (error) {}
    }
    if (audits['installable-manifest']?.details?.debugData?.manifestUrl) {
      artifacts.WebAppManifest = {
        url: audits['installable-manifest']?.details?.debugData?.manifestUrl,
      };

      if (artifacts.WebAppManifest.url && !artifacts_lh?.Manifest?.raw) {
        const results = await getManifestByLink(
          artifacts.WebAppManifest.url,
          url
        );
        if (results && !results.error) {
          artifacts.WebAppManifest.raw = results.raw;
          artifacts.WebAppManifest.json = results.json;
          if (validation)
            audits['installable-manifest'].details.validation =
              await validateManifest(results.json as Manifest, true);
        }
      }
    } else {
      delete artifacts.WebAppManifest;
    }
  };

  const processImages = async () => {
    if (artifacts_lh?.Manifest?.url && artifacts_lh?.Manifest?.raw) {
      try {
        artifacts.WebAppManifest = {
          url: artifacts_lh?.Manifest?.url,
          raw: artifacts_lh?.Manifest?.raw,
          json: JSON.parse(artifacts_lh?.Manifest?.raw),
        };

        const iconsValidation = await validateIconsMetadata(
          artifacts.WebAppManifest.json as Manifest,
          artifacts_lh?.Manifest?.url
        );
        const screenshotsValidation = await validateScreenshotsMetadata(
          artifacts.WebAppManifest.json as Manifest,
          artifacts_lh?.Manifest?.url
        );

        audits['images-audit'] = audits['images-audit'] || { details: {} };
        audits['images-audit'].score =
          (iconsValidation?.valid ?? false) &&
          (screenshotsValidation?.valid ?? false);
        audits['images-audit'].details.iconsValidation = iconsValidation;
        audits['images-audit'].details.screenshotsValidation =
          screenshotsValidation;
        return;
      } catch (error) {}
    }
  };

  await Promise.allSettled([
    processServiceWorker(),
    processManifest(),
    processImages(),
  ]);

  const report = {
    audits: {
      isOnHttps: { score: audits['https-audit']?.score ? true : false },
      noMixedContent: { score: audits['is-on-https']?.score ? true : false },
      installableManifest: {
        score: audits['installable-manifest']?.score ? true : false,
        details: {
          url:
            audits['installable-manifest']?.details?.debugData?.manifestUrl ||
            undefined,
          validation:
            audits['installable-manifest']?.details?.validation || undefined,
        },
      },
      serviceWorker: {
        score: audits['service-worker-audit']?.score ? true : false,
        details: {
          url: audits['service-worker-audit']?.details?.scriptUrl || undefined,
          scope: audits['service-worker-audit']?.details?.scopeUrl || undefined,
          features: swFeatures
            ? { ...(swFeatures as object), raw: undefined }
            : undefined,
          error: audits['service-worker-audit']?.details?.error || undefined,
        },
      },
      offlineSupport: {
        score: audits['offline-audit']?.score ? true : false,
      },
      images: {
        score: audits['images-audit']?.score,
        details: {
          iconsValidation: audits['images-audit']?.details?.iconsValidation,
          screenshotsValidation:
            audits['images-audit']?.details?.screenshotsValidation,
        },
      },
      // maskableIcon: { score: audits['maskable-icon']?.score ? true : false },
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
 *        - name: validation
 *          schema:
 *            type: boolean
 *            # default: ''
 *          in: query
 *          description: Include manifest fields validation
 *          required: false
 *      responses:
 *        '200':
 *          $ref: ?file=components.yaml#/responses/report/200
 */
