import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { Browser } from 'puppeteer';
import lighthouse from 'lighthouse';

import { closeBrowser, getBrowser } from '../../utils/loadPage.js';
import { checkParams } from '../../utils/checkParams';

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {

  const checkResult = checkParams(req, ['site']);
  if (checkResult.status !== 200){
    context.res = checkResult;
    context.log.error(`ServiceWorker: ${checkResult.body?.error.message}`);
    return;
  }
  
  context.log.info(
    `Service Worker function is processing a request for site: ${req.query.site}`
  );

  const url = req?.query?.site as string;

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
        `Service Worker function is DONE processing a request for site: ${req.query.site}`
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
        `Service Worker function TIMED OUT processing a request for site: ${url}`
      );
    } else {
      context.log.error(
        `Service Worker function failed for ${url} with the following error: ${error}`
      );
    }
  }
};

const audit = async (browser: Browser, url: string) => {
  // empty object that we fill with data below
  const swInfo: { hasSW? : boolean, scope?: boolean, offline? : boolean } = {};

  // Default options to use when using
  // Puppeteer with Lighthouse
  const options = {
    output: 'json',
    logLevel: 'info',
    disableDeviceEmulation: true,
    chromeFlags: ['--disable-mobile-emulation', '--disable-storage-reset'],
    onlyCategories: ['pwa'],
    port: new URL(browser.wsEndpoint()).port,
  };

  const runnerResult = await lighthouse(url, options);
  const audits = runnerResult?.lhr?.audits;

  if (audits) {
    swInfo.hasSW = audits['service-worker'].score >= 1 ? true : false;
    swInfo.scope = audits['service-worker'].details
      ? audits['service-worker'].details.scopeUrl
      : null;
    swInfo.offline = audits['installable-manifest'].score >= 1 ? true : false;

    return swInfo;
  } else {
    return null;
  }
};

export default httpTrigger;
