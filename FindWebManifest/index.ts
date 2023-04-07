import { AzureFunction, Context, HttpRequest } from '@azure/functions';
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
    let link: string | null = null;
    try {
      const response = await fetch(site, { redirect: 'follow', follow: 3, headers: { 'User-Agent': userAgents.desktop, 'Accept': 'text/html' } });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const rawHTML = await response.text();
      const html = rawHTML.replace(/\r|\n/g, '').replace(/\s{2,}/g, '');

      site = response.url;
      const dom = new JSDOM(html, {url: site, storageQuota: 0});
      const manifests: NodeList = dom.window.document.querySelectorAll(MANIFEST_QUERY);
      if (manifests.length > 0) {
        manifests.forEach((manifest: Node) => {
          if (manifest.nodeName == 'LINK' && (manifest as HTMLLinkElement).rel.trim() == 'manifest'){
            link = (manifest as HTMLLinkElement).href;
          }
        })
      }
      // link = dom.window.document.querySelectorAll(MANIFEST_QUERY)?.href || null;
    } catch (error) {
      context.log.error(`FindWebManifest: ${error}`);
    }

    // const headRegexp = /<(head|html)\s*(lang=".*")?>(.*?|[\r\n\s\S]*?)(<\/head>|<body\s*>)/;
		// const headerHTML = headRegexp.test(html)? (html.match(headRegexp) as string[])[0] : null;
    
    // if (!html) {
    //   throw new Error('No <head> tag found');
    // }
    
    // const dom = JSDOM.fragment(rawHTML);
    // let link = dom.querySelector('link[rel=manifest]')?.href || null;


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
        const browser = await puppeteer.launch({headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox']});
        const page = await browser.newPage();
        page.setUserAgent(userAgents.desktop);
        let href: string | undefined;

        try {
          await page.goto(site, {timeout: 10000, waitUntil: 'domcontentloaded'});

          const manifestHandles = await page.$$(MANIFEST_QUERY);
          if (manifestHandles.length > 0){
            await manifestHandles.forEach(async (handle) => {
              href = await page.evaluate(link => { if (link?.rel.trim() == 'manifest') return link?.href } , handle) || href;
              await handle?.dispose();
            });
          }
        } catch (error) {
          throw error;
        } finally {
          await browser.close();
        }

        if (href) {
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
