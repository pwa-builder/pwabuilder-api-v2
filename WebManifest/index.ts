import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { checkParams, checkBody } from '../utils/checkParams';
import { getManifest } from '../utils/getManifest';
import testManifest from '../utils/testManifest';

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {

  const checkSite = checkParams(req, ['site']);
  const checkBodyManifest = checkBody(req, ['manifest']);
  if (checkSite.status !== 200 && checkBodyManifest.status !== 200){
    const _problem = checkSite
    _problem.body?.error.message && (_problem.body.error.message = [checkBodyManifest.body?.error.message as string, checkSite.body?.error.message as string])
    context.res = _problem;
    context.log.error(`WebManifest: ${checkSite.body?.error.message} or ${checkBodyManifest.body?.error.message}`);
    return;
  }

  
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
      const maniData = await getManifest(site, context);

      if (maniData?.json) {
        const results = await testManifest(maniData?.json);

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
  } catch (err: any) {
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
