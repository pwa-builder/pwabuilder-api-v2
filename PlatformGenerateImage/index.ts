import { AzureFunction, Context } from "@azure/functions";
import { BlockBlobUploadResponse } from "@azure/storage-blob";
import * as Jimp from "jimp/es";
import atob from "../utils/base64/atob";
import { ImageKey, ImageProperties } from "../utils/platform";
import { getBlobServiceClient } from "../utils/storage";

export interface PlatformGenerateImageOutput {
  uploadRes?: BlockBlobUploadResponse;
  success: boolean;
  error?: Error;
}

export interface PlatformGenerateImageInput extends ImageProperties {
  containerId: string;
  getImageUrl?: string;
  biggestImageBlobName?: string; //${width}x${height}${"-" + purpose?}
  category: string; // "icons" | "screenshots"
  type?: string; // Jimp.MIME_<type>
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

    const imageBase64 = await baseImage.getBase64Async(Jimp.MIME_PNG);
    const uploadRes = await containerClient.uploadBlockBlob(
      key,
      imageBase64,
      imageBase64.length,
      {
        tags: {
          category: imageData.category,
          size: imageData.size,
          type: imageData.type || baseImage.getMIME(),
          purpose: imageData.purpose || "none",
          generated: "true",
        },
        metadata: {
          category: imageData.category,
          size: imageData.size,
          type: imageData.type || baseImage.getMIME(),
          purpose: imageData.purpose || "none",
          generated: "true",
        },
      }
    );

    return {
      uploadRes: uploadRes.response,
      success: uploadRes.response.errorCode ? false : true,
    };
  } catch (e) {
    error = e;
  }

  return {
    success: false,
    error,
  };
};

export default activityFunction;
