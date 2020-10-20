import * as puppeteer from 'puppeteer';

export default async function loadPage(site: string): Promise<{ sitePage: puppeteer.Page, pageResponse: puppeteer.Response, browser: puppeteer.Browser }> {
  let browser: puppeteer.Browser;
  let sitePage: puppeteer.Page;
  let pageResponse: puppeteer.Response | null;

  const timeout = 120000;

  try {
    browser = await puppeteer.launch(
      {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      }
    );

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