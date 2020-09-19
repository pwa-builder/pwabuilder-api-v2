import { promises as fs } from "fs";

import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import ExceptionOf, {
  ExceptionMessage,
  ExceptionType,
} from "../utils/Exception";
import { getBlobServiceClient } from "../utils/storage";

const httpTrigger: AzureFunction = async function (
  context: Context,
  id: string
): Promise<void> {
  // TODO queue trigger, figure out the
  // context.bindings.storeRead
  // context.bindings.storeWrite
  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(id);
  const manifestBlobClient = containerClient.getBlobClient("manifest.json");
  const manifestBlobContentResponse = await manifestBlobClient
    .getBlockBlobClient()
    .download();

  if (manifestBlobContentResponse.errorCode) {
    throw ExceptionOf(
      ExceptionType.BLOB_STORAGE_FAILURE,
      new Error("failure to read blob storage for platform queue")
    );
  }

  // TODO parse the json
  manifestBlobContentResponse.readableStreamBody;

  context.log("\n\n\nplatform queue\n\n\n");
  context.log(context.bindings);
  context.log("Queue Item: " + context.bindings.queueItem);
  context.log("Queue Item: " + id);
  context.log("Store Read: " + context.bindings.storeRead);
  context.log("Store Write: " + context.bindings.storeWrite);
  // context.bindings.storeWrite = context.bindings.storeRead;
};

export default httpTrigger;
