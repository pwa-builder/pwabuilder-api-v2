import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import * as puppeteer from 'puppeteer';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  context.log('Security function processed a request.');

  const site = req.query.site;

  let browser: puppeteer.Browser;
  try {
    browser = await puppeteer.launch(
      {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      }
    );

    const page = await browser.newPage();
    const pageResponse = await page.goto(site);

    const securityDetails = pageResponse.securityDetails();

    if (securityDetails) {
      console.log(securityDetails);
      console.log(securityDetails.protocol());
      const results = {
        "isHTTPS": site.includes('https'),
        "validProtocol": securityDetails.protocol() === "TLS 1.3" || securityDetails.protocol() === "TLS 1.2" || securityDetails.protocol() === "_TSL 1.2" || securityDetails.protocol() === "_TSL 1.3",
        "valid": securityDetails.validTo() <= new Date().getTime()
      };
  
      context.res = {
        status: 200,
        body: {
          "data": results
        }
      }
    }
    else {
      context.res = {
        status: 400,
        body: {
          "error": "not valid"
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
    if (browser) {
      await browser.close();
    }
  }
};

export default httpTrigger;
