import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import loadPage from "../utils/loadPage";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  const url = req.query.site;

  const timeout = 120000;

  const pageData = await loadPage(url);

  const page = pageData.sitePage;

  page.setRequestInterception(true);

  let whiteList = ['document', 'plain', 'script', 'javascript'];
  page.on('request', (req) => {
    const type = req.resourceType();
    if (whiteList.some((el) => type.indexOf(el) >= 0)) {
      req.continue();
    } else {
      req.abort();
    }
  });

  // empty object that we fill with data below
  let swInfo: any = {};

  try {
    // Check to see if there is a service worker
    let serviceWorkerHandle = await page.waitForFunction(
      () => {
        return navigator.serviceWorker.ready.then(
          (res) => res.active.scriptURL
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
          .then((res) => res.scope);
      },
      { timeout }
    );

    swInfo['scope'] = serviceWorkerScope;

    // checking push reg
    let pushReg: boolean | PushSubscription = await page.evaluate(
      () => {
        return navigator.serviceWorker.getRegistration().then((reg) => {
          return reg.pushManager.getSubscription().then((sub) => sub);
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
  } catch (error) {
    if (error.name && error.name.indexOf('TimeoutError') > -1) {

      context.res = {
        status: 500,
        body: {
          error: error
        }
      }
    }
  }
};

export default httpTrigger;
