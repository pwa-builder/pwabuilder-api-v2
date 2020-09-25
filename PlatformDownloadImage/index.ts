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
import ExceptionOf, { ExceptionType, ExceptionWrap } from "../utils/Exception";
import { getBlobServiceClient } from "../utils/storage";
import atob from "../utils/base64/atob";
import * as path from "path";
import fetch from "node-fetch";
import { BlockBlobUploadResponse } from "@azure/storage-blob";

interface PlatformImageInput {
  containerId: string;
  siteUrl: string;
  imageUrl: string;
  tags: Array<string>;
}

interface PlatformImageTaskOutput {
  blobRes?: BlockBlobUploadResponse;
  success: boolean;
  error?: ExceptionWrap;
}

const activityFunction: AzureFunction = async function (
  context: Context,
  imageData: PlatformImageInput
): Promise<PlatformImageTaskOutput> {
  let error;
  try {
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(
      imageData.containerId
    );
    const [category, sizes, type, ...rest] = imageData.tags;
    const fileName = path.parse(imageData.imageUrl).base;

    const imageResponse = await fetch(imageData.imageUrl);
    const imageBase64 = atob(imageResponse.body.read());

    const uploadResponse = await containerClient.uploadBlockBlob(
      fileName,
      imageBase64,
      imageBase64.length,
      {
        metadata: {
          category,
          sizes,
          type,
        },
        tags: {
          category,
          sizes,
          type,
        },
      }
    );
    return {
      blobRes: uploadResponse.response,
      success: true,
    };
  } catch (exception) {
    context.log(error);
    error = ExceptionOf(ExceptionType.BLOB_STORAGE_FAILURE_IMAGE, exception);
  }

  return {
    success: false,
    error: error,
  };
};

export default activityFunction;
