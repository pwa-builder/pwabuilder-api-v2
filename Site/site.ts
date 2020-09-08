import { Browser } from "puppeteer";
import fetch from "node-fetch";

export type Manifest = any;
export enum Error {
  NotFound = "notfound"
}

export async function getManifest(
  browser: Browser,
  site: string
): Promise<Manifest> {

  const sitePage = await browser.newPage();

  await sitePage.goto(site);

  const manifestUrl = await sitePage.$eval(
    "link[rel=manifest]",
    (el: HTMLAnchorElement) => el.href
  );

  if (manifestUrl) {
    const response = await fetch(manifestUrl);
    return await response.json();
  }

  return null;
}
