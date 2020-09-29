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
import * as JSZip from "jszip";
import {
  PlatformGenerateZipInput,
  PlatformGenerateZipOutput,
} from "../utils/platform";

const activityFunction: AzureFunction = async function (
  context: Context,
  input: PlatformGenerateZipInput
): Promise<PlatformGenerateZipOutput> {
  /*
    Zip: If image has generated metadata/tag name with ${name}-generated
  */
  // const zip = new JSZip();
  return {
    link: "testing",
  };
};

export default activityFunction;
