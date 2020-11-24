import { Context } from '@azure/functions';
import * as puppeteer from 'puppeteer';

let browser: puppeteer.Browser;

export default async function loadPage(site: string, context: Context): Promise<{ sitePage: puppeteer.Page, pageResponse: puppeteer.Response, browser: puppeteer.Browser }> {
  let sitePage: puppeteer.Page;
  let pageResponse: puppeteer.Response | null;

  const timeout = 120000;

  try {
    browser = await getBrowser(context);

    sitePage = await browser.newPage();

    await sitePage.setDefaultNavigationTimeout(timeout);

    pageResponse = await sitePage.goto(site, { waitUntil: ['domcontentloaded'] });

    if (pageResponse) {
      return {
        sitePage: sitePage,
        pageResponse: pageResponse,
        browser: browser
      };
    }
    else {
      throw new Error("Could not get a page response")
    }
  }
  catch (err) {
    return err || err.message;
  }
}

export async function getBrowser(context: Context): Promise<puppeteer.Browser> {
  if (browser) {
    context.log.info("Getting an already created browser");
    return browser;
  }
  else {
    context.log.info("Spinning up a new browser");
    browser = await puppeteer.launch(
      {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      }
    );
    return browser;
  }
}