import * as crypto from "crypto";
import * as path from "path";
import { BlobServiceClient } from "@azure/storage-blob";
import ExceptionOf, { ExceptionType } from "../Exception";
import { Context } from "@azure/functions";
import { Manifest } from "../interfaces";

export interface MessageQueueConfig {
  storageAccount: string;
  queueName: string;
}

export function createId(siteUrl: string): string {
  return crypto.createHmac("md5", siteUrl).digest("hex");
}

export async function createContainer(
  id: string,
  context?: Context
): Promise<void> {
  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(id);
  const deleteRes = await containerClient.deleteIfExists();

  if (deleteRes.errorCode && deleteRes.errorCode !== "ContainerNotFound") {
    context.log(deleteRes);
    throw ExceptionOf(
      ExceptionType.BLOB_STORAGE_FAILURE,
      new Error(`azure blob storage error code: ${deleteRes.errorCode}`)
    );
  }

  const createRes = await containerClient.create({
    metadata: {
      id,
      isSiteData: "true",
    },
  });
  if (createRes.errorCode) {
    throw ExceptionOf(
      ExceptionType.BLOB_STORAGE_FAILURE,
      new Error(`azure blob storage error code: ${deleteRes.errorCode}`)
    );
  }
}

export async function addManifestToContainer(
  id: string,
  manifest: Manifest,
  context?: Context
) {
  const manifestStr = JSON.stringify(manifest);

  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(id);
  const manifestBlobClient = containerClient.getBlockBlobClient(
    "manifest.json"
  );
  const response = await manifestBlobClient.upload(
    manifestStr,
    manifestStr.length
  );
  if (response.errorCode) {
    throw ExceptionOf(
      ExceptionType.BLOB_STORAGE_FAILURE,
      new Error("failed to upload blob with error code: " + response.errorCode)
    );
  }
}

export function getBlobServiceClient(): BlobServiceClient {
  return BlobServiceClient.fromConnectionString(
    process.env.AzureWebJobsStorage
  );
}

export function addImagesToContainer(
  id: string,
  manifest: Manifest,
  context?: Context
) {
  const containerClient = getBlobServiceClient().getContainerClient(id);

  for (const icon of manifest.icons) {
    const parsedUrl = path.parse(icon);

    containerClient.getBlobClient(icon);
  }

  for (const screenshot of manifest.screenshots) {
  }
}
