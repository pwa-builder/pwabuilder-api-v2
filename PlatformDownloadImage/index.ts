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
import { AzureFunction, Context } from "@azure/functions";
import * as Jimp from "jimp";
import ExceptionOf, { ExceptionType, ExceptionWrap } from "../utils/Exception";
import { getBlobServiceClient } from "../utils/storage";
import { BlobUploadCommonResponse } from "@azure/storage-blob";
import { ImageKey } from "../utils/platform";
import { createImageStreamFromJimp } from "../utils/icons";
import {
  IconManifestImageResource,
  ScreenshotManifestImageResource,
} from "../utils/interfaces";

export interface PlatformDownloadImageInput
  extends IconManifestImageResource,
    ScreenshotManifestImageResource {
  containerId: string;
  category: string;
  siteUrl: string;
  imageUrl: string;
}

export interface PlatformDownloadImageOutput {
  blobRes?: BlobUploadCommonResponse;
  success: boolean;
  error?: ExceptionWrap;
  err?: Error;
}

const activityFunction: AzureFunction = async function (
  context: Context,
  imageData: PlatformDownloadImageInput
): Promise<PlatformDownloadImageOutput> {
  let error;
  try {
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(
      imageData.containerId
    );
    const category = imageData.category || "other";
    const purpose = imageData.purpose || "none";
    const image = await Jimp.read(imageData.imageUrl);
    const width = image.getWidth();
    const height = image.getHeight();
    const type = imageData.type || image.getMIME();
    const sizes = imageData.sizes || `${width}x${height}`;

    const {
      stream: imageStream,
      buffer: imageBuffer,
    } = await createImageStreamFromJimp(image);

    const name = path.parse(imageData.imageUrl).base;
    const imageKey = ImageKey({
      width,
      height,
      purpose,
      category,
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
          category,
          sizes,
          type,
          purpose,
          originalUrl: imageData.imageUrl,
        },
        tags: {
          category,
          sizes,
          type,
          purpose,
          originalUrl: imageData.imageUrl,
        },
      }
    );
    return {
      blobRes: uploadResponse,
      success: true,
    };
  } catch (exception) {
    context.log(exception);
    error = ExceptionOf(ExceptionType.BLOB_STORAGE_FAILURE_IMAGE, exception);
  }

  return {
    success: false,
    error: error,
  };
};

export default activityFunction;
