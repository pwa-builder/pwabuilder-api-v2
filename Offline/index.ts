import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { Browser } from 'puppeteer';
import { OfflineTestData } from "../utils/interfaces.js";
import lighthouse from 'lighthouse';
import { closeBrowser, getBrowser } from "../utils/loadPage.js";
import { logOfflineResult } from "../utils/urlLogger.js";
import { checkParams } from '../utils/checkParams.js';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {

  const checkResult = checkParams(req, ['site']);
  if (checkResult.status !== 200){
    context.res = checkResult;
    context.log.error(`Offline: ${checkResult.body?.error.message}`);
    return;
  }

  context.log.info(`Offline function is processing a request for site: ${req.query.site}`);

  const url = req?.query?.site as string;

  const currentBrowser = await getBrowser(context);

  try {
    // run lighthouse audit

    if (currentBrowser) {
      const swInfo = await audit(currentBrowser, url);
      context.res = {
        status: 200,
        body: {
          "data": swInfo
        }
      }

      logOfflineResult(url, swInfo?.worksOffline === true);
      context.log.info(`Offline function is DONE processing a request for site: ${req.query.site}`);
    }

  } catch (error) {
    context.res = {
      status: 500,
      body: {
        error: error
      }
    };

    const typedError = error as Error;
    if (typedError.name && typedError.name.indexOf('TimeoutError') > -1) {
      context
      context.log.error(`Offline function TIMED OUT processing a request for site: ${url}`);
    } else {
      context.log.error(`Offline function failed for ${url} with the following error: ${error}`)
    }
    logOfflineResult(url, false);
  } finally {
    await closeBrowser(context, currentBrowser);
  }
};

const audit = async (browser: Browser, url: string): Promise<OfflineTestData | null> => {
  // empty object that we fill with data below
  let swInfo: any = {};

  const options = {
    logLevel: 'info',
    disableDeviceEmulation: true,
    chromeFlags: ['--disable-mobile-emulation', '--disable-storage-reset'],
    onlyAudits: ['installable-manifest'],
    output: 'json',
    port: Number((new URL(browser.wsEndpoint())).port)
  };
  // @ts-ignore
  const runnerResult = await lighthouse(url, options);
  const audits = runnerResult?.lhr?.audits;

  if (audits) {
    // @ts-ignore
    swInfo.offline = audits['installable-manifest']?.score >= 1 ? true : false;

    return swInfo;
  }
  else {
    return null;
  }

}

export default httpTrigger;

/**
 * @openapi
 *  /Offline:
 *    get:
 *      deprecated: true
 *      summary: Check offline
 *      description: Validate webapp for offline support
 *      tags:
 *        - Validate
 *      parameters:
 *        - $ref: ?file=components.yaml#/parameters/site
 *      responses:
 *        '200':
 *          description: 'OK'
 *          content: 
 *            application/json:
 *              schema: 
 *                type: object
 *                properties: 
 *                  data:
 *                    type: object
 *                    properties:
 *                      offline:
 *                        type: string
 */​
