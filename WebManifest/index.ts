import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import * as puppeteer from 'puppeteer';

import { checkShortName, checkDesc, checkName, checkDisplay, checkStartUrl, checkIcons, checkScreenshots } from './mani-tests';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  context.log('HTTP trigger function processed a request.');

  const site = req.query.site;
  
  let browser;
  try {
    browser = await puppeteer.launch(
      {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      }
    );
    const page1 = await browser.newPage();

    await page1.goto(site);

    const manifestHref = await page1.$eval('link[rel=manifest]', (el: HTMLAnchorElement) => el.href);

    await page1.close();

    if (manifestHref) {
      const page = await browser.newPage();

      await page.goto(manifestHref);

      const maniData = await page.evaluate(() => {
        return JSON.parse(document.querySelector("body").innerText);
      });

      const results = {
        "required": {
          "short_name": checkShortName(maniData),
          "description": checkDesc(maniData),
          "name": checkName(maniData),
          "display": checkDisplay(maniData),
          "start_url": checkStartUrl(maniData),
          "icons": checkIcons(maniData),
          "screenshots": checkScreenshots(maniData)
        },
        "optional": {

        }
      }

      context.res = {
        status: 200,
        body: {
          "data": results
        }
      }
    }
    else {
      context.res = {
        status: 200,
        body: {
          "data": null
        }
      }
    }
  }
  catch (err) {
    context.res = {
      status: 400,
      body: {
        "error": err
      }
    }
  }
  finally {
    await browser.close();
  }
};

export default httpTrigger;
