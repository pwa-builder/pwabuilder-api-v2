
import puppeteer from 'puppeteer';
import lighthouse, { OutputMode, Flags } from 'lighthouse';
import customConfig from './custom-config.js';
import { screenEmulationMetrics, userAgents} from 'lighthouse/core/config/constants.js';

const MAX_WAIT_FOR_LOAD = 30 * 1000; //seconds
const MAX_WAIT_FOR_FCP = 15 * 1000; //seconds
const SKIP_RESOURCES = [/*'stylesheet',*//* 'font',*/ 'image', /*'imageset', 'media', 'ping', ,'fetch',*/ /*'prefetch', 'preflight', 'websocket'*/];
const base64Font = "d09GMgABAAAAAANMAA4AAAAAB5wAAALzAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP0ZGVE0cGh4GYACCQggEEQgKghCCBQsKAAE2AiQDEAQgBYVoBzQbkgZRlA3KLrKPwziGXKIIJZRhWeKjhaW5iHc8D+337dyZeX8XM0tqCa+b0BAJWSUTRSOESKRDer+Elf/fP73/pxBepXCrtIUq9XPyX1N40yxPPd20eYM4w2v+53J6YxJ8phOZw26LHd01NmV5hIHdyxbInCB5FA2xiENuQG8T/JF1eSoE/n6IGgX8f9FGc7MmMBOLgSKqKhoKWu3zVEd5QP7CQyCTf/aFhOLqKm7y8u2cEtgYGqpXzVU09aPXCADWIlBRsRIBjmAIVrKwFmiaMDQ1Rb55aYUAGRBACgrUjxPIF1pXmgBkagoJGhhFh9PAGAANu5GgtjZr1jp7y1ntpn03PdHSu3fWeb7fd3jZdXHg6Fi5vtfD40x2dqa4UHgNLM12evZ7ep7Lz1+Vl0rvQe/RrrmQEdv3PdpUbTJdpCgwMiBDEJDplewVmCkIzPBaDzKQjAbPScwrvD6WxcLy2JLoK7I0sjxKzH83T33Em91k3YXaZmYDE4qJ3cwpyMuWhz7FvwN8C1bygnWDN+68VXfHso7XwgdhFev4iHCQcRrPMxMI3zf5HHM+8jdqX4cdfiSYel/7uhbAqAKik9qQsrf2rG0YeNaFS/KfEzSHMUDBdNMxhQnAfA8COKQGAWLUTwHFiD8CqlG9gGY0RUBnRjYAAQZGcxIIMN2OzAiYYUH+VWnTcB/YEHPNQDHbb6jmOkcb+QmdxbGHgblhwXQ3c2kfM2zOgdMoBk2MKpWrgCHRssRAuNi4eJAiTRAqRXGlOoVqIIXqYRWhr6Mh6ZAylDpYqRo1KEzFKLXgD0bjrBj0vX/aKqycRs3057/ijkScqbtDWS5EDQe4qlS5ejUKGcFL3DpN3nlw+U2ljGiV0dUIBxMbnP/65zDZWdHzZl32WKFIt6TOPgrNpBwXhpVByhhRaiG5RSWIIfyeKqWKYUzw8CBNm8q5GJedGJ3catUXCj8iwF0YZpCIhdUKyoa+RR0PpgCmT7gFDVFSpt2qpRLWXwAAAA==";
const base64Image = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";

const audit = async (page: any, url: string, desktop?: boolean) => {

  // Puppeteer with Lighthouse
  const flags = {
    logLevel: 'silent', // 'silent' | 'error' | 'info' | 'verbose'
    output: 'json',   // 'json' | 'html' | 'csv'
    locale: 'en-US',

    maxWaitForFcp: MAX_WAIT_FOR_FCP,
    maxWaitForLoad: MAX_WAIT_FOR_LOAD,

    pauseAfterLoadMs: 250,
    pauseAfterFcpMs: 250,
    pauseAfterNetworkQuietMs: 250,
    pauseAfterCPUIdleMs: 250,
    networkQuietThresholdMs: 250,
    cpuQuietThresholdMs: 250,

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
    onlyAudits: ['installable-manifest', 'is-on-https', 'service-worker-audit', 'https-audit', 'offline-audit'], //'maskable-icon', 'service-worker', 'themed-omnibox', 'viewport', 'apple-touch-icon',  'splash-screen'
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
    writeAndExit(error, 1);
  }
};

const writeAndExit = (data: any, code: 1 | 0) => { 
  if (process.stdout) {
    if (code){
      process.stdout.write(JSON.stringify(data, Object.getOwnPropertyNames(data)), () => {
          process.exit(code)
      });
    }
    else {
      process.stdout.write(JSON.stringify(data), () => {
        process.exit(code);
      });
    }
  }
  else
    process.exit(code);
}

// adding puppeter's like flags https://github.com/puppeteer/puppeteer/blob/main/packages/puppeteer-core/src/node/ChromeLauncher.ts
// on to op chrome-launcher https://github.com/GoogleChrome/chrome-launcher/blob/main/src/flags.ts#L13

const disabledFeatures = [
  'Translate',
  'TranslateUI',
  // AcceptCHFrame disabled because of crbug.com/1348106.
  'AcceptCHFrame',
  'AutofillServerCommunication',
  'CalculateNativeWinOcclusion',
  'CertificateTransparencyComponentUpdater',
  'InterestFeedContentSuggestions',
  'MediaRouter',
  'DialMediaRouteProvider',
  // 'OptimizationHints'
];

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
      `--disable-features=${disabledFeatures.join(',')}`,
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

  page.on('dialog', dialog => {
    dialog.dismiss();
  });

  page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (SKIP_RESOURCES.some((type) => resourceType == type)){
          switch (resourceType) {
            case 'image':
              req.respond(
                {
                  status: 200,
                  contentType: 'image/jpeg',
                  body: Buffer.from(base64Image, 'base64'),
                });
              break;
            case 'font':
              req.respond(
                {
                  status: 200,
                  contentType: 'font/woff2',
                  body: Buffer.from(base64Font, 'base64'),
                  
                });
              break;
            case 'fetch':
              if (req.method() == 'GET')
                req.respond({
                  status: 200,
                  contentType: 'application/json',
                  body: JSON.stringify({ success: true, message: "Intercepted fetch request" }),
                });
              else
                req.continue();
              break;
            default:
              req.respond({
                status: 200,
                contentType: 'text/plain',
                body: '{"success": true}',
              });
              break;
          }
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
      try {
        manifest_alt.raw = await res.text();
        manifest_alt.url = res.url();
      }catch (error) {}
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
    if (manifest_alt.url && webAppReport && manifest_alt.raw && (!webAppReport?.artifacts?.Manifest?.raw || manifest_alt.raw > webAppReport.artifacts.Manifest.raw)) {
      webAppReport.artifacts.Manifest = manifest_alt;
    }

    await currentBrowser.close();

    writeAndExit(webAppReport, 0);
  } catch (error: any) {
    await currentBrowser.close();

    writeAndExit(error, 1);
  }
};

await execute();