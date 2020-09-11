import fetch from "node-fetch";
import ExceptionOf, { ExceptionType } from "./Exception";
import loadPage from "./loadPage";

export type Manifest = any;
export interface ManifestInformation {
  json: Manifest;
  url: string;
}

export default async function getManifest(
  site: string
): Promise<ManifestInformation> {
  try {
    const siteData = await loadPage(site);

    siteData.sitePage.setRequestInterception(true);

    let whiteList = ['document', 'plain', 'script', 'javascript'];
    siteData.sitePage.on('request', (req) => {
      const type = req.resourceType();
      if (whiteList.some((el) => type.indexOf(el) >= 0)) {
        req.continue();
      } else {
        req.abort();
      }
    });

    const manifestUrl = await siteData.sitePage.$eval(
      "link[rel=manifest]",
      (el: HTMLAnchorElement) => el.href
    );

    if (manifestUrl) {
      const response = await fetch(manifestUrl);
      return {
        json: await response.json(),
        url: manifestUrl,
      };
    }

    return null;
  } catch (e) {
    throw ExceptionOf(ExceptionType.MANIFEST_NOT_FOUND, e);
  }
}
