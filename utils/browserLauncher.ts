import { Context } from '@azure/functions';
import { LogMessages } from './logMessages.js';

import { launch, LaunchedChrome } from 'chrome-launcher';

// TODO: try to replace this with https://github.com/cezaraugusto/chromium-edge-launcher

export async function getBrowser(context: Context): Promise<LaunchedChrome> {
  context.log.info(LogMessages.OPENING_BROWSER);

  return await launch({chromeFlags: [
    '--headless',
   	'--no-sandbox',
	 	'--enable-automation',
    '--disable-background-networking',
    '--enable-features=NetworkServiceInProcess2',
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
    '--disable-features=Translate,BackForwardCache,AcceptCHFrame,AvoidUnnecessaryBeforeUnloadCheckSync',
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
    '--password-store=basic',
    '--use-mock-keychain',
    '--enable-blink-features=IdleDetection',
    '--export-tagged-pdf',
    '--disabe-gpu',
  ]})
}

export async function closeBrowser(
  context: Context,
  browser?: LaunchedChrome
): Promise<void> {
  if (browser) {
    context.log.info(LogMessages.CLOSING_BROWSER);

		try {
    	await browser.kill();
		} catch (err) {
			context.log.error('Error closing browser', err);
		}

    return;
  }
}