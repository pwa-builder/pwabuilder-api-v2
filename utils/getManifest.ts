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
