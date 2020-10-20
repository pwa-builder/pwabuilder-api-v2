import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import loadPage from "../utils/loadPage";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  context.log(`Offline function is processing a request for site: ${req.query.site}`);

  const url = req.query.site;

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

  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
    });

    await page.setOfflineMode(true);
    const targets = await pageData.browser.targets();

    const serviceWorker = targets.find((t) => t.type() === 'service_worker');
    const serviceWorkerConnection = await serviceWorker?.createCDPSession();
    await serviceWorkerConnection?.send('Network.enable');
    await serviceWorkerConnection?.send('Network.emulateNetworkConditions', {
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

      await page.reload({ waitUntil: 'domcontentloaded' });

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
      context.res = {
        status: 400,
        body: {
          "error": "site does not load offline"
        }
      }

      context.log(`Offline function determined ${req.query.site} does not load offline`);
    }
  }
  catch (err) {
    context.res = {
      status: 500,
      body: {
        "error": err || err.message
      }
    }

    context.log(`Offline function ERRORED loading a request for site: ${req.query.site} with error: ${err.message}`);
  }
};

export default httpTrigger;