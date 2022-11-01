import * as crypto from "crypto";
import {
  BlobServiceClient,
  ContainerCreateIfNotExistsResponse,
} from "@azure/storage-blob";

import ExceptionOf, { ExceptionType } from "./Exception";
import { Context } from "@azure/functions/Interfaces";
import { Manifest, Categories } from "./interfaces";
import { W3CPurpose, MimeType, WidthByHeight, SpaceSeparatedList } from "./w3c";

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
    access: "blob",
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

export interface TagMetaDataMap {
  category: Categories | string;
  actualSize: WidthByHeight;
  sizes: WidthByHeight | SpaceSeparatedList;
  originalUrl: string;
  type: MimeType;
  purpose: W3CPurpose;
  generated: "true" | "false";
}

// These work the same... drives me insane why there's different declarations.
type MapGestalt =
  | Record<string, string>
  | {
      [name: string]: string;
    };

export function getTagMetadataProperties(gestalt: MapGestalt): TagMetaDataMap {
  return {
    category: gestalt.category ?? "unset",
    actualSize: gestalt.actualSize ?? "unset",
    sizes: gestalt.sizes ?? "unset",
    originalUrl: gestalt.originalUrl ?? "unset",
    type: gestalt.type ?? "unset",
    purpose: gestalt.purpose ?? "unset",
    generated: gestalt.generated ? "true" : "false",
  };
}

// The client library does not accept undefined or null properties in the metadata fields, to keep consistent only add entries if defined.
export function setTagMetadataProperties(
  tagMetaData: Partial<TagMetaDataMap>
): MapGestalt {
  const output: any = {};
  if (tagMetaData.category) {
    output.category = tagMetaData.category;
  }

  if (tagMetaData.actualSize) {
    output.actualSize = tagMetaData.actualSize;
  }

  if (tagMetaData.sizes) {
    output.sizes = tagMetaData.sizes;
  }

  if (tagMetaData.type) {
    output.type = tagMetaData.type;
  }

  if (tagMetaData.purpose) {
    output.purpose = tagMetaData.purpose;
  }

  if (tagMetaData.generated) {
    output.generated = tagMetaData.generated;
  }

  return output;
}
