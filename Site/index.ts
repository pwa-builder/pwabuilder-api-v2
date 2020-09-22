import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import * as puppeteer from "puppeteer";
import getManifestFromFile, {
  ifSupportedFile,
} from "../utils/getManifestFromFile";
import getManifest from "../utils/getManifest";
import { ExceptionWrap } from "../utils/Exception";
const manifestTools = require("pwabuilder-lib").manifestTools;

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.log(`Site function is processing a request for site: ${req.query.site}`);

  let browser: puppeteer.Browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    let manifest, manifestUrl;
    const siteUrl = req.query.site;

    // Handle File
    if (req.method === "POST" && ifSupportedFile(req)) {
      context.log(`Site function is getting the manifest from a file for site: ${req.query.site}`);

      manifest = await getManifestFromFile(req);
    } else {
      // Handle Site
      context.log(`Site function is loading the manifest from the URL for site: ${req.query.site}`);

      ({ json: manifest, url: manifestUrl } = await getManifest(siteUrl));
    }

    const detectedFormat = <Manifest.Format>manifestTools.detect(manifest);

    manifestTools.convertTo(
      { format: detectedFormat, content: manifest },
      Manifest.Format.w3c,
      async (err, resultManifestInfo) => {
        if (err) {
          context.log(err);
          context.res = {
            status: 400,
            body: {
              message: "Failed to convert to a w3c standard format",
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
                  message: "Failed to validate and normalize the manifest",
                },
              };
              return;
            }
            validatedManifestInfo.generatedUrl = manifestUrl;

            context.res = {
              body: validatedManifestInfo,
            };
          }
        );
      }
    );
  } catch (exception) {
    if (exception instanceof ExceptionWrap) {
      context.res = {
        status: 400,
        body: {
          message: Exception.Message[exception.type],
        },
      };

      context.log(`Site function errored getting the manifest for site: ${req.query.site} with error: ${exception}`);
    } else {
      context.res = {
        status: 400,
      };

      context.log(`Site function errored getting the manifest for site: ${req.query.site}`);
    }
  } finally {
    if (browser) {
      browser.close();
    }
  }
};

export default httpTrigger;
