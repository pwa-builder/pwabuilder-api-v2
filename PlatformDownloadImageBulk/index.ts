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
import * as Jimp from "jimp/es";
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

    for (const manifestImageEntry of input.manifest[input.category]) {
      const imageUrl = new url.URL(
        manifestImageEntry.src,
        input.siteUrl
      ).toString();
      const purpose = manifestImageEntry.purpose || "none";
      const image = await Jimp.read(imageUrl);
      const type = manifestImageEntry.type || image.getMIME();
      const width = image.getWidth();
      const height = image.getHeight();

      const sizes = manifestImageEntry.sizes || `${width}x${height}`;
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
      const metaDataAndTags = {};
      const uploadStreamOptions = {
        blobHTTPHeaders: {
          blobContentType: image.getMIME(),
        },
        metadata: {
          category: input.category,
          sizes: sizes || `${width}x${height}`,
          type,
          purpose,
          originalUrl: imageUrl,
        },
        tags: {
          category: input.category,
          sizes: sizes || `${width}x${height}`,
          type,
          purpose,
          originalUrl: imageUrl,
        },
      };

      const uploadResponse = await blobClient.uploadStream(
        imageStream,
        imageBuffer.byteLength,
        undefined,
        uploadStreamOptions
      );

      responses.push(uploadResponse);
    }

    return {
      blobResponses: responses,
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
