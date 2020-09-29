import * as crypto from "crypto";
import * as path from "path";
import { BlobServiceClient } from "@azure/storage-blob";
import ExceptionOf, { ExceptionType } from "../Exception";
import { Context } from "@azure/functions";
import { Manifest, ManifestInfo } from "../interfaces";

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
  const createRes = await containerClient.createIfNotExists({
    metadata: {
      id,
      isSiteData: "true",
    },
  });

  if (createRes.errorCode !== "ContainerAlreadyExists") {
    throw ExceptionOf(
      ExceptionType.BLOB_STORAGE_FAILURE,
      new Error(`azure blob storage error code: ${createRes.errorCode}`)
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
  const connectionString = process.env.AzureWebJobsStorage;

  if (connectionString) {
    return BlobServiceClient.fromConnectionString(connectionString);
  } else {
    throw new Error(
      "Connection string for AzureWebJobsStorage could not be found"
    );
  }
}

export async function getManifest(
  containerId: string,
  blobServiceClient?: BlobServiceClient
): Promise<Manifest> {
  const serviceClient = blobServiceClient || getBlobServiceClient();
  const containerClient = serviceClient.getContainerClient(containerId);
  const manifestClient = containerClient.getBlobClient("manifest.json");

  return manifestClient
    .downloadToBuffer()
    .then((buffer) => buffer.toString("utf8"))
    .then((manifestStr) => JSON.parse(manifestStr)) as Promise<Manifest>;
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
