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
import { isLoopback } from '../utils/url-util.js';

implementation.prototype._updateAStyleBlock = () => {};

const MANIFEST_QUERY = "link[rel*=manifest]";
const USER_AGENT = `${userAgents.desktop} PWABuilderHttpAgent`;
const SKIP_RESOURCES = [ 'stylesheet', 'font', 'image', 'imageset', 'media', 'ping']

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

  context.log(
    `FindWebManifest: function is processing a request for site: ${site}`
  );

  try {
    let links: string[] = [];
    let link: string | null = null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(site, { signal: controller.signal, redirect: 'follow', follow: 3, headers: { 'User-Agent': USER_AGENT, /*'Accept': 'text/html'*/ } });
      clearTimeout(timeoutId);

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const rawHTML = await response.text();
      const html = rawHTML.replace(/\r|\n/g, '').replace(/\s{2,}/g, '');

      const headRegexp = /<(head|html)\s*(lang=".*")?>(.*?|[\r\n\s\S]*?)(<\/head>|<body\s*>)/i;
		  const headerHTML = headRegexp.test(html)? (html.match(headRegexp) as string[])[0] : null;
      const dom = new JSDOM(headerHTML || html, {url: response.url, storageQuota: 0});
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
      context.log.warn(`FindWebManifest: ${error}`);
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
  let href: string | undefined;
  let json: any | undefined;

  try {
    context?.log.warn(`FindWebManifest: trying slow mode`);

    const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox']});
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.setRequestInterception(true);

    let links: string[] = [];

    try {
      // speed up loading
      page.on('request', (req) => {
          // commented because it doesn't work on Azure environment
          // if(SKIP_RESOURCES.some((type) => req.resourceType() == type)){
          //     req.abort();
          // }
          // else {
              req.continue();
          // }
      });

      // waiting for manifest request or until full page loads
      page.on('response', async (res) => {
        if (res.request().resourceType() == 'manifest'){
          href = res.url();
          try {
            json = await res.json();
            // await page.close();
          } catch (err) {}
        }
      });

      try {
        await page.goto(site, {timeout: 15000, waitUntil: 'load'});
        await page.waitForNetworkIdle({ timeout: 3000, idleTime: 1000});
      } catch(err) { /* context?.log.warn(err); */ }

      // trying to find manifest in html if request was unsuccessful 
      if (!page.isClosed() && !json) {
        try {
          // const html = await page.evaluate(() =>  document.head.innerHTML);
          links = await page.evaluate(() => { 
            let hrefs: string[] = [];
            let links = document.head.querySelectorAll('link[rel*=manifest]') as NodeListOf<HTMLLinkElement>;
            links.forEach((link) => {
              if (link.rel.trim() == 'manifest'){
                hrefs.push(link.href);
              }
            });
            return hrefs;
          });
          // context?.log.warn('mani', manifestHandles.length, manifestHandles[0]);
          // let manifests = await manifestHandles.getProperties();
          // let manifests_arr = Array.from(manifests.values());

          // const manifestHandles = await page.$$(MANIFEST_QUERY);
          // if (manifestHandles.length > 0) {
            
          //   await manifestHandles.forEach(async (link) => {
          //     if ((link as HTMLLinkElement).rel.trim() == 'manifest')
          //       links.push((link as HTMLLinkElement).href);
          //     // let href = await page.evaluate(link => { if (link?.rel.trim() == 'manifest') return link?.href } , handle);
          //     // href && links.push(href);
          //     // await link?.dispose();
          //   });
          // }
        } catch (err) { context?.log.warn(err); }
        
      }
    } catch (error) {
      throw error;
    } finally {
      await browser.close();
    }
    
    if (href && json){
      return {
        link: href,
        json,
        raw: JSON.stringify(json)
      }
    }
    else {
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
