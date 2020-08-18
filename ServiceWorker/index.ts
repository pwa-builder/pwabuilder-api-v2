import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import * as puppeteer from 'puppeteer';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  const url = req.query.site;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  // empty object that we fill with data below
  let swInfo: any = {};

  await page.setRequestInterception(true);

  let whiteList = ['document', 'plain', 'script', 'javascript'];
  page.on('request', (req) => {
    const type = req.resourceType();
    if (whiteList.some((el) => type.indexOf(el) >= 0)) {
      req.continue();
    } else {
      req.abort();
    }
  });

  await page.goto(url, { waitUntil: ['domcontentloaded'] });

  try {
    // Check to see if there is a service worker
    let serviceWorkerHandle = await page.waitForFunction(
      () => {
        return navigator.serviceWorker.ready.then(
          (res) => res.active.scriptURL
        );
      },
      { timeout: 6500 }
    );

    swInfo['hasSW'] =
      serviceWorkerHandle && (await serviceWorkerHandle.jsonValue());

    // try to grab service worker scope
    const serviceWorkerScope = await page.evaluate(
      () => {
        return navigator.serviceWorker
          .getRegistration()
          .then((res) => res.scope);
      },
      { timeout: 6500 }
    );

    swInfo['scope'] = serviceWorkerScope;

    // checking push reg
    let pushReg: boolean | PushSubscription = await page.evaluate(
      () => {
        return navigator.serviceWorker.getRegistration().then((reg) => {
          return reg.pushManager.getSubscription().then((sub) => sub);
        });
      },
      { timeout: 6500 }
    );

    if (!pushReg && swInfo.hasSW) {
      await page.goto(swInfo.hasSW, { waitUntil: ['domcontentloaded'] });
      pushReg = await page.content().then((content) => {
        return (
          content.indexOf('self.addEventListener("push"') >= 0 ||
          content.indexOf("self.addEventListener('push'") >= 0
        );
      });
    }
    swInfo['pushReg'] = pushReg;

    // Checking cache
    // Capture requests during 2nd load.
    const allRequests = new Map();
    page.on('request', (req) => {
      allRequests.set(req.url(), req);
    });

    // Reload page to pick up any runtime caching done by the service worker.
    await page.reload({ waitUntil: ['domcontentloaded'] });

    const swRequests = Array.from(allRequests.values());

    let requestChecks = [];
    swRequests.forEach((req) => {
      const fromSW =
        req.response() != null ? req.response().fromServiceWorker() : null;
      const requestURL = req.response() != null ? req.response().url() : null;

      requestChecks.push({
        fromSW,
        requestURL,
      });
    });

    swInfo['cache'] = requestChecks;
    
    context.res = {
      status: 200,
      body: {
        "data": swInfo
      }
    }
  } catch (error) {
    if (error.name && error.name.indexOf('TimeoutError') > -1) {

      context.res = {
        status: 500,
        body: {
          error: error
        }
      }
    }
  } finally {
    if (page) {
      await page.close();
    }
    if (browser) {
      await browser.close();

  }
};

export default httpTrigger;
