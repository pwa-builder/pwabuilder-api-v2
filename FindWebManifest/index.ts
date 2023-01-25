import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { checkParams } from '../utils/checkParams';


const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {

  const checkResult = checkParams(req, ['site']);
  if (checkResult.status !== 200){
    context.res = checkResult;
    context.log.error(`FindWebManifest: ${checkResult.body?.error.message}`);
    return;
  }

  const site = req?.query?.site;

  context.log(
    `FindWebManifest: function is processing a request for site: ${site}`
  );

  try {

    const response = await fetch(site);
    const html = await response.text();

    const document = new DOMParser().parseFromString(html, "text/html");

    const element = document.querySelector('link[rel="manifest"]');
    const link = element? element.getAttribute("href") : null;
    let manifest: unknown | null = null;
    
    if (element && link) {
      try {
        const response = await fetch(link);
        manifest = await response.json();
      } catch (error) {
        
      }
    }

    if (manifest || link) {
      context.res = {
        status: 200,
        body: {
          content: {
            json: manifest,
            url: link,
          },
        },
      };

      context.log.info(
        `FindWebManifest: function is DONE processing for site: ${site}`
      );
    }
    else {
      context.res = {
        status: 400,
        body: {
          error: { message: "No manifest found" },
        },
      };

      context.log.error(
        `FindWebManifest: function has ERRORED while processing for site: ${site} with this error: No manifest found`
      );
    }
    
  } catch (err: any) {
    context.res = {
      status: 400,
      body: {
        error: { error: err, message: err.message },
      },
    };

    context.log.error(
      `FindWebManifest: function has ERRORED while processing for site: ${site} with this error: ${err.message}`
    );
  }
};

export default httpTrigger;
