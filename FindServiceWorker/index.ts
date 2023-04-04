import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import fetch from 'node-fetch';
import { checkParams } from '../utils/checkParams.js';



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

  context.log(
    `FindServiceWorker: function is processing a request for site: ${site}`
  );

  try {
    const response = await fetch(site);
    const html = await response.text();

    const match = html.match(/navigator\s*\.\s*serviceWorker\s*\.\s*register\(\s*['"](.*?)['"]/) || html.match(/new Workbox\s*\(\s*['"](.*)['"]/);
    let link = match? match[1] : null;
    let serviceWorker: unknown | null;
    
    if (link) {
      if (!link.startsWith('http') && !link.startsWith('data:')) {
        site = response.url;
        link = new URL(link, site).href;
      }
    }

    if (link) {
      try {
        const response = await fetch(link);
        if (response.ok) {
          serviceWorker = await response.text();
        }
      } catch (error) {
        
      }
    }

    if (link) {
      context.res = {
        status: 200,
        body: {
          content: {
            raw: serviceWorker,
            url: link,
          },
        },
      };

      context.log.info(
        `FindServiceWorker: function is DONE processing for site: ${site}`
      );
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
