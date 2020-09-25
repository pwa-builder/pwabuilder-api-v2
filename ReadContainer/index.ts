/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an orchestrator function.
 *
 * Before running this sample, please:
 * - create a Durable orchestration function
 * - create a Durable HTTP starter function
 * - run 'npm install durable-functions' from the wwwroot folder of your
 *   function app in Kudu
 */

import { AzureFunction, Context } from "@azure/functions";
import { BlobItem } from "@azure/storage-blob";
import ExceptionOf, { ExceptionType, ExceptionWrap } from "../utils/Exception";
import { getBlobServiceClient } from "../utils/storage";

interface ReadContainerInput {
  containerId: string;
}

export interface ReadContainerOutput {
  contents: Array<BlobItem>;
  success: boolean;
  error?: Error;
}

const activityFunction: AzureFunction = async function (
  context: Context,
  input: ReadContainerInput
): Promise<ReadContainerOutput> {
  const output: ReadContainerOutput = {
    contents: [],
    success: false,
  };

  try {
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(
      input.containerId
    );

    for await (const blob of containerClient.listBlobsFlat({
      includeTags: true,
      includeMetadata: true,
    })) {
      output.contents.push(blob);
    }

    output.success = true;
  } catch (e) {
    context.log(e);
    output.error = ExceptionOf(ExceptionType.BLOB_READ_FAILURE, e);
  }

  return output;
};

export default activityFunction;
