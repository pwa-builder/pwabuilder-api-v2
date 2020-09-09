import uuid from "uuid";
import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import * as puppeteer from "puppeteer";
import { ifFile, ManifestFormat, validManifest, addToClient, normalizeStartUrl } from "./helpers";
import * as site from "./site";
import manifestTools from "pwabuilder-lib/lib/manifestTools";

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
    const { json: manifest, url: manifestUrl } = await site.getManifest(browser, siteUrl);
    let detectedFormat = <ManifestFormat>manifestTools.detect(manifest);

    manifestTools.convertTo(
      { format: detectedFormat, content: manifest },
      ManifestFormat.w3c,
      async (err, resultManifestInfo) => {
        if (err) {
          context.log(err);
          context.res = {
            status: 400,
            body: {},
          };
          return;
        }

        manifestTools.validateAndNormalizeStartUrl(
          siteUrl,
          resultManifestInfo,
          async (err, validatedManifestInfo) => {
            if (err) {
              context.log(err);
              context.res = {
                status: 400,
                body: {},
              };
              return;
            }
            validatedManifestInfo.id = uuid.v4().slice(0, 8);
            validatedManifestInfo.generatedUrl = manifestUrl;
            normalizeStartUrl(validatedManifestInfo);

            if (!validManifest(validatedManifestInfo)) {
              // log err and return error response


              return;
            }

            //await addToClient(validatedManifestInfo);

            context.res = {
              body: validatedManifestInfo,
            };
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

  context.res = {
    // status: 200, /* Defaults to 200 */
    body: {
      a: true,
    },
  };
};

export default httpTrigger;
