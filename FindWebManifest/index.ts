import { AzureFunction, Context, Exception, HttpRequest } from '@azure/functions';
import fetch, { Response } from 'node-fetch';
import puppeteer from 'puppeteer';
import { JSDOM } from 'jsdom';
import { userAgents } from 'lighthouse/core/config/constants.js';

import { checkParams } from '../utils/checkParams.js';
import { getManifestByLink } from '../utils/getManifestByLink.js';

/**
 * Workaround for https://github.com/jsdom/jsdom/issues/2005
 */
import { implementation } from 'jsdom/lib/jsdom/living/nodes/HTMLStyleElement-impl.js';
implementation.prototype._updateAStyleBlock = () => {};

const MANIFEST_QUERY = "link[rel*=manifest]";
const USER_AGENT = `${userAgents.desktop} PWABuilderHttpAgent`;

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
    let links: string[] = [];
    let link: string | null = null;
    try {
      const response = await fetch(site, { redirect: 'follow', follow: 3, headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html' } });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const rawHTML = await response.text();
      const html = rawHTML.replace(/\r|\n/g, '').replace(/\s{2,}/g, '');

      site = response.url;
      const headRegexp = /<(head|html)\s*(lang=".*")?>(.*?|[\r\n\s\S]*?)(<\/head>|<body\s*>)/;
		  const headerHTML = headRegexp.test(html)? (html.match(headRegexp) as string[])[0] : null;
      const dom = new JSDOM(headerHTML || html, {url: site, storageQuota: 0});
      const manifests: NodeList = dom.window.document.querySelectorAll(MANIFEST_QUERY);
      if (manifests.length > 0) {
        manifests.forEach((manifest: Node) => {
          if (manifest.nodeName == 'LINK' && (manifest as HTMLLinkElement).rel.trim() == 'manifest'){
            let href = (manifest as HTMLLinkElement).href;
            href && links.push(href);
            link = href;
          }
        })
      }
    } catch (error) {
      context.log.error(`FindWebManifest: ${error}`);
    }


    let json: unknown | null = null;
    let raw: string | null = null;

    if (links.length) {

      let extracted = await extractManifest(links, site);

      if (!extracted.error) {
        link = extracted.link || link;
        json = extracted.json || null;
        raw = extracted.raw || null;
      }
      else {
        context.log.warn(`FindWebManifest: can't get manifest by link: ${links.toString()}`);
        // throw extracted.error;
      }
    }
    
    if (!links.length || !json || !raw) {
      let results = await puppeteerAttempt(site, context);
      if (!results.error) {
        link = results.link || null;
        json = results.json || null;
        raw = results.raw || null;
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

async function puppeteerAttempt(site: string, context?: Context): Promise<{error?, link?, json?, raw?}> {
  try {
    context?.log.warn(`FindWebManifest: trying slow mode`);

    const browser = await puppeteer.launch({headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox']});
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.setRequestInterception(true);
    // await page.setViewport({
    //   width: 1024,
    //   height: 768
    // });
    let href: string | undefined;
    let links: string[] = [];

    try {
      page.on('request', (req) => {
          if(req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.resourceType() == 'image'){
              req.abort();
          }
          else {
              req.continue();
          }
      });
      
      await page.goto(site, {timeout: 15000, waitUntil: 'load'});
      await page.waitForNetworkIdle({ timeout: 5000, idleTime: 1000});
      // const html = await page.evaluate(() =>  document.documentElement.outerHTML);

      const manifestHandles = await page.$$(MANIFEST_QUERY);
      if (manifestHandles.length > 0) {
        await manifestHandles.forEach(async (handle) => {
          href = await page.evaluate(link => { if (link?.rel.trim() == 'manifest') return link?.href } , handle);
          href && links.push(href);
          await handle?.dispose();
        });
      }
    } catch (error) {
      throw error;
    } finally {
      await browser.close();
    }
    

    if (links.length) {
      let extracted = await extractManifest(links, site);

      if (!extracted.error) {
        return {
          link: extracted.link || null,
          json: extracted.json || null,
          raw: extracted.raw || null
        }
      }
      else {
        context?.log.warn(`FindWebManifest: can't get manifest by link: ${links.toString()}`);
        throw extracted.error;
      }
    }
    else {
      throw 'No manifest found';
    }
  }
  catch (error) {
    context?.log.error(`FindWebManifest: ${error}`)
    return {
      error
    }
  }
}

async function extractManifest(links: string[], site: string, context?: Context): Promise<{error?, link?, json?, raw?}> {
  let succeded, failed, results: {error?, link?, json?, raw?}[] = [];

  await Promise.all(links.map(async (link) => {
    results.push(await getManifestByLink(link, site));
  }));
  succeded = results.filter((result) => !result.error);
  failed = results.filter((result) => result.error);

  if (succeded.length) {
    return {
      link: succeded[0].link || null,
      json: succeded[0].json || null,
      raw: succeded[0].raw || null
    }
  }
  else {
    context?.log.warn(`FindWebManifest: can't get manifest by link: ${links.toString()}`);
    return {
      error: failed[0].error
    }
  }
}

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
