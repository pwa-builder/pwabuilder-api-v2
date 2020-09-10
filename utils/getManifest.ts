import { Browser } from "puppeteer";
import fetch from "node-fetch";
import ExceptionOf, { ExceptionType } from "./ExceptionType";

export type Manifest = any;
export interface ManifestInformation {
  json: Manifest;
  url: string;
}

export default async function getManifest(
  browser: Browser,
  site: string
): Promise<ManifestInformation> {
  try {
    const sitePage = await browser.newPage();

    await sitePage.goto(site);

    const manifestUrl = await sitePage.$eval(
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
