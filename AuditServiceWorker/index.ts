import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { checkParams } from '../utils/checkParams';
import { analyzeServiceWorker } from '../utils/analyzeServiceWorker';


const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {

  const checkResult = checkParams(req, ['site']);
  if (checkResult.status !== 200){
    context.res = checkResult;
    context.log.error(`AuditServiceWorker: ${checkResult.body?.error.message}`);
    return;
  }

  const url = req?.query?.site;

  context.log(
    `AuditServiceWorker: function is processing a request for url: ${url}`
  );

  try {

    const swFeatures = await analyzeServiceWorker(url);

    context.res = {
      status: 200,
      body: {
        content: {
          features: swFeatures,
          url: url,
        },
      },
    };

    context.log.info(
      `AuditServiceWorker: function is DONE processing for url: ${url}`
    );
    
  } catch (err: any) {
    context.res = {
      status: 400,
      body: {
        error: { error: err, message: err?.message || null },
      },
    };

    context.log.error(
      `AuditServiceWorker: function has ERRORED while processing for url: ${url} with this error: ${err?.message || err}`
    );
  }
};

export default httpTrigger;
