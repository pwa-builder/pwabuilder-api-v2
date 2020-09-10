import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import * as puppeteer from "puppeteer";
import { ifSupportedFile, ManifestFormat } from "./helpers";
import getManifest from "../utils/getManifest";
import { ExceptionWrap, ExceptionMessage } from "../utils/ExceptionType";
const manifestTools = require('pwabuilder-lib').manifestTools;

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  let browser: puppeteer.Browser;

  // Handle File
  if (req.method === "POST" && ifSupportedFile(req)) {
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
  } catch (exception) {
    if (exception instanceof ExceptionWrap) {
      context.res = {
        status: 400,
        body: {
          message: ExceptionMessage[exception.type]
        }
      }
    } else {
      context.log(exception);
    }
  } finally {
    if (browser) {
      browser.close();
    }
  }
};

export default httpTrigger;
