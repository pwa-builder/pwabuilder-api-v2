import * as crypto from "crypto";
import {
  BlobServiceClient,
  ContainerCreateIfNotExistsResponse,
} from "@azure/storage-blob";
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
): Promise<ContainerCreateIfNotExistsResponse> {
  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(id);
  const createRes = await containerClient.createIfNotExists({
    metadata: {
      id,
      isSiteData: "true",
    },
  });

  if (
    !createRes.succeeded &&
    createRes.errorCode !== "ContainerAlreadyExists"
  ) {
    throw ExceptionOf(
      ExceptionType.BLOB_STORAGE_FAILURE,
      new Error(`azure blob storage error code: ${createRes.errorCode}`)
    );
  }
  return createRes;
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
    manifestStr.length,
    {
      blobHTTPHeaders: {
        blobContentType: "application/manifest+json",
      },
    }
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
): Promise<Buffer> {
  const serviceClient = blobServiceClient || getBlobServiceClient();
  const containerClient = serviceClient.getContainerClient(containerId);
  const manifestClient = containerClient.getBlobClient("manifest.json");

  return manifestClient.downloadToBuffer();
}

export async function getManifestJson(
  containerId: string,
  blobServiceClient?: BlobServiceClient
): Promise<Manifest> {
  return getManifest(containerId, blobServiceClient)
    .then((buffer) => buffer.toString("utf8"))
    .then((manifestStr) => JSON.parse(manifestStr)) as Promise<Manifest>;
}
