/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an orchestrator function.
 *
 * Before running this sample, please:
 * - create a Durable orchestration function
 * - create a Durable HTTP starter function
 * - run 'npm install durable-functions' from the wwwroot folder of your
 *   function app in Kudu
 */

import { AzureFunction, Context } from "@azure/functions";
import { ExceptionWrap } from "../utils/Exception";
import { getBlobServiceClient } from "../utils/storage";

const activityFunction: AzureFunction = async function (
  context: Context,
  url: string
): Promise<string> {
  try {
    const blobServiceClient = getBlobServiceClient();
  } catch (exception) {
    if (exception instanceof ExceptionWrap) {
    }
  }
};

export default activityFunction;
