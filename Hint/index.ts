import { AzureFunction, Context, HttpRequest } from '@azure/functions';

import { Analyzer } from 'hint';
import { UserConfig, AnalyzerResult } from 'hint';

import { checkParams } from '../utils/checkParams';

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {

  const checkResult = checkParams(req, ['site']);
  if (checkResult.status !== 200){
    context.res = checkResult;
    context.log.error(`Hint: ${checkResult.body?.error.message}`);
    return;
  }
  
  context.log.info(
    `Service Worker function is processing a request for site: ${req.query.site}`
  );

  const url = req?.query?.site as string;

  // const currentBrowser = await getBrowser(context);

  try {
    // run hint

    const swInfo = await hint(url);

    // await closeBrowser(context, currentBrowser);

    context.res = {
      status: 200,
      body: {
        data: swInfo,
      },
    };

    context.log.info(
      `Hint function is DONE processing a request for site: ${req.query.site}`
    );

  } catch (error: any) {
    // await closeBrowser(context, currentBrowser);
    console.warn(JSON.stringify(error))
    context.res = {
      status: 500,
      body: {
        error: error?.message || error,
      },
    };

    if (error.name && error.name.indexOf('TimeoutError') > -1) {
      context.log.error(
        `Hint function TIMED OUT processing a request for site: ${url}`
      );
    } else {
      context.log.error(
        `Hint function failed for ${url} with the following error: ${error}`
      );
    }
  }
};

const hint = async (url: string) => {

  const userConfig: UserConfig = {
      // extends: ['progressive-web-apps'],
      hints: {
        // "https-only": "information",
        "manifest-exists": "information",
        "manifest-is-valid": "information",
        "manifest-file-extension": "information",
        // "meta-theme-color": "information",
        "meta-viewport": "information",
        "manifest-app-name": "information",
        "apple-touch-icons": "information"
      },
      connector: {
        name: "puppeteer",
        options: {
            // @ts-ignore
            browser: "Chrome",
            headless: true,
            // ignoreHTTPSErrors: true|false,
            puppeteerOptions: {
              args: ['--no-sandbox', '--disable-setuid-sandbox'],
            },
            // waitUntil: "dom|loaded|networkidle0|networkidle2"
        }
      },
      hintsTimeout: 30 * 1000,
      formatters: [
        'json'
      ]
  };

  const webhint = Analyzer.create(userConfig);
  const results: AnalyzerResult[] = await webhint.analyze(url);

  if (results) {

    return results;
  } else {
    return null;
  }
};

export default httpTrigger;

/**
 * @openapi
 *  /Hint:
 *    get:
 *      summary: Hint report
 *      description: Generate PWA-related Hint report for webapp
 *      tags:
 *        - Report
 *      parameters:
 *        - $ref: components.yaml#/parameters/site
 *      responses:
 *        '200':
 *          description: OK
 */​
