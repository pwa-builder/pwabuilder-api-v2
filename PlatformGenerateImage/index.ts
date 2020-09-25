import { AzureFunction, Context } from "@azure/functions";
import { BlockBlobUploadResponse } from "@azure/storage-blob";
import * as Jimp from "jimp/es";
import atob from "../utils/base64/atob";
import { getBlobServiceClient } from "../utils/storage";

interface PlatformGenerateImageResponse {
  uploadRes?: BlockBlobUploadResponse;
  success: boolean;
  error?: Error;
}

interface PlatformGenerateImageInput {
  containerId: string;
  imageUrl: string;
  imageBlobName: string;
  size: string; // 512x512
  category: string;
  format: string;
}

const activityFunction: AzureFunction = async function (
  context: Context,
  imageData: PlatformGenerateImageInput
): Promise<PlatformGenerateImageResponse> {
  let error;
  try {
    const containerClient = getBlobServiceClient().getContainerClient(
      imageData.containerId
    );
    const image = await Jimp.read(imageData.imageUrl);
    const [width, height] = imageData.size.split("x");
    image.resize(Number(width), Number(height));

    const imageBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
    const imageBase64 = atob(imageBuffer);
    const uploadRes = await containerClient.uploadBlockBlob(
      `${imageData.size}-generated`,
      imageBase64,
      imageBase64.length,
      {
        tags: {
          size: imageData.size,
          type: imageData.format,
          category: imageData.category,
          generated: "true",
        },
        metadata: {
          size: imageData.size,
          type: imageData.format,
          category: imageData.category,
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
