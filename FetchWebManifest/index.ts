import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { getManifestTwoWays } from '../utils/getManifest';
import testManifest from '../utils/testManifest';

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.log(
    `Web Manifest function is processing a request for site: ${req?.query?.site}`
  );

  const site = req?.query?.site;
  const maniObject = req?.body?.manifest;
  const maniUrl = req?.body?.maniurl;

  try {
    if (maniObject && (maniUrl || site)) {
      context.log.info(
        `Web Manifest function has a raw manifest object for site: ${req?.query?.site}`
      );

      const results = await testManifest(maniObject);

      context.res = {
        status: 200,
        body: {
          data: results,
          content: {
            json: maniObject,
            url: maniUrl || site,
          },
        },
      };

      context.log.info(
        `Web Manifest function is DONE processing for site: ${req.query.site}`
      );
    } else if (site) {
      context.log.info(
        `Web Manifest function is grabbing manifest object for site: ${req.query.site}`
      );
      const start = new Date().getTime();
      const maniData = await getManifestTwoWays(site, context);
      const elapsed = new Date().getTime() - start;
      context.log('TIME ELAPSED', elapsed);
      if (maniData) {
        const results = await testManifest(maniObject);

        context.res = {
          status: 200,
          body: {
            data: results,
            content: maniData,
          },
        };

        context.log.info(
          `Web Manifest function is DONE processing for site: ${req.query.site}`
        );
      }
    }
  } catch (err) {
    context.res = {
      status: 400,
      body: {
        error: { error: err, message: err.message },
      },
    };

    context.log.error(
      `Web Manifest function has ERRORED while processing for site: ${req.query.site} with this error: ${err.message}`
    );
  }
};

export default httpTrigger;
