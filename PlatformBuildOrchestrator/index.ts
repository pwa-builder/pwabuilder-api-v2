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
import { ReadContainerInput, ReadContainerOutput } from "../ReadContainer";
import { PlatformId, requiredPlatformImages } from "../utils/platform";
import { getBlobServiceClient } from "../utils/storage";

interface PlatformBuilderOrchestratorInput {
  containerId: string;
  platform: PlatformId;
}

const orchestrator = df.orchestrator(function* (context) {
  const outputs = [];
  /*
    1. validate step (skipped atm, not 100% sure if necessary not CLI).
    2. generate missing images
    3. folders and etc.
    4. platform specific tasks
    5. package apps in zips
    6. send back url to zip file
  */
  const input = context.df.getInput() as PlatformBuilderOrchestratorInput;
  // Read container contents
  const readContainerTask = yield context.df.callActivity("ReadContainer", {
    containerId: input.containerId,
  } as ReadContainerInput);
  const container = readContainerTask.result as ReadContainerOutput;

  // Generate Missing Images
  const missingImages = [];
  const imagesInContainerMap = new Map(
    container.contents.map((entry) => {
      return [entry.name, entry];
    })
  );
  const requiredImageMap = requiredPlatformImages(input.platform);
  for (const [key, properties] of requiredImageMap.entries()) {
  }

  yield context.df.Task.all(missingImages);

  // Create Zip

  // Get Zip Link

  return outputs;
});

export default orchestrator;
