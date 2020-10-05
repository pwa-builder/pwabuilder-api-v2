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

import * as path from "path";
import * as url from "url";
import { AzureFunction, Context } from "@azure/functions";
import * as Jimp from "jimp";
import ExceptionOf, { ExceptionType, ExceptionWrap } from "../utils/Exception";
import { getBlobServiceClient } from "../utils/storage";
import { BlobUploadCommonResponse } from "@azure/storage-blob";
import { ImageKey } from "../utils/platform";
import { createImageStreamFromJimp } from "../utils/icons";
import {
  Manifest,
  IconManifestImageResource,
  ScreenshotManifestImageResource,
} from "../utils/interfaces";

export interface PlatformDownloadImageBulkInput {
  containerId: string;
  category: "icons" | "screenshots";
  manifest: Manifest;
  siteUrl: string;
}

export interface PlatformDownloadImageBulkOutput {
  blobResponses?: Array<BlobUploadCommonResponse>;
  success: boolean;
  error?: ExceptionWrap;
  err?: Error;
}

const activityFunction: AzureFunction = async function (
  context: Context,
  input: PlatformDownloadImageBulkInput
): Promise<PlatformDownloadImageBulkOutput> {
  let error;
  try {
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(
      input.containerId
    );

    const responses: Array<BlobUploadCommonResponse> = [];

    // TODO - Loop here
    for (const manifestImageEntry of input.manifest[input.category]) {
      const { src, sizes, type } = manifestImageEntry;
      const imageUrl = new url.URL(src, input.siteUrl).toString();
      context.log(imageUrl);

      let purpose = manifestImageEntry.purpose || "none";
      const image = await Jimp.read(imageUrl);
      const width = image.getWidth();
      const height = image.getHeight();
      const {
        stream: imageStream,
        buffer: imageBuffer,
      } = await createImageStreamFromJimp(image);

      const name = path.parse(imageUrl).base;
      const imageKey = ImageKey({
        width,
        height,
        purpose,
        category: input.category,
        name: name ? name : undefined,
      });
      const blobClient = await containerClient.getBlockBlobClient(imageKey);
      const uploadResponse = await blobClient.uploadStream(
        imageStream,
        imageBuffer.byteLength,
        undefined,
        {
          blobHTTPHeaders: {
            blobContentType: image.getMIME(),
          },
          metadata: {
            category: input.category,
            sizes,
            type,
            purpose,
            originalUrl: imageUrl,
          },
          tags: {
            category: input.category,
            sizes,
            type,
            purpose,
            originalUrl: imageUrl,
          },
        }
      );

      responses.push(uploadResponse);
    }

    context.log(responses);
    return {
      blobResponses: responses,
      success: true,
    };
  } catch (exception) {
    context.log("\n\n\nException thrown in download image");
    context.log(exception);
    error = ExceptionOf(ExceptionType.BLOB_STORAGE_FAILURE_IMAGE, exception);
  }

  return {
    success: false,
    error: error,
  };
};

export default activityFunction;
