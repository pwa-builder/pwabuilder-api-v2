import { BlobItem } from '@azure/storage-blob';
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

import * as df from 'durable-functions';
import {
  IOrchestrationFunctionContext,
  Task,
} from 'durable-functions/lib/src/classes';
import { MIME_PNG } from 'jimp';
import { PlatformGenerateImageInput } from '../PlatformGenerateImage';
import { ReadContainerInput, ReadContainerOutput } from '../ReadContainer';
import { isBigger } from '../utils/icons';
import {
  PlatformGenerateZipInput,
  PlatformGenerateZipOutput,
  PlatformId,
  requiredPlatformImages,
} from '../utils/platform';
import { getTagMetadataProperties } from '../utils/storage';

export interface PlatformBuildOrchestratorInput {
  containerId: string;
  siteUrl: string;
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
  const readContainerTask = yield context.df.callActivity('ReadContainer', {
    containerId: input.containerId,
  } as ReadContainerInput);

  const container = readContainerTask as ReadContainerOutput;

  // Generate Missing Images
  const missingImages: Array<Task> = [];
  let largestIcon: string | undefined;

  const imagesInContainerMap = new Map<string, BlobItem>();
  for (let i = 0; i < container.contents.length; i++) {
    const entry = container.contents[i];
    const metadata = getTagMetadataProperties(entry.metadata ?? {});

    if (!largestIcon || !isBigger(largestIcon, metadata.actualSize)) {
      largestIcon = metadata.actualSize;
    }

    imagesInContainerMap.set(metadata.actualSize, entry);

    if (metadata.sizes.indexOf(' ') !== -1) {
      metadata.sizes.split(' ').forEach(size => {
        if (!largestIcon || !isBigger(largestIcon, size)) {
          largestIcon = metadata.sizes;
        }

        imagesInContainerMap.set(size, entry);
      });
    }

    imagesInContainerMap.set(metadata.sizes, entry);
  }

  for (const [key, properties] of requiredPlatformImages(
    input.platform
  ).entries()) {
    // check if the image exists or is uploaded
    if (!imagesInContainerMap.has(key)) {
      missingImages.push(
        context.df.callActivity('PlatformGenerateImage', {
          ...properties,
          containerId: input.containerId,
          biggestImageBlobName: largestIcon,
          type: MIME_PNG,
        } as PlatformGenerateImageInput)
      );
    }
  }

  if (missingImages.length > 0) {
    yield context.df.Task.all(missingImages);
  }

  // Create zip and get zip link
  const zipDetails: PlatformGenerateZipOutput = yield context.df.callActivity(
    `PlatformGenerateZip-${input.platform}`,
    {
      ...input,
    } as PlatformGenerateZipInput
  );

  return zipDetails;
});

export default orchestrator;
