/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an HTTP starter function.
 *
 * Before running this sample, please:
 * - create a Durable activity function (default name is "Hello")
 * - create a Durable HTTP starter function
 * - run 'npm install durable-functions' from the wwwroot folder of your
 *    function app in Kudu
 *
 * This durable function is designed to build the actual application.
 */

import * as df from "durable-functions";
import { IOrchestrationFunctionContext } from "durable-functions/lib/src/classes";
import { MIME_PNG } from "jimp/es";
import { PlatformGenerateImageInput } from "../PlatformGenerateImage";
import { ReadContainerInput, ReadContainerOutput } from "../ReadContainer";
import { isBigger } from "../utils/icons";
import {
  PlatformGenerateZipInput,
  PlatformGenerateZipOutput,
  PlatformId,
  requiredPlatformImages,
} from "../utils/platform";

export interface PlatformBuildOrchestratorInput {
  containerId: string;
  platform: PlatformId;
}

const orchestrator = df.orchestrator(function* (
  context: IOrchestrationFunctionContext
): Generator<any, any, any> {
  const outputs = [];
  /*
    1. validate step (skipped atm, not 100% sure if necessary not CLI).
    2. generate missing images
    3. folders and etc.
    4. platform specific tasks
    5. package apps in zips
    6. send back url to zip file
  */
  const input = context.df.getInput() as PlatformBuildOrchestratorInput;
  // Read container contents
  const readContainerTask = yield context.df.callActivity("ReadContainer", {
    containerId: input.containerId,
  } as ReadContainerInput);
  const container = readContainerTask.result as ReadContainerOutput;

  // Generate Missing Images
  const missingImages = [];
  let largestImage: string = "";
  const imagesInContainerMap = new Map(
    container.contents.map((entry) => {
      if (!largestImage || !isBigger(largestImage, entry.name)) {
        largestImage = entry.name;
      }

      return [entry.name, entry];
    })
  );

  for (const [key, properties] of requiredPlatformImages(
    input.platform
  ).entries()) {
    // check if the image exists or is uploaded
    if (!imagesInContainerMap.has(key)) {
      missingImages.push(
        context.df.callActivity("PlatformGenerateImage", {
          ...properties,
          containerId: input.containerId,
          getImageUrl: undefined,
          biggestImageBlobName: largestImage,
          type: MIME_PNG,
        } as PlatformGenerateImageInput)
      );
    }
  }
  yield context.df.Task.all(missingImages);

  // Create zip and get zip link
  const zipDetails: PlatformGenerateZipOutput = yield context.df.callActivity(
    `PlatformGenerateZip-${input.platform}`,
    {
      ...input,
    } as PlatformGenerateZipInput
  );

  return zipDetails.link;
});

export default orchestrator;
