
import puppeteer from 'puppeteer';
import lighthouse, { OutputMode, Flags } from 'lighthouse';
import customConfig from './custom-config.js';
// import ServiceWorker from './service-worker.js';
// import serviceWorkerConfig from './service-worker.config.js';
import { screenEmulationMetrics, /*userAgents */} from 'lighthouse/core/config/constants.js';

// import { promises as fs } from 'fs';
// import { dirname, join } from 'path';
// import { fileURLToPath } from 'url';
// import crypto from 'crypto';


// custom use agents
const userAgents = {
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.42',
  mobile: 'Mozilla/5.0 (Linux; Android 12; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36 Edg/108.0.1462.42'
}

const MAX_WAIT_FOR_LOAD = 25 * 1000; //seconds
const MAX_WAIT_FOR_FCP = 10 * 1000; //seconds
const SKIP_RESOURCES = ['stylesheet', 'font', 'image', 'imageset', 'media', 'ping', 'fetch', 'prefetch', 'preflight', 'websocket']

// const __dirname = dirname(fileURLToPath(import.meta.url));
// const _root = `${__dirname}/../..`;


const audit = async (page: any, url: string, desktop?: boolean) => {

  // Puppeteer with Lighthouse
  const flags = {
    // port: browser.port, //new URL(browser.wsEndpoint()).port,
    logLevel: 'silent', // 'silent' | 'error' | 'info' | 'verbose'
    output: 'json',   // 'json' | 'html' | 'csv'
    locale: 'en-US',

    maxWaitForFcp: MAX_WAIT_FOR_FCP,
    maxWaitForLoad: MAX_WAIT_FOR_LOAD,

    pauseAfterLoadMs: 0,
    pauseAfterFcpMs: 0,
    pauseAfterNetworkQuietMs: 0,
    pauseAfterCPUIdleMs: 0,

    // plugins: ['lighthouse-plugin-service-worker'],

    // throttling: {
    //   rttMs: 0,
    //   throughputKbps: 0,
    //   requestLatencyMs: 0,
    //   downloadThroughputKbps: 0,
    //   uploadThroughputKbps: 0,
    //   cpuSlowdownMultiplier: 0
    // },
    // disableDeviceEmulation: true,
    disableStorageReset: true,
    disableFullPageScreenshot: true,

    // chromeFlags: [/*'--disable-mobile-emulation',*/ '--disable-storage-reset'],

    skipAboutBlank: true,
    formFactor: desktop ? 'desktop' : 'mobile', // 'mobile'|'desktop';
    screenEmulation: desktop ? screenEmulationMetrics.desktop : screenEmulationMetrics.mobile,  
    emulatedUserAgent: desktop ? userAgents.desktop : userAgents.mobile,  
    throttlingMethod: 'provided', // 'devtools'|'simulate'|'provided';
    // throttling: false,
    onlyAudits: ['custom-service-worker-audit', 'installable-manifest', 'is-on-https'], //'maskable-icon', 'service-worker', 'themed-omnibox', 'viewport', 'apple-touch-icon',  'splash-screen'
    // onlyCategories: ['pwa'] ,
    // skipAudits: ['pwa-cross-browser', 'pwa-each-page-has-url', 'pwa-page-transitions', 'full-page-screenshot', 'network-requests', 'errors-in-console', 'diagnostics'],
  } as Flags;

  
  try {
    // @ts-ignore
    const rawResult = await lighthouse(url, flags, customConfig, page);
    return { 
      audits: rawResult?.lhr?.audits, 
      artifacts: { 
        Manifest: {
          url: rawResult?.artifacts.WebAppManifest?.url,
          raw: rawResult?.artifacts.WebAppManifest?.raw
        },
        // @ts-ignore
        ServiceWorker: rawResult?.artifacts.CustomServiceWorkerGatherer
      }
    };
  }
  catch (error) {
    if (process.stdout)
      process.stdout.write(JSON.stringify(error));
  }

  
  
  // const reportId = crypto.randomUUID();
  // const tempFolder = `${_root}/temp`;
  // const reportFile = `${tempFolder}/${reportId}_report.json`;
  // await fs.mkdir(tempFolder).catch(() => {});
  // await fs.writeFile(`${reportFile}`, JSON.stringify(rawResult)).catch(() => {});

  return null;
};

// adding puppeter's like flags https://github.com/puppeteer/puppeteer/blob/main/packages/puppeteer-core/src/node/ChromeLauncher.ts
// on to op chrome-launcher https://github.com/GoogleChrome/chrome-launcher/blob/main/src/flags.ts#L13

async function execute() {
  const url = process.argv[2];
  const desktop =  process.argv[3] === 'desktop';

  const currentBrowser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--no-pings',
      '--enable-automation',
      '--allow-pre-commit-input',
      '--deny-permission-prompts',
      '--disable-breakpad',
      '--disable-dev-shm-usage',
      '--disable-domain-reliability',
      '--disable-hang-monitor',
      '--disable-ipc-flooding-protection',
      '--disable-popup-blocking',
      '--disable-prompt-on-repost',
      '--disable-renderer-backgrounding',
      '--disabe-gpu',
      '--block-new-web-contents',
      '--single-process'
    ],
    headless: 'new',
    defaultViewport: null,
  });
  const page = await currentBrowser.pages().then(pages => pages[0]);
  await page.setBypassServiceWorker(true);
  await page.setRequestInterception(true);

  page.on('request', (req) => {
      if(SKIP_RESOURCES.some((type) => req.resourceType() == type)){
          req.abort();
      }
      else {
          req.continue();
      }
  });

  // page.on('workercreated', async worker => {
  //   await page.setBypassServiceWorker(true);
  //   await page.setOfflineMode(true);
  // }
  // );

  // const turnValve = setTimeout(async () => {
  //   await (await currentBrowser.pages().then(pages => pages[0])).setOfflineMode(true);
  //   page.evaluate(() => console.log("OFFLINE"));
  // }, MAX_WAIT_FOR_LOAD);

  try {
    // run lighthouse audit

    if (page) {
      const webAppReport = await audit(page, url, desktop);
      // clearTimeout(turnValve);

      await currentBrowser.close();

      if (process.stdout) {
        process.stdout.write(JSON.stringify(webAppReport));
        process.exit(0);
      }

      // return JSON.stringify(webAppReport)

      // context.log.info(
      //   `Report function is DONE processing a request for site: ${req.query.site}`
      // );
    }
  } catch (error: any) {
    await currentBrowser.close();

    if (process.stdout) {
      process.stdout.write(JSON.stringify(error));
      process.exit(1);
    }

    // if (error.name && error.name.indexOf('TimeoutError') > -1) {
    //   context.log.error(
    //     `Report function TIMED OUT processing a request for site: ${url}`
    //   );
    // } else {
    //   context.log.error(
    //     `Report function failed for ${url} with the following error: ${error}`
    //   );
    // }
  }
};

await execute();