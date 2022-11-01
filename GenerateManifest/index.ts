import { AzureFunction, Context, HttpRequest } from "@azure/functions/Interfaces";
import { ExceptionMessage, ExceptionWrap } from "../utils/Exception";
import { Manifest } from "../utils/interfaces";
import { manifestTools } from 'pwabuilder-lib';
import { checkParams } from "../utils/checkParams";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  
  const checkResult = checkParams(req, ['site']);
  if (checkResult.status !== 200){
    context.res = checkResult;
    context.log.error(`GenerateManifest: ${checkResult.body?.error.message}`);
    return;
  }
  
  context.log.info(`GenerateManifest function is processing a request for site: ${req.query.site}`);

  let manifest: Manifest | null = null;
  const url = req.query.site;

  try {
    if (url) {
      const generated_mani = await manifestTools.getManifestFromSite(url);

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

      context.log.error(`GenerateManifest function errored generating the manifest for site: ${req.query.site}`, exception);
    }
  }

};

export default httpTrigger;