import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { Browser } from 'puppeteer';
import lighthouse from 'lighthouse';

import { closeBrowser, getBrowser } from '../utils/loadPage';
import { checkParams } from '../utils/checkParams';

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

  const currentBrowser = await getBrowser(context);

  try {
    // run lighthouse audit

    if (currentBrowser) {
      const swInfo = await audit(currentBrowser, url);

      await closeBrowser(context, currentBrowser);

      context.res = {
        status: 200,
        body: {
          data: swInfo,
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

const audit = async (browser: Browser, url: string) => {
  // empty object that we fill with data below
  const swInfo: { hasSW? : boolean, scope?: boolean, offline? : boolean } = {};

  // Default options to use when using
  // Puppeteer with Lighthouse
  const config = {
    port: new URL(browser.wsEndpoint()).port,
    logLevel: 'info',  // 'silent'|'error'|'info'|'verbose'
    output: 'json', // 'json' | 'html' | 'csv'
    locale: 'en-US',
    // /** The maximum amount of time to wait for a page content render, in ms. If no content is rendered within this limit, the run is aborted with an error. */
    maxWaitForFcp: 15 * 1000,
    // /** The maximum amount of time to wait for a page to load, in ms. */
    maxWaitForLoad: 30 * 1000,

    /** Disable clearing the browser cache and other storage APIs before a run */
    disableStorageReset: true,
    skipAboutBlank: true,
    /** How Lighthouse should interpret this run in regards to scoring performance metrics and skipping mobile-only tests in desktop. Must be set even if throttling/emulation is being applied outside of Lighthouse. */
    formFactor: 'desktop', // 'mobile'|'desktop';
    /** Screen emulation properties (width, height, dpr, mobile viewport) to apply or an object of `{disabled: true}` if Lighthouse should avoid applying screen emulation. If either emulation is applied outside of Lighthouse, or it's being run on a mobile device, it typically should be set to disabled. For desktop, we recommend applying consistent desktop screen emulation. */
    screenEmulation: {disabled: true},  
    throttlingMethod: 'provided', // 'devtools'|'simulate'|'provided';
    throttling: false,
    // /** If present, the run should only conduct this list of audits. */
    onlyAudits: ['service-worker', 'installable-manifest', 'is-on-https', 'maskable-icon', 'apple-touch-icon', 'splash-screen', 'themed-omnibox', 'viewport'],
    // onlyCategories: ['pwa'] ,
    // skipAudits: ['pwa-cross-browser', 'pwa-each-page-has-url', 'pwa-page-transitions', 'full-page-screenshot', 'network-requests', 'errors-in-console', 'diagnostics'],
  }
  
  

  // const options = {
  //   output: 'json',
  //   throttling: false,
  //   preset: 'desktop',
  //   logLevel: 'info',
  //   disableDeviceEmulation: true,
  //   chromeFlags: ['--disable-mobile-emulation', '--disable-storage-reset'],
  //   onlyCategories: ['pwa'],
  //   port: new URL(browser.wsEndpoint()).port,
  // };

  const runnerResult = await lighthouse(url, config);

  // clean useless
  if(runnerResult?.lhr) {
    delete runnerResult.lhr.categoryGroups;
    delete runnerResult.lhr.categories;
    delete runnerResult.lhr.timing;
  }
  if(runnerResult?.artifacts) {
    delete runnerResult.artifacts.devtoolsLogs;
    delete runnerResult.artifacts.Timing;
    delete runnerResult.artifacts.Stacks;
  }

  const audits = runnerResult?.lhr?.audits;

  return runnerResult;

  if (audits) {
    swInfo.hasSW = audits['service-worker'].score >= 1 ? true : false;
    swInfo.scope = audits['service-worker'].details
      ? audits['service-worker'].details.scopeUrl
      : null;
    swInfo.offline = audits['works-offline'].score >= 1 ? true : false;

    return swInfo;
  } else {
    return null;
  }
};

export default httpTrigger;
