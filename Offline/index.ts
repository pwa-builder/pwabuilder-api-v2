import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import * as puppeteer from 'puppeteer';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {

  const url = req.query.site;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

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

  try {
    page.goto(url, {
      waitUntil: 'networkidle0',
    });

    await page.waitForFunction(
      () => {
        return navigator.serviceWorker.ready.then(
          (res) => res.active.scriptURL
        );
      },
      { timeout: 6500 }
    );

    await page.setOfflineMode(true);
    const targets = await browser.targets();

    const serviceWorker = targets.find((t) => t.type() === 'service_worker');
    const serviceWorkerConnection = await serviceWorker.createCDPSession();
    await serviceWorkerConnection.send('Network.enable');
    await serviceWorkerConnection.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    })
      .catch(() => {
        // needed for a chromium bug https://github.com/puppeteer/puppeteer/issues/2469
      });

    try {
      const bodySelector = await page.waitForSelector('body', {
        visible: true,
      });

      await page.reload({ waitUntil: 'networkidle0' });

      if (bodySelector) {
        context.res = {
          status: 200,
          body: {
            "data": 'loaded'
          }
        }
      }
    }
    catch (err) {
      console.error(err);

      context.res = {
        status: 500,
        body: {
          "error": "site does not load offline"
        }
      }
    }
  }
  catch (err) {
    context.log('error', err);

    context.res = {
      status: 500,
      body: {
        "error": err || err.message
      }
    }
  }

  await browser.close()

};

export default httpTrigger;