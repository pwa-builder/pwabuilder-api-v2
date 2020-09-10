import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import * as puppeteer from 'puppeteer';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  const url = req.query.site;

  const timeout = 120000;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  await page.setDefaultNavigationTimeout(timeout);

  // empty object that we fill with data below
  let swInfo: any = {};

  await page.goto(url, { waitUntil: ['domcontentloaded'] });

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
  } finally {
    if (page) {
      await page.close();
    }
    if (browser) {
      await browser.close();
    }
  }
};

export default httpTrigger;
