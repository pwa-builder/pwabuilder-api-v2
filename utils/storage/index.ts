import * as crypto from "crypto";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { Manifest } from "../getManifestFromFile";
import config from "../../config";
import ExceptionOf, { ExceptionMessage, ExceptionType } from "../Exception";
import { Context } from "@azure/functions";

export interface MessageQueueConfig {
  storageAccount: string;
  queueName: string;
}

export function createId(siteUrl: string): string {
  return crypto.createHmac("sha512", siteUrl).digest("hex");
}

export async function createContainer(
  id: string,
  manifest: Manifest,
  context?: Context
): Promise<void> {
  const credential = new DefaultAzureCredential();
  const blobServiceClient = new BlobServiceClient(
    `https://${config.azure.account_name}.blob.core.windows.net`,
    credential
  );

  const apiContainerClient = blobServiceClient.getContainerClient(
    "pwabuilder-api"
  );
  console.log(apiContainerClient);

  const containerClient = blobServiceClient.getContainerClient(id);
  context.log(containerClient);
  const deleteRes = await containerClient.deleteIfExists();

  if (deleteRes.errorCode) {
    throw ExceptionOf(
      ExceptionType.BLOB_STORAGE_FAILURE,
      new Error(`azure blob storage error code: ${deleteRes.errorCode}`)
    );
  }

  const createRes = await containerClient.create();
  if (createRes.errorCode) {
    throw ExceptionOf(
      ExceptionType.BLOB_STORAGE_FAILURE,
      new Error(`azure blob storage error code: ${deleteRes.errorCode}`)
    );
  }
}
