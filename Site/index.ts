import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import * as puppeteer from "puppeteer";
import getManifestFromFile, {
  ifSupportedFile,
} from "../utils/getManifestFromFile";
import getManifest from "../utils/getManifest";
import { ExceptionMessage, ExceptionWrap } from "../utils/Exception";
import { Manifest, ManifestFormat, ManifestInfo } from "../utils/interfaces";
const manifestTools = require("pwabuilder-lib").manifestTools;

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.log.info(`Site function is processing a request for site: ${req.query.site}`);

  let browser: puppeteer.Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    let manifestUrl: string;
    let manifest: Manifest | null = null;
    const siteUrl = req.query.site;

    // Handle File
    if (req.method === "POST" && ifSupportedFile(req)) {
      context.log.info(`Site function is getting the manifest from a file for site: ${req.query.site}`);

      manifest = await getManifestFromFile(req);
    } else {
      // Handle Site
      context.log.info(`Site function is loading the manifest from the URL for site: ${req.query.site}`);

      const manifestData = await getManifest(siteUrl);

      if (manifestData) {
        manifest = manifestData.json;
        manifestUrl = manifestData.url;
      }
    }

    const detectedFormat = <ManifestFormat>manifestTools.detect(manifest);

    manifestTools.convertTo(
      { format: detectedFormat, content: manifest },
      ManifestFormat.w3c,
      async (err: Error, resultManifestInfo: ManifestInfo) => {
        if (err) {
          context.log.error(err);
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
          (err: Error, validatedManifestInfo: ManifestInfo) => {
            if (err) {
              context.log.error(err);
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
          message: ExceptionMessage[exception.type],
        },
      };

      context.log.error(`Site function errored getting the manifest for site: ${req.query.site} with error: ${exception}`);
    } else {
      context.res = {
        status: 400,
      };

      context.log.error(`Site function errored getting the manifest for site: ${req.query.site}`);
    }
  } finally {
    if (browser) {
      browser.close();
    }
  }
};

export default httpTrigger;
