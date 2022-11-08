import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { checkParams } from '../utils/checkParams';
import loadPage, { LoadedPage, closeBrowser } from '../utils/loadPage';
import { logHttpsResult } from '../utils/urlLogger';

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {

  const checkResult = checkParams(req, ['site']);
  if (checkResult.status !== 200){
    context.res = checkResult;
    context.log.error(`Security: ${checkResult.body?.error.message}`);
    return;
  }

  context.log.info(
    `Security function is processing a request for site: ${req.query.site}`
  );

  const site = req?.query?.site as string;
  let siteData: LoadedPage | undefined;
  const startTime = new Date();

  try {
    let page;
    let pageResponse;

    if (!site)
      throw new Error('Exception: no site URL');

    try {

      const response = await loadPage(site, context);

      if (!(response instanceof Error)) {
        siteData = response;
      } else {
        context.log.info(response);
        context.log.info(response.message);
      }

      page = siteData?.sitePage;
      pageResponse = siteData?.pageResponse;

      if (!page) {
        throw new Error('');
      }

      page.setRequestInterception(true);

      const whiteList = ['document', 'plain', 'script', 'javascript'];
      page.on('request', req => {
        const type = req.resourceType();
        if (whiteList.some(el => type.indexOf(el) >= 0)) {
          req.continue();
        } else {
          req.abort();
        }
      });
    } catch (err: unknown) {
      if (siteData && siteData.browser) {
        await closeBrowser(context, siteData.browser);
      }

      context.res = {
        status: 500,
        body: {
          error: { error: err, message: (err instanceof Error && err.message) ? err.message : 'noMessage' },
        },
      };

      context.log.error(
        `Security function ERRORED loading a request for site: ${req.query.site}`
      );
      logHttpsResult(
        site,
        false,
        0,
        'Error loading site data: ' + err,
        startTime
      );
    }

    const securityDetails = pageResponse?.securityDetails();

    if (securityDetails) {
      const results = {
        isHTTPS: site.includes('https'),
        validProtocol:
          securityDetails.protocol() === 'TLS 1.3' ||
          securityDetails.protocol() === 'TLS 1.2' ||
          securityDetails.protocol() === '_TSL 1.2' ||
          securityDetails.protocol() === '_TSL 1.3',
        valid: securityDetails.validTo() <= new Date().getTime(),
      };

      if (siteData && siteData.browser) {
        await closeBrowser(context, siteData.browser);
      }

      context.res = {
        status: 200,
        body: {
          data: results,
        },
      };

      const score = [
        { metric: results.isHTTPS, score: 10 },
        { metric: results.valid, score: 5 },
        { metric: results.validProtocol, score: 5 },
      ]
        .filter(a => a.metric)
        .map(a => a.score)
        .reduce((a, b) => a + b);
      logHttpsResult(
        site,
        results.isHTTPS && results.valid && results.validProtocol,
        score,
        null,
        startTime
      );
    } else {
      if (siteData && siteData.browser) {
        await closeBrowser(context, siteData.browser);
      }

      context.res = {
        status: 400,
        body: {
          error: 'Security Details could not be retrieved from the site',
        },
      };

      const errorMessage = `Security function could not load security details for site: ${req.query.site}`;
      context.log.error(errorMessage);
      logHttpsResult(site, false, 0, errorMessage, startTime);
    }
  } catch (err: unknown) {
    if (siteData && siteData.browser) {
      await closeBrowser(context, siteData.browser);
    }

    context.res = {
      status: 500,
      body: {
        error: { error: err, message: (err instanceof Error && err.message) ? err.message : 'noMessage' },
      },
    };
    const errorMessage = `Security function ERRORED loading a request for site: ${req.query.site} with error: ${(err instanceof Error && err.message) ? err.message : 'noMessage'}`;
    context.log.error(errorMessage);
    logHttpsResult(site, false, 0, errorMessage, startTime);
  }
};

export default httpTrigger;
