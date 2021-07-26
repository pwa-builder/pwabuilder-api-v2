import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { ExceptionMessage, ExceptionWrap } from "../utils/Exception";
import { Manifest } from "../utils/interfaces";

const manifestCreator = require("pwabuilder-lib").manifestTools;

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  context.log.info(`GenerateManifest function is processing a request for site: ${req.query.site}`);

  let manifest: Manifest | null = null;
  const siteUrl = req.query.site;

  try {
    if (siteUrl) {
      const generated_mani = await manifestCreator.getManifestFromSite(siteUrl);

      if (generated_mani) {
        manifest = generated_mani;

        context.res = {
          // status: 200, /* Defaults to 200 */
          body: manifest
        };
      }
    }
    else {
      context.res = {
        status: 400,
        body: "No site URL to generate a manifest with was passed"
      }

      context.log.error(`GenerateManifest function was called without a site URL`);
    }
  }
  catch (exception) {
    if (exception instanceof ExceptionWrap) {
      context.res = {
        status: 400,
        body: {
          message: ExceptionMessage[exception.type],
        },
      };

      context.log.error(`GenerateManifest function errored generating the manifest for site: ${req.query.site} with error: ${exception}`);
    } else {
      context.res = {
        status: 400,
      };

      context.log.error(`GenerateManifest function errored generating the manifest for site: ${req.query.site}`);
    }
  }

};

export default httpTrigger;