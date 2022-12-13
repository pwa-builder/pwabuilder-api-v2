import { Context } from '@azure/functions';
import { Browser, Page, HTTPResponse, executablePath } from 'puppeteer';
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { LogMessages } from './logMessages';

import { launch } from 'chrome-launcher';

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

export async function getBrowser(context: Context): Promise<any> {
  context.log.info(LogMessages.OPENING_BROWSER);

  return await launch({chromeFlags: ['--headless',
   '--no-sandbox',
    // '--disable-background-networking',
    '--enable-features=NetworkService,NetworkServiceInProcess',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-breakpad',
    '--disable-client-side-phishing-detection',
    '--disable-component-extensions-with-background-pages',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-dev-shm-usage',
    '--disable-domain-reliability',
    '--disable-extensions',
    '--disable-features=Translate,BackForwardCache',
    '--disable-hang-monitor',
    '--disable-ipc-flooding-protection',
    '--disable-popup-blocking',
    '--disable-prompt-on-repost',
    '--disable-renderer-backgrounding',
    '--disable-sync',
    '--force-color-profile=srgb',
    '--metrics-recording-only',
    '--no-first-run',
    '--no-default-browser-check',
    '--mute-audio',
    // '--enable-automation',
    '--password-store=basic',
    '--use-mock-keychain',
    '--enable-blink-features=IdleDetection',
    '--export-tagged-pdf',
    '--disabe-gpu',
  ]})
  

  // return launch({headless: true, args: ['--no-sandbox']})
  // puppeteer
  // .use(StealthPlugin());
  // return puppeteer.launch({ headless: true, executablePath: executablePath() })

  // const browser = await launch({
  //   headless: true,
  //   ignoreDefaultArgs: true,
  //   args: [
  //   '--headless',
  //   // '--disable-default-apps', 
  //   // '--disable-extensions', 
  //   // '--disable-component-extensions-with-background-pages', 
  //   // '--disable-client-side-phishing-detection',
  //   // '--disable-features=Translate,OptimizationHints,MediaRouter',
  //   // '--no-default-browser-check',
  //   // '--disable-component-update',
  //   // '--metrics-recording-only',
  //   // '--no-first-run',
  //   // '--disable-back-forward-cache',
  //   // // '--deny-permission-prompts',
  //   // '--noerrdialogs',
  //   // // '--disable-background-networking',
  //   // '--disable-domain-reliability',
  //   // '--disable-sync',
  //   // '--no-pings',
  //   '--no-sandbox',

  //   // '--disable-background-networking',
  //   '--enable-features=NetworkService,NetworkServiceInProcess',
  //   '--disable-background-timer-throttling',
  //   '--disable-backgrounding-occluded-windows',
  //   '--disable-breakpad',
  //   '--disable-client-side-phishing-detection',
  //   '--disable-component-extensions-with-background-pages',
  //   '--disable-default-apps',
  //   // '--disable-dev-shm-usage',
  //   '--disable-extensions',
  //   '--disable-features=Translate,BackForwardCache',
  //   '--disable-hang-monitor',
  //   '--disable-ipc-flooding-protection',
  //   '--disable-popup-blocking',
  //   '--disable-prompt-on-repost',
  //   '--disable-renderer-backgrounding',
  //   '--disable-sync',
  //   '--force-color-profile=srgb',
  //   '--metrics-recording-only',
  //   '--no-first-run',
  //   '--enable-automation',
  //   '--password-store=basic',
  //   '--use-mock-keychain',
  //   '--enable-blink-features=IdleDetection',
  //   '--export-tagged-pdf',
  //   ],
  // });
  // return browser;
}

export async function closeBrowser(
  context: Context,
  browser: any
): Promise<void> {
  if (browser) {
    context.log.info(LogMessages.CLOSING_BROWSER);

    await browser.kill();
    return;

    try {
      await browser.close? browser.close(): browser.kill();
    } catch (err) {
      console.warn('Error closing browser', err);
    }
  }
}
