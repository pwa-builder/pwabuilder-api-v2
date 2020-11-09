import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { Page, Response, Browser } from "puppeteer";
import loadPage from "../utils/loadPage";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  context.log(`Service Worker function is processing a request for site: ${req.query.site}`);

  const url = req.query.site;

  const timeout = 120000;

  let pageData: { sitePage: Page, pageResponse: Response, browser: Browser } | null = null;
  try {
    pageData = await loadPage(url);

    const page = pageData.sitePage;

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

    // empty object that we fill with data below
    let swInfo: any = {};

    // Check to see if there is a service worker installing
    let swInstalling = await checkRegistration(page);
    if (!swInstalling) {
      context.res = {
        status: 200,
        body: {
          error: {
            message: "service worker not registered."
          }
        }
      }
      return;
    }
    
    // Wait until the service worker is ready
    let serviceWorkerHandle = await page.waitForFunction(
      () => {
        return navigator.serviceWorker.ready.then(
          (res) => res.active?.scriptURL
        );
      },
      { timeout }
    );

    swInfo['hasSW'] =
      serviceWorkerHandle && (await serviceWorkerHandle.jsonValue());

    // try to grab service worker scope
    const serviceWorkerScope = await page.evaluate(
      () => {
        return navigator.serviceWorker
          .getRegistration()
          .then((res) => res?.scope);
      },
      { timeout }
    );

    swInfo['scope'] = serviceWorkerScope;

    // checking push reg
    let pushReg: boolean | PushSubscription | undefined | null = await page.evaluate(
      () => {
        return navigator.serviceWorker.getRegistration().then((reg) => {
          return reg?.pushManager.getSubscription().then((sub) => sub);
        });
      },
      { timeout }
    );

    swInfo['pushReg'] = pushReg;

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

async function checkRegistration(page: Page) {
  return await Promise.race([
      page.waitForFunction(() => {
        return new Promise((resolve, reject) => {
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            resolve(navigator.serviceWorker.controller)
          });

          setTimeout(() => {
            reject(false);
          }, 30000);
        });
      }, {timeout: 30000 }),
      page.waitForFunction(() => {
        return navigator.serviceWorker.getRegistration().then(reg => (reg?.active || reg?.installing || reg?.waiting) ? true : false);
      }, {
        polling: 1000,
        timeout: 30000,
      })
  ])
  .then((res) => res.jsonValue())
  .catch(() => false);
}

export default httpTrigger;
