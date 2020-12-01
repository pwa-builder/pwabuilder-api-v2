import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import loadPage, { closeBrowser } from "../utils/loadPage";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  context.log.info(`Security function is processing a request for site: ${req.query.site}`);

  const site = req.query.site;
  let siteData = null;

  try {
    let page;
    let pageResponse;

    try {
      siteData = await loadPage(site, context);

      page = siteData.sitePage;
      pageResponse = siteData.pageResponse;

      page.setRequestInterception(true);

      let whiteList = ['document', 'plain', 'script', 'javascript'];
      page.on('request', (req) => {
        const type = req.resourceType();
        if (whiteList.some((el) => type.indexOf(el) >= 0)) {
          req.continue();
        } else {
          req.abort();
        }
      });
    }
    catch (err) {
      if (siteData && siteData.browser) {
        await closeBrowser(context, siteData.browser);
      }

      context.res = {
        status: 500,
        body: {
          "error": { error: err, message: err.message }
        }
      }

      context.log.error(`Security function ERRORED loading a request for site: ${req.query.site}`);
    }

    const securityDetails = pageResponse?.securityDetails();

    if (securityDetails) {
      const results = {
        "isHTTPS": site.includes('https'),
        "validProtocol": securityDetails.protocol() === "TLS 1.3" || securityDetails.protocol() === "TLS 1.2" || securityDetails.protocol() === "_TSL 1.2" || securityDetails.protocol() === "_TSL 1.3",
        "valid": securityDetails.validTo() <= new Date().getTime()
      };

      if (siteData && siteData.browser) {
        await closeBrowser(context, siteData.browser);
      }

      context.res = {
        status: 200,
        body: {
          "data": results
        }
      }
    }
    else {
      if (siteData && siteData.browser) {
        await closeBrowser(context, siteData.browser);
      }

      context.res = {
        status: 400,
        body: {
          "error": "Security Details could not be retrieved from the site"
        }
      }

      context.log.error(`Security function could not load security details for site: ${req.query.site}`);
    }

  }
  catch (err) {
    context.res = {
      status: 500,
      body: {
        "error": { error: err, message: err.message }
      }
    }

    context.log.error(`Security function ERRORED loading a request for site: ${req.query.site} with error: ${err.message}`);
  }
};

export default httpTrigger;
