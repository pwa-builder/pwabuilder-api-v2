import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import * as puppeteer from "puppeteer";
import { ManifestFormat } from "./helpers";
import getManifestFromFile, {
  ifSupportedFile,
} from "../utils/getManifestFromFile";
import getManifest from "../utils/getManifest";
import { ExceptionWrap, ExceptionMessage } from "../utils/Exception";
const manifestTools = require("pwabuilder-lib").manifestTools;

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
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
      manifest = await getManifestFromFile(req);
    } else {
      // Handle Site
      ({ json: manifest, url: manifestUrl } = await getManifest(siteUrl));
    }

    const detectedFormat = <ManifestFormat>manifestTools.detect(manifest);

    manifestTools.convertTo(
      { format: detectedFormat, content: manifest },
      ManifestFormat.w3c,
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
      context.log(exception);
      context.res = {
        status: 400,
        body: {
          message: ExceptionMessage[exception.type],
        },
      };
    } else {
      context.log(exception);

      context.res = {
        status: 400,
      };
    }
  } finally {
    if (browser) {
      browser.close();
    }
  }
};

export default httpTrigger;
