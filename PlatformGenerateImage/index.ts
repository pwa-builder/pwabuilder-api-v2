﻿import { AzureFunction, Context } from "@azure/functions";
import { BlobUploadCommonResponse } from "@azure/storage-blob";
import * as Jimp from "jimp";
import { createImageStreamFromJimp } from "../utils/icons";
import { ImageKey, ImageProperties } from "../utils/platform";
import {
  getBlobServiceClient,
  setTagMetadataProperties,
} from "../utils/storage";

export interface PlatformGenerateImageOutput {
  uploadRes?: BlobUploadCommonResponse;
  success: boolean;
  error?: {
    name: string;
    message: string;
    stack: string;
  };
}

export interface PlatformGenerateImageInput extends ImageProperties {
  containerId: string;
  getImageUrl?: string;
  biggestImageBlobName?: string; //${width}x${height}${"-" + purpose?}
  category: string; // "icons" | "screenshots"
}

const activityFunction: AzureFunction = async function (
  context: Context,
  imageData: PlatformGenerateImageInput
): Promise<PlatformGenerateImageOutput> {
  let error;
  try {
    const containerClient = getBlobServiceClient().getContainerClient(
      imageData.containerId
    );

    // Check duplicate, if duplicate, then return early
    const key = ImageKey(imageData);
    const blobClient = containerClient.getBlockBlobClient(key);

    // read from url source or from from blob (base64 encoded)
    let baseImage: Jimp;
    if (imageData.getImageUrl) {
      baseImage = await Jimp.read(imageData.getImageUrl);
    } else if (imageData.biggestImageBlobName) {
      const biggestBlobClient = containerClient.getBlobClient(
        imageData.biggestImageBlobName
      );
      const biggestImageBlob = await biggestBlobClient.downloadToBuffer();
      baseImage = await Jimp.read(biggestImageBlob);
    } else {
      throw Error("invalid use of platform");
    }
    const { width, height } = imageData;
    baseImage.resize(width, height);

    const size =
      imageData.size || `${baseImage.getWidth()}x${baseImage.getHeight()}`;
    const tagMetadata = setTagMetadataProperties({
      category: imageData.category,
      actualSize: size,
      sizes: size,
      type: imageData.type || baseImage.getMIME(),
      purpose: imageData.purpose || "none",
      generated: "true",
    });

    const {
      stream: imageStream,
      buffer: imageBuffer,
    } = await createImageStreamFromJimp(baseImage);

    const uploadRes = await blobClient.uploadStream(
      imageStream,
      imageBuffer.byteLength,
      undefined,
      {
        blobHTTPHeaders: {
          blobContentType: baseImage.getMIME(),
          blobContentEncoding: "base64",
        },
        tags: tagMetadata,
        metadata: tagMetadata,
      }
    );

    return {
      uploadRes: uploadRes,
      success: uploadRes.errorCode ? false : true,
    };
  } catch (e) {
    error = {
      name: e.name,
      message: e.message,
      stack: e.stack,
    };
  }

  return {
    success: false,
    error,
  };
};

export default activityFunction;
