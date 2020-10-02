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
import * as Jimp from "jimp";
import ExceptionOf, { ExceptionType, ExceptionWrap } from "../utils/Exception";
import { getBlobServiceClient } from "../utils/storage";
import { BlockBlobUploadResponse } from "@azure/storage-blob";
import { ImageKey } from "../utils/platform";

export interface PlatformDownloadImageInput {
  containerId: string;
  category: string;
  siteUrl: string;
  imageUrl: string;
  tags: Array<string>;
}

export interface PlatformDownloadImageOutput {
  blobRes?: BlockBlobUploadResponse;
  success: boolean;
  error?: ExceptionWrap;
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
    const [category, sizes, type, ...rest] = imageData.tags;
    const purpose = rest[0] || "none";
    const image = await Jimp.read(imageData.imageUrl);
    const width = image.getWidth();
    const height = image.getHeight();
    const imageBase64 = await image.getBase64Async(image.getMIME());
    const imageKey =
      ImageKey({
        width,
        height,
        purpose,
        category,
      }) +
      "." +
      image.getExtension();
    const blobClient = await containerClient.getBlockBlobClient(imageKey);
    const uploadResponse = await blobClient.upload(
      imageBase64,
      imageBase64.length,
      {
        blobHTTPHeaders: {
          blobContentType: image.getMIME(),
          blobContentEncoding: "base64",
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
