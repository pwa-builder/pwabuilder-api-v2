import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { Browser } from 'puppeteer';
import lighthouse from 'lighthouse';
import { screenEmulationMetrics, userAgents } from 'lighthouse/lighthouse-core/config/constants.js'

import { closeBrowser, getBrowser } from '../utils/loadPage';
import { checkParams } from '../utils/checkParams';
import { analyzeServiceWorker, AnalyzeServiceWorkerResponce } from '../utils/analyzeServiceWorker';

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

  const currentBrowser = await getBrowser(context);

  try {
    // run lighthouse audit

    if (currentBrowser) {
      const webAppReport = await audit(currentBrowser, url, desktop);

      await closeBrowser(context, currentBrowser);

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
    await closeBrowser(context, currentBrowser);

    context.res = {
      status: 500,
      body: {
        error: error,
      },
    };

    if (error.name && error.name.indexOf('TimeoutError') > -1) {
      context.log.error(
        `Report function TIMED OUT processing a request for site: ${url}`
      );
    } else {
      context.log.error(
        `Report function failed for ${url} with the following error: ${error}`
      );
    }
  }
};

const audit = async (browser: Browser, url: string, desktop?: boolean) => {

  // Puppeteer with Lighthouse
  const config = {
    port: new URL(browser.wsEndpoint()).port,
    logLevel: 'info', // 'silent' | 'error' | 'info' | 'verbose'
    output: 'json',   // 'json' | 'html' | 'csv'
    locale: 'en-US',

    maxWaitForFcp: 15 * 1000,
    maxWaitForLoad: 30 * 1000,

    // disableDeviceEmulation: true,
    // disableStorageReset: true,
    // chromeFlags: [/*'--disable-mobile-emulation',*/ '--disable-storage-reset'],

    skipAboutBlank: true,
    formFactor: desktop ? 'desktop' : 'mobile', // 'mobile'|'desktop';
    screenEmulation: desktop ? screenEmulationMetrics.desktop : screenEmulationMetrics.mobile,  
    emulatedUserAgent: desktop ? userAgents.desktop : userAgents.mobile,  
    throttlingMethod: 'provided', // 'devtools'|'simulate'|'provided';
    throttling: false,
    onlyAudits: ['service-worker', 'installable-manifest', 'is-on-https', 'maskable-icon', 'apple-touch-icon', 'splash-screen', 'themed-omnibox', 'viewport'],
    // onlyCategories: ['pwa'] ,
    // skipAudits: ['pwa-cross-browser', 'pwa-each-page-has-url', 'pwa-page-transitions', 'full-page-screenshot', 'network-requests', 'errors-in-console', 'diagnostics'],
  }
  
  const rawResult = await lighthouse(url, config);

  const audits = rawResult?.lhr?.audits;
  const artifacts = rawResult?.artifacts;
  
  if (!audits) {
    return null;
  }

  let swFeatures: AnalyzeServiceWorkerResponce | null = null;
  if (audits['service-worker']?.details?.scriptUrl) {
    try{
      swFeatures = audits['service-worker']?.details?.scriptUrl? await analyzeServiceWorker(audits['service-worker'].details.scriptUrl) : null;
    }
    catch(error: any){
      swFeatures = {
        error: error
      }
    }
  }
   

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
          features: swFeatures? {...swFeatures, raw: undefined} : undefined
        }
       },
      appleTouchIcon: { score: audits['apple-touch-icon']?.score? true : false },
      maskableIcon: { score: audits['maskable-icon']?.score? true : false },
      splashScreen: { score: audits['splash-screen']?.score? true : false },
      themedOmnibox: { score: audits['themed-omnibox']?.score? true : false },
      viewport: { score: audits['viewport']?.score? true : false }
    },
    artifacts: {
      webAppManifest: artifacts?.WebAppManifest,
      serviceWorker: {...artifacts?.ServiceWorker, raw: (swFeatures as { raw: string})?.raw || undefined },
      url: artifacts?.URL,
      linkElements: artifacts?.LinkElements?.map(element => { delete element?.node; return element }),
      metaElements: artifacts?.MetaElements?.map(element => { delete element?.node; return element })
    }
  }

  return report;
};

export default httpTrigger;
