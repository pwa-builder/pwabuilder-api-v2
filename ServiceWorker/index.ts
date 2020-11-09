import { AzureFunction, Context, HttpRequest } from "@azure/functions";
const lighthouse = require('lighthouse');

import { PageData } from "../utils/interfaces";
import loadPage from "../utils/loadPage";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  context.log(`Service Worker function is processing a request for site: ${req.query.site}`);

  const url = req.query.site;

  let pageData: PageData | null = null;

  try {
    pageData = await loadPage(url);

    const page = pageData?.sitePage;

    page.setRequestInterception(true);

    let allowList = ['javascript'];
    page.on('request', (req) => {
      const type = req.resourceType();
      if (allowList.some((el) => type.indexOf(el) >= 0)) {
        req.continue();
      } else {
        req.abort();
      }
    });

    // run lighthouse audit
    const swInfo = await audit(pageData, url);

    context.res = {
      status: 200,
      body: {
        "data": swInfo
      }
    }

    context.log(`Service Worker function is DONE processing a request for site: ${req.query.site}`);
  } catch (error) {
    context.res = {
      status: 500,
      body: {
        error: error
      }
    };

    if (error.name && error.name.indexOf('TimeoutError') > -1) {
      context.log(`Service Worker function TIMED OUT processing a request for site: ${url}`);
    } else {
      context.log(`Service Worker function failed for ${url} with the following error: ${error}`)
    }
  } finally {
    await pageData?.sitePage?.close();
    await pageData?.browser?.close();
  }
};

const audit = async (pageData: PageData, url: string) => {
  // empty object that we fill with data below
  let swInfo: any = {};

  const options = {
    output: 'json',
    logLevel: 'info',
    disableDeviceEmulation: true,
    chromeFlags: ['--disable-mobile-emulation', '--disable-storage-reset'],
    onlyCategories: ['pwa'],
    port: (new URL(pageData.browser.wsEndpoint())).port
  };
  const runnerResult = await lighthouse(url, options);
  const audits = runnerResult?.lhr?.audits;

  if (audits) {
    swInfo['hasSW'] = audits['service-worker'].score >= 1 ? true : false;
    swInfo['scope'] = audits['service-worker'].details ? audits['service-worker'].details.scopeUrl : null;
    swInfo['offline'] = audits['works-offline'].score >= 1 ? true : false;

    return swInfo;
  }
  else {
    return null;
  }

}

export default httpTrigger;
