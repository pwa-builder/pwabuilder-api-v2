import { AzureFunction, Context, HttpRequest } from '@azure/functions';

import getManifestFromFile, {
  ifSupportedFile,
} from '../utils/getManifestFromFile.js';
import { getManifest } from '../utils/getManifest.js';

import { ExceptionMessage, ExceptionWrap } from '../utils/Exception.js';
import { Manifest, ManifestFormat, ManifestInfo } from '../utils/interfaces.js';
import { checkParams } from '../utils/checkParams.js';

import pkg from 'pwabuilder-lib';
const { manifestTools } = pkg;

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {

  const checkResult = checkParams(req, ['site']);
  if (checkResult.status !== 200){
    context.res = checkResult;
    context.log.error(`Site: ${checkResult.body?.error.message}`);
    return;
  }
  
  context.log.info(
    `Site function is processing a request for site: ${req.query.site}`
  );

  try {
    let manifestUrl: string;
    let manifest: Manifest | null = null;
    const url = req?.query?.site as string;

    // Handle File
    if (req.method === 'POST' && ifSupportedFile(req)) {
      context.log.info(
        `Site function is getting the manifest from a file for site: ${req.query.site}`
      );

      manifest = await getManifestFromFile(req);
    } else {
      // Handle Site
      context.log.info(
        `Site function is loading the manifest from the URL for site: ${req.query.site}`
      );

      const manifestData = await getManifest(url, context);

      if (manifestData) {
        manifest = manifestData.json;
        manifestUrl = manifestData.url;
      }
    }

    // TODO replace this with the validation tool - utils/schema
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
              message: 'Failed to convert to a w3c standard format',
            },
          };
          return;
        }

        manifestTools.validateAndNormalizeStartUrl(
          url,
          resultManifestInfo,
          (err: Error, validatedManifestInfo: ManifestInfo) => {
            if (err) {
              context.log.error(err);
              context.res = {
                status: 400,
                body: {
                  message: 'Failed to validate and normalize the manifest',
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

      context.log.error(
        `Site function errored getting the manifest for site: ${req.query.site} with error: ${exception}`
      );
    } else {
      context.res = {
        status: 400,
      };

      context.log.error(
        `Site function errored getting the manifest for site: ${req.query.site}`
      );
    }
  }
};

export default httpTrigger;

/**
 * @openapi
 *  /Site:
 *    get:
 *      deprecated: true
 *      summary: Custom report
 *      description: Custom manifest validation
 *      tags:
 *        - Report
 *      parameters:
 *        - $ref: ?file=components.yaml#/parameters/site
 *      responses:
 *        '200':
 *          description: 'OK'
 *          content: 
 *            application/json:
 *              schema: 
 *                type: object
 *                properties: 
 *                  content:
 *                    type: object
 *                    $ref: ?file=manifest.yaml
 *                  format:
 *                    type: string
 *                  generatedUrl: 
 *                    type: string
 *                  id: 
 *                    type: number
 *                  default:
 *                    type: object
 *                  errors:
 *                    type: array
 *                    items:
 *                      type: object
 *                  suggestions:
 *                    type: array
 *                    items:
 *                      type: object
 *                  warnings:
 *                    type: array
 *                    items:
 *                      type: object
 */​