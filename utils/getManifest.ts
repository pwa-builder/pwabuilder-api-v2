import { Context } from '@azure/functions';
import fetch from 'node-fetch';
import ExceptionOf, { ExceptionType as Type } from './Exception';
import { Manifest } from './interfaces';
import loadPage, { closeBrowser, LoadedPage } from './loadPage';

export interface ManifestInformation {
  json: Manifest;
  url: string;
}

export default async function getManifest(
  site: string,
  context: Context
): Promise<ManifestInformation | undefined> {
  let siteData: LoadedPage | null = null;
  try {
    context.log.info('getManifest');
    const siteDataOrError = await loadPage(site, context);

    if (siteDataOrError instanceof Error || !siteDataOrError) {
      context.log.info('did not get manifest');
      return undefined;
    }

    siteData = siteDataOrError;
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
      let jsonResult: any;

      // If it's a blob: URL, we need to ask the browser to fetch it for us.
      // Reason is, node-fetch doesn't currently support fetching non HTTP(S) URLs.
      // See https://microsoft.visualstudio.com/OS/_workitems/edit/33479686
      if (manifestUrl.startsWith("blob:")) {
        jsonResult = await siteData.sitePage.evaluate(`fetch(${manifestUrl}).json()`);
      } else {
        // It's a normal URL. Use node-fetch to grab it.
        jsonResult = await (await fetch(manifestUrl)).json();
      }

      return {
        json: jsonResult,
        url: manifestUrl,
      };
    }

    return undefined;
  } catch (e) {
    throw ExceptionOf(Type.MANIFEST_NOT_FOUND, e as Error);
  } finally {
    if (siteData) {
      await closeBrowser(context, siteData.browser);
    }
  }
}
