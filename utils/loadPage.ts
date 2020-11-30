import { Context } from '@azure/functions';
import * as puppeteer from 'puppeteer';
import ExceptionOf, { ExceptionType as Type } from "./Exception";
import { LogMessages } from './logMessages';

export default async function loadPage(site: string, context: Context): Promise<{ sitePage: puppeteer.Page, pageResponse: puppeteer.Response, browser: puppeteer.Browser }> {
  let sitePage: puppeteer.Page;
  let pageResponse: puppeteer.Response | null;

  const timeout = 120000;

  try {
    const browser = await getBrowser(context);

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
  context.log.info(LogMessages.OPENING_BROWSER);

  const browser = await puppeteer.launch(
    {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
  );
  return browser;
}

export async function closeBrowser(context: Context, browser: puppeteer.Browser): Promise<void> {
  if (browser) {
    context.log.info(LogMessages.CLOSING_BROWSER);

    try {
      await browser.close();
    }
    catch(err) {
      throw ExceptionOf(Type.BROWSER_CLOSE_FAILURE, err);
      return err;
    }
  }
}