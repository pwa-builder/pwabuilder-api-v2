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
import { getBlobServiceClient } from "../utils/storage";

export interface ReadContainerInput {
  containerId: string;
}

export interface ReadContainerOutput {
  contents: Array<BlobItem>;
  success: boolean;
  error?: {
    name: string;
    message: string;
    stack: string;
  };
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
      // includeTags: true, // unsupported in rest api... still in the typescript
      includeMetadata: true,
    })) {
      output.contents.push(blob);
    }

    output.success = true;
  } catch (e) {
    context.log.error(e);
    output.error = {
      name: e.name,
      message: e.message,
      stack: e.stack,
    };
  }

  return output;
};

export default activityFunction;
