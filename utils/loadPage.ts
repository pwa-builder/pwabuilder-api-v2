import { Context } from '@azure/functions';
import { Page, HTTPResponse, Browser, launch } from 'puppeteer';
import { LogMessages } from './logMessages.js';

export interface LoadedPage {
  sitePage: Page;
  pageResponse: HTTPResponse;
  browser: Browser;
}

export default async function loadPage(
  site: string,
  context: Context
): Promise<LoadedPage | undefined | Error> {
  let sitePage: Page;
  let pageResponse: HTTPResponse | null;

  const timeout = 120000;

  try {
    const start = new Date().getTime();
    const browser = await getBrowser(context);
    const elapsed = new Date().getTime() - start;
    context.log('TIME ELAPSED', elapsed);
    sitePage = await browser.newPage();

    await sitePage.setDefaultNavigationTimeout(timeout);

    pageResponse = await sitePage.goto(site, {
      waitUntil: ['domcontentloaded'],
    });

    if (pageResponse) {
      return {
        sitePage: sitePage,
        pageResponse: pageResponse,
        browser: browser,
      };
    } else {
      throw new Error('Could not get a page response');
    }
  } catch (err) {
    return err as Error;
  }
}

export async function getBrowser(context: Context): Promise<Browser> {
  context.log.info(LogMessages.OPENING_BROWSER);

  const browser = await launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  return browser;
}

export async function closeBrowser(
  context: Context,
  browser: Browser
): Promise<void> {
  if (browser) {
    context.log.info(LogMessages.CLOSING_BROWSER);

    try {
      await browser.close();
    } catch (err) {
      console.warn('Error closing browser', err);
    }
  }
}