import { Context } from '@azure/functions/Interfaces';
import fetch from 'node-fetch';
import ExceptionOf, { ExceptionType as Type } from './Exception';
import { Manifest } from './interfaces';
import loadPage, { closeBrowser } from './loadPage';

export interface ManifestInformation {
  json: Manifest;
  url: string;
}

export async function getManifest(site: string, context: Context) {
  const siteData = await loadPage(site, context);

  if (siteData instanceof Error || !siteData) {
    context.log.info('did not get manifest');
    return undefined;
  }

  siteData.sitePage.setRequestInterception(true);

  const whiteList = ['document', 'plain', 'script', 'javascript'];
  siteData.sitePage.on('request', req => {
    const type = req.resourceType();
    if (whiteList.some(el => type.indexOf(el) >= 0)) {
      req.continue();
    } else {
      req.abort();
    }
  });

  const manifestUrl = await siteData?.sitePage.$eval(
    'link[rel=manifest]',
    (el: Element) => {
      const anchorEl = el as HTMLAnchorElement;
      return anchorEl.href;
    }
  );

  if (manifestUrl) {
    const response = await fetch(manifestUrl);
    const jsonResponse = JSON.parse((await response.text()).trim());
    await closeBrowser(context, siteData.browser);
    return {
      json: jsonResponse,
      url: manifestUrl,
    };
  }
  await closeBrowser(context, siteData.browser);
  return undefined;
}

export async function getManifestWithHTMLParse(site: string, context: Context) {
  const manifestTestUrl = `https://pwabuilder-manifest-finder.azurewebsites.net/api/findmanifest?url=${encodeURIComponent(
    site
  )}`;

  const response = await fetch(manifestTestUrl);
  if (!response.ok) {
    context.log('Fetching manifest via HTML parsing service failed', response);
    return null;
  }
  const responseData = JSON.parse((await response.text()).trim());
  if (responseData.error || !responseData.manifestContents) {
    return undefined;
  }
  return {
    json: responseData.manifestContents,
    url: responseData.manifestUrl,
  };
}
export async function getManifestTwoWays(
  site: string,
  context: Context
): Promise<ManifestInformation | undefined> {
  try {
    const htmlParse = await getManifestWithHTMLParse(site, context);
    if (htmlParse !== null && htmlParse !== undefined) {
      context.log('HTML PARSE OUTPUT', htmlParse);
      return htmlParse;
    } else {
      const puppeteerResponse = await getManifest(site, context); //This uses puppeteer
      context.log('PUPPETEER OUTPUT', puppeteerResponse);
      if (puppeteerResponse !== null && puppeteerResponse !== undefined) {
        return puppeteerResponse;
      } else
        throw ExceptionOf(
          Type.MANIFEST_NOT_FOUND,
          new Error('Could not find a manifest')
        );
    }
  } catch (e: any) {
    throw ExceptionOf(Type.MANIFEST_NOT_FOUND, e);
  }
}
