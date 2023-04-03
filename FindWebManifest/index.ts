import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { checkParams } from '../utils/checkParams.js';
import puppeteer from 'puppeteer';
import { JSDOM } from 'jsdom';
import { getManifestByLink } from '../utils/getManifestByLink.js';

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

  let site = req?.query?.site;

  context.log(
    `FindWebManifest: function is processing a request for site: ${site}`
  );

  try {

    const response = await fetch(site);
    const rawHTML = await response.text();
    const html = rawHTML.replace(/\r|\n/g, '').replace(/\s{2,}/g, '');
    const headRegexp = /<head\s*>(.*?|[\r\n\s\S]*?)<\/head>/;
		const headerHTML = headRegexp.test(html)? (html.match(headRegexp) as string[])[0] : null;
    
    if (!headerHTML) {
      throw new Error('No <head> tag found');
    }

    site = response.url;
    const dom = new JSDOM(headerHTML, {url: site});

    let link = dom.window.document.querySelector('link[rel=manifest]')?.href || null;

    let json: unknown | null = null;
    let raw: string | null = null;

    if (link) {
      const results = await getManifestByLink(link, site);
      if (results && !results.error) {
        link = results.link || link;
        json = results.json || null;
        raw = results.raw || null;
      }
      else{
        context.log.error(`FindWebManifest: ${results?.error}`);
      }
    }
    else {
      try {
        const browser = await puppeteer.launch({headless: 'new'});
        const page = await browser.newPage();
        await page.goto(site, {timeout: 10000, waitUntil: 'load'});

        const manifestHandle = await page.$('link[rel=manifest]');
        const href = await page.evaluate(link => link?.href, manifestHandle);
        await manifestHandle?.dispose();

        // const manifest = await page.evaluate(() =>  {
        //     return document.querySelector('link[rel=manifest]'); 
        // });

        if (href) {
          // link = manifest.getAttribute('href');
          const results = await getManifestByLink(href, site);
          if (results && !results.error) {
            link = results.link || href;
            json = results.json || null;
            raw = results.raw || null;
          }
          else{
            throw results?.error;
          }
        }
        
        browser.close();
      }
      catch (error) {
        context.log.error(`FindWebManifest: ${error}`)
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
