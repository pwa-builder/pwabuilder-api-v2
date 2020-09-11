import * as puppeteer from 'puppeteer';

export default async function loadPage(site: string): Promise<{sitePage: puppeteer.Page, pageResponse: puppeteer.Response, browser: puppeteer.Browser}> {
  let browser: puppeteer.Browser;
  let sitePage: puppeteer.Page;
  let pageResponse: puppeteer.Response;

  const timeout = 120000;

  if (sitePage && pageResponse) {
    return {
      sitePage: sitePage,
      pageResponse: pageResponse,
      browser: browser
    };
  }
  else {
    try {
      browser = await puppeteer.launch(
        {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        }
      );

      sitePage = await browser.newPage();

      await sitePage.setDefaultNavigationTimeout(timeout);

      pageResponse =  await sitePage.goto(site, { waitUntil: ['domcontentloaded'] });

      await handleEvent(sitePage);

      return {
        sitePage: sitePage,
        pageResponse: pageResponse,
        browser: browser
      };
    }
    catch (err) {
      return err || err.message;
    }
  }
}

async function handleEvent(sitePage): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      sitePage.once('load', () => {
        resolve();
      })
    }
    catch (err) {
      reject(err);
    }
  })
}