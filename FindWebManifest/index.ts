import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { checkParams } from '../utils/checkParams.js';
import puppeteer from 'puppeteer';

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {

  const checkResult = checkParams(req, ['site']);
  if (checkResult.status !== 200){
    context.res = checkResult;
    context.log.error(`FindWebManifest: ${checkResult.body?.error.message}`);
    return;
  }

  const site = req?.query?.site;

  context.log(
    `FindWebManifest: function is processing a request for site: ${site}`
  );

  try {

    const response = await fetch(site);
    const html = await response.text();
    
    const match = html.match(/<link\s+rel=\\*"manifest\\*"\s+.*?href=\\*"(.*?)\\*"/);
    let link = match? match[1] : null;

    let json: unknown | null = null;
    let raw: string | null = null;

    if (link) {
      var base = site.endsWith('/') ? site.slice(0, -1) : site;
      if (link.startsWith('/')) {
        link = base + link;
      }
      else if (!link.startsWith('http')) {
        link = base + '/' + link;
      }

      if (/\.(json|webmanifest)/.test(link)){
        try {
          const response = await fetch(link);
          json = await response.json();
          raw = JSON.stringify(json);
        } catch (error) {
          context.log.error(error)
        }
      }
      else {
        try {
          const browser = await puppeteer.launch({headless: true});
          const page = await browser.newPage();
          await page.goto(link, {timeout: 5000, waitUntil: 'networkidle2'});

          raw = await page.evaluate(() =>  {
              return document.querySelector('body')?.innerText; 
          }) || await page.content();

          try {
            json = JSON.parse(raw);
          } catch (error) {
            throw error;
          }
          
          browser.close();
        }
        catch (error) {
          context.log.error(`FindWebManifest: ${error}`)
        }
      }
    }

    if (json || link || raw) {
      context.res = {
        status: 200,
        body: {
          content: {
            json,
            raw,
            url: link,
          },
        },
      };

      context.log.info(
        `FindWebManifest: function is DONE processing for site: ${site}`
      );
    }
    else {
      context.res = {
        status: 400,
        body: {
          error: { message: "No manifest found" },
        },
      };

      context.log.warn(
        `FindWebManifest: function has ERRORED while processing for site: ${site} with this error: No manifest found`
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
      `FindWebManifest: function has ERRORED while processing for site: ${site} with this error: ${err.message}`
    );
  }
};

export default httpTrigger;

/**
 * @openapi
 *  /FindWebManifest:
 *    get:
 *      summary: Fast web manifest detection
 *      description: Try to detect web manifest and return it url, raw and json content
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
 *                             json:
 *                               $ref: ?file=components.yaml#/schemas/manifest
 */
