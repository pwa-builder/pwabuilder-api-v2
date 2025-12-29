import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import fetch from 'node-fetch';
import { checkParams } from '../utils/checkParams.js';
import { userAgents } from 'lighthouse/core/config/constants.js';
import puppeteer from 'puppeteer';
import { isLoopback } from '../utils/url-util.js';

const USER_AGENT = `${userAgents.desktop} PWABuilderHttpAgent`;
const SKIP_RESOURCES = [ 'stylesheet', 'font', 'image', 'imageset', 'media', 'ping', 'manifest']

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {

  const checkResult = checkParams(req, ['site']);
  if (checkResult.status !== 200){
    context.res = checkResult;
    context.log.error(`FindServiceWorker: ${checkResult.body?.error.message}`);
    return;
  }

  let site = req?.query?.site;
  if (isLoopback(site)) {
      context.res = {
        status: 400,
        body: {
          error: { message: 'Localhost and loopback addresses are not allowed' }
        }
      };
      context.log.error(`FetchWebManifest: Rejected localhost/loopback URL: ${site}`);
      return;
  }

  context.log(`FindServiceWorker: function is processing a request for site: ${site}`);

  try {
    let link: string | null | undefined = null;
    try{
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(site, { signal: controller.signal, redirect: 'manual', headers: { 'User-Agent': USER_AGENT } });
      clearTimeout(timeoutId);

      const html = await response.text();

      const match = html.match(/navigator\s*\.\s*serviceWorker\s*\.\s*register\(\s*['"](.*?)['"]/) || html.match(/new Workbox\s*\(\s*['"](.*)['"]/);
      link = match? match[1] : null;
      
      if (link) {
        if (!link.startsWith('http') && !link.startsWith('data:')) {
          site = response.url;
          link = new URL(link, site).href;
        }
      }
    } catch (error) {
      context.log.warn(`FindServiceWorker: ${error}`);
    }

    if (link) {
      context.res = await returnWorkerContent(link, site, context);
    }
    else {
      context?.log.warn(`FindServiceWorker: trying slow mode`);

      const browser = await puppeteer.launch({headless: true , args: ['--no-sandbox', '--disable-setuid-sandbox']});
      const page = await browser.newPage();
      await page.setUserAgent(USER_AGENT);
      await page.setRequestInterception(true);

      try {
        page.on('request', (req) => {
            // commented because it doesn't work on Azure environment
            // if(SKIP_RESOURCES.some((type) => req.resourceType() == type)){
            //     req.abort();
            // }
            // else {
                req.continue();
            // }
        });

        try {
          await page.goto(site, {timeout: 15000, waitUntil: 'load'});
          await page.waitForNetworkIdle({ timeout: 3000, idleTime: 1000});
        } catch(err) {}

        // trying to find manifest in html if request was unsuccessful 
        if (!page.isClosed()) {
          try {
            link = await page.evaluate(() => {
              if ('serviceWorker' in navigator) {
                return navigator.serviceWorker.getRegistration()
                  .then(registration => {
                    if (registration) {
                      return registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL
                    }
                  })
                  .catch(error => null);
              } else {
                return null;
              }
            });
          } catch (err) {}
        }
      } catch (error) {
        throw error;
      } finally {
        await browser.close();
      }

      if (link) {
        context.res = await returnWorkerContent(link, site, context);
      }
      else {
        context.res = {
          status: 400,
          body: {
            error: { message: "No service worker found" },
          },
        };
  
        context.log.warn(
          `FindServiceWorker: function has ERRORED while processing for site: ${site} with this error: No service worker found`
        );
      }
    }
  } catch (err: any) {
    context.res = {
      status: 400,
      body: {
        error: { error: err, message: err.message },
      },
    };

    context.log.error(
      `FindServiceWorker: function has ERRORED while processing for site: ${site} with this error: ${err.message}`
    );
  }
};

async function returnWorkerContent(url: string, site: string, context: Context) {
  let content: null | string = null;

  try {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT }});
    if (response.ok) {
      content = await response.text();
    }
  } catch (error) {}



  context.log.info(
    `FindServiceWorker: function is DONE processing for site: ${site}`
  );

  return {
    status: 200,
    body: {
      content: {
        raw: content,
        url: url,
      },
    },
  };
}

export default httpTrigger;

/**
 * @openapi
 *  /FindServiceWorker:
 *    get:
 *      summary: Fast service worker detection
 *      description: Try to detect service worker and return it url and raw content
 *      tags:
 *        - Generate
 *      parameters:
 *        - $ref: ?file=components.yaml#/parameters/site
 *      responses:
 *        '200':
 *          description: OK
 *          content: 
 *             application/json:
 *               schema: 
 *                 type: object
 *                 properties:
 *                       content:
 *                           type: object
 *                           properties:
 *                             url:
 *                               type: string
 *                             raw:
 *                               type: string
 */
