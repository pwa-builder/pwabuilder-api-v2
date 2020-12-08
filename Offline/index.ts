import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { Browser } from 'puppeteer';
import { OfflineTestData } from "../utils/interfaces";
const lighthouse = require('lighthouse');

import { closeBrowser, getBrowser } from "../utils/loadPage";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  context.log.info(`Service Worker function is processing a request for site: ${req.query.site}`);

  const url = req.query.site;

  const currentBrowser = await getBrowser(context);

  try {
    // run lighthouse audit

    if (currentBrowser) {
      const swInfo = await audit(currentBrowser, url);

      await closeBrowser(context, currentBrowser);

      context.res = {
        status: 200,
        body: {
          "data": swInfo
        }
      }

      context.log.info(`Service Worker function is DONE processing a request for site: ${req.query.site}`);
    }

  } catch (error) {
    await closeBrowser(context, currentBrowser);

    context.res = {
      status: 500,
      body: {
        error: error
      }
    };

    if (error.name && error.name.indexOf('TimeoutError') > -1) {
      context
      context.log.error(`Service Worker function TIMED OUT processing a request for site: ${url}`);
    } else {
      context.log.error(`Service Worker function failed for ${url} with the following error: ${error}`)
    }
  }
};

const audit = async (browser: Browser, url: string): Promise<OfflineTestData | null> => {
  // empty object that we fill with data below
  let swInfo: any = {};

  const options = {
    logLevel: 'info',
    disableDeviceEmulation: true,
    chromeFlags: ['--disable-mobile-emulation', '--disable-storage-reset'],
    onlyAudits: ['works-offline'],
    output: 'json',
    port: (new URL(browser.wsEndpoint())).port
  };

  const runnerResult = await lighthouse(url, options);
  const audits = runnerResult?.lhr?.audits;

  if (audits) {
    swInfo['offline'] = audits['works-offline'].score >= 1 ? true : false;

    return swInfo;
  }
  else {
    return null;
  }

}

export default httpTrigger;