import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import loadPage from "../utils/loadPage";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  context.log('Security function processed a request.');

  const site = req.query.site;

  try {
    let page;
    let pageResponse;

    try {
      const siteData = await loadPage(site);

      page = siteData.sitePage;
      pageResponse = siteData.pageResponse;
    }
    catch (err) {
      context.res = {
        status: 400,
        body: {
          "error": { error: err, message: err.message }
        }
      }
    }

    const securityDetails = pageResponse.securityDetails();

    if (securityDetails) {
      const results = {
        "isHTTPS": site.includes('https'),
        "validProtocol": securityDetails.protocol() === "TLS 1.3" || securityDetails.protocol() === "TLS 1.2" || securityDetails.protocol() === "_TSL 1.2" || securityDetails.protocol() === "_TSL 1.3",
        "valid": securityDetails.validTo() <= new Date().getTime()
      };

      context.res = {
        status: 200,
        body: {
          "data": results
        }
      }
    }
    else {
      context.res = {
        status: 400,
        body: {
          "error": "Security Details could not be retrieved from the site"
        }
      }
    }

  }
  catch (err) {
    context.res = {
      status: 400,
      body: {
        "error": { error: err, message: err.message }
      }
    }
  }
};

export default httpTrigger;
