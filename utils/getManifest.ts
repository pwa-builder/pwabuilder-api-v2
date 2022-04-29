import { Context } from '@azure/functions';
import fetch from 'node-fetch';
import ExceptionOf, { ExceptionType as Type } from './Exception';
import { Manifest } from './interfaces';
import loadPage, { closeBrowser } from './loadPage';

export interface ManifestInformation {
  json: Manifest;
  url: string;
}

export default async function getManifest(
  site: string,
  context: Context
): Promise<ManifestInformation | undefined> {
  try {
    context.log.info('getManifest');
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

    return undefined;
  } catch (e) {
    throw ExceptionOf(Type.MANIFEST_NOT_FOUND, e);
  }
}
