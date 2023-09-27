
import puppeteer from 'puppeteer';
import lighthouse, { OutputMode, Flags } from 'lighthouse';
import customConfig from './custom-config.js';
import { screenEmulationMetrics, userAgents} from 'lighthouse/core/config/constants.js';

const MAX_WAIT_FOR_LOAD = 30 * 1000; //seconds
const MAX_WAIT_FOR_FCP = 15 * 1000; //seconds
const SKIP_RESOURCES = ['stylesheet', 'font', 'image', 'imageset', 'media', 'ping', 'fetch', 'prefetch', 'preflight', 'websocket']

const audit = async (page: any, url: string, desktop?: boolean) => {

  // Puppeteer with Lighthouse
  const flags = {
    logLevel: 'silent', // 'silent' | 'error' | 'info' | 'verbose'
    output: 'json',   // 'json' | 'html' | 'csv'
    locale: 'en-US',

    maxWaitForFcp: MAX_WAIT_FOR_FCP,
    maxWaitForLoad: MAX_WAIT_FOR_LOAD,

    pauseAfterLoadMs: 0,
    pauseAfterFcpMs: 0,
    pauseAfterNetworkQuietMs: 0,
    pauseAfterCPUIdleMs: 0,

    throttling: {
      rttMs: 0,
      throughputKbps: 0,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0,
      cpuSlowdownMultiplier: 0
    },

    disableStorageReset: true,
    disableFullPageScreenshot: true,

    skipAboutBlank: true,
    formFactor: desktop ? 'desktop' : 'mobile',
    screenEmulation: screenEmulationMetrics[desktop? 'desktop': 'mobile'],  
    emulatedUserAgent: `${desktop ? userAgents.desktop : userAgents.mobile} PWABuilderHttpAgent`,  
    onlyAudits: ['installable-manifest', 'is-on-https', 'service-worker-audit', 'offline-audit', 'https-audit'], //'maskable-icon', 'service-worker', 'themed-omnibox', 'viewport', 'apple-touch-icon',  'splash-screen'
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
        ServiceWorker: rawResult?.artifacts.ServiceWorkerGatherer
      }
    };
  }
  catch (error) {
    if (process.stdout)
      process.stdout.write(JSON.stringify(error, Object.getOwnPropertyNames(error)));
    process.exit(1);
  }
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
      '--deny-permission-prompts',
      '--disable-domain-reliability',
      '--disabe-gpu',
      '--block-new-web-contents',
      // '--single-process'
    ],
    headless: 'new',
    defaultViewport: {
      width: screenEmulationMetrics[desktop? 'desktop': 'mobile'].width,
      height: screenEmulationMetrics[desktop? 'desktop': 'mobile'].height,
      deviceScaleFactor: screenEmulationMetrics[desktop? 'desktop': 'mobile'].deviceScaleFactor,
      isMobile: desktop? false: true,
      hasTouch: desktop? false: true,
      isLandscape: desktop? true: false,
    },
  });

  const page = await currentBrowser.pages().then(pages => pages[0]);
  await page.setBypassServiceWorker(true);
  await page.setRequestInterception(true);

  page.on('request', (req) => {
      if(SKIP_RESOURCES.some((type) => req.resourceType() == type)){
          // req.abort();
          req.respond({
              status: 200,
              contentType: 'text/plain',
              body: 'success'
            });
      }
      else
        req.continue(); 
  });

  const manifest_alt = {
    url: '',
    raw: '',
    json: {},
  };
  page.on('response', async res => {
    if (res.request().resourceType() === 'manifest') {
      // manifest_alt.json = await res.json();
      manifest_alt.raw = await res.text();
      manifest_alt.url = res.url();
    }
    return true;
  });

  // don't let the bad SW kill the audit
  let valveTriggered = false;
  const turnValve = setTimeout(async () => {
    valveTriggered = true;
    try {
      const client = await page.target().createCDPSession();
      await client.send('ServiceWorker.enable');
      await client.send('ServiceWorker.stopAllWorkers');
    } catch (error) {
      console.log(error);
    }
  }, MAX_WAIT_FOR_LOAD * 2);

  try {
    // run lighthouse audit
    const webAppReport = await audit(page, url, desktop);
    clearTimeout(turnValve);
    if (valveTriggered && webAppReport?.audits!['service-worker-audit']) {
      // @ts-ignore
      webAppReport.audits['service-worker-audit'].details = {
        error: 'Service worker timed out',
      };
    }
    if (manifest_alt.url && manifest_alt.raw && (!webAppReport?.artifacts?.Manifest?.raw || manifest_alt.raw > webAppReport.artifacts.Manifest.raw)) {
      webAppReport.artifacts.Manifest = manifest_alt;
    }

    await currentBrowser.close();

    process.stdout && process.stdout.write(JSON.stringify(webAppReport));
    process.exit(0);
  
  } catch (error: any) {
    await currentBrowser.close();
    
    process.stdout && process.stdout.write(JSON.stringify(error, Object.getOwnPropertyNames(error)));
    process.exit(1);
  }
};

await execute();