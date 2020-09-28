import { AzureFunction, Context } from "@azure/functions";
import { BlockBlobUploadResponse } from "@azure/storage-blob";
import * as Jimp from "jimp/es";
import atob from "../utils/base64/atob";
import { ImageKey } from "../utils/platform";
import { getBlobServiceClient } from "../utils/storage";

export interface PlatformGenerateImageOutput {
  uploadRes?: BlockBlobUploadResponse;
  success: boolean;
  error?: Error;
}

export interface PlatformGenerateImageInput {
  containerId: string;
  imageUrl: string;
  imageBlobName: string;
  size: string; // 512x512
  category?: string; // "icons" | "screenshots"
  purpose?: string;
  format: string;
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
    const image = await Jimp.read(imageData.imageUrl);
    const [widthStr, heightStr] = imageData.size.split("x");
    const width = Number(widthStr);
    const height = Number(heightStr);
    image.resize(width, height);

    const imageBase64 = await image.getBase64Async(Jimp.MIME_PNG);
    const uploadRes = await containerClient.uploadBlockBlob(
      ImageKey({
        width,
        height,
        purpose: imageData.purpose,
      }),
      imageBase64,
      imageBase64.length,
      {
        tags: {
          category: imageData.category,
          size: imageData.size,
          type: imageData.format,
          purpose: imageData.purpose,
          generated: "true",
        },
        metadata: {
          category: imageData.category,
          size: imageData.size,
          type: imageData.format,
          purpose: imageData.purpose,
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
