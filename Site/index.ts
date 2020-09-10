import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import * as puppeteer from "puppeteer";
import { ifFile, ManifestFormat } from "./helpers";
import getManifest from "../utils/getManifest";
const manifestTools = require('pwabuilder-lib').manifestTools;

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
    return;
  }

  // Handle Site
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const siteUrl = req.query.site;
    const { json: manifest, url: manifestUrl } = await getManifest(browser, siteUrl);
    let detectedFormat = <ManifestFormat>manifestTools.detect(manifest);

    manifestTools.convertTo(
      { format: detectedFormat, content: manifest },
      ManifestFormat.w3c,
      async (err, resultManifestInfo) => {
        if (err) {
          context.log(err);
          context.res = {
            status: 400,
            body: {
              message: "Failed to convert to a w3c standard format"
            },
          };
          return;
        }

        manifestTools.validateAndNormalizeStartUrl(
          siteUrl,
          resultManifestInfo,
          (err, validatedManifestInfo) => {
            if (err) {
              context.log(err);
              context.res = {
                status: 400,
                body: {
                  message: "Failed to validate and normalize the manifest"
                },
              };
              return;
            }
            validatedManifestInfo.generatedUrl = manifestUrl;

            context.res = {
              body: validatedManifestInfo
            }
          }
        );
      }
    );
  } catch (e) {
    // if (e.message === site.Errors.)

    context.log(e);
  } finally {
    if (browser) {
      browser.close();
    }
  }
};

export default httpTrigger;
