import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import * as puppeteer from "puppeteer";
import { ifFile } from "./helpers";
import * as site from "./site";
import { detect } from "pwabuilder-lib/lib/manifestTools";

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  let browser: puppeteer.Browser;
  const isFile = req.method === "POST" && ifFile(req);

  // Handle File
  if (isFile) {
    // const file = req.body;
    context.res = {
      status: 400,
      body: {
        message: "not supported yet",
      },
    };
  }

  // Handle Site
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const siteUrl = req.query.site;
    const manifest = await site.getManifest(browser, siteUrl);
  } catch (e) {
    // if (e.message === site.Errors.)

    console.log(e);
  } finally {
    if (browser) {
      browser.close();
    }
  }

  context.res = {
    // status: 200, /* Defaults to 200 */
    body: {
      a: true,
    },
  };
};

export default httpTrigger;
