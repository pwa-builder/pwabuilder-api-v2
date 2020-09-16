import * as crypto from "crypto";
import { DefaultAzureCredential } from "@azure/identity";
import { QueueServiceClient } from "@azure/storage-queue";

export interface MessageQueueConfig {
  storageAccount: string;
  queueName: string;
}

export function createId(siteUrl: string): string {
  return crypto.createHmac("sha512", siteUrl).digest("hex");
}

export async function createContainer(id: string): Promise<void> {}

/*
  Send message to the queue, responds with the message id.
*/
export async function messageQueue(
  id: string,
  manifest: Manifest.w3c,
  { storageAccount, queueName }: MessageQueueConfig
): Promise<string> {
  const client = new QueueServiceClient(
    `${storageAccount}.queue.core.windows.net/`,
    new DefaultAzureCredential()
  );
  const response = await client.getQueueClient(queueName).sendMessage(
    JSON.stringify({
      id,
      manifest,
    }),
    {
      requestId: id,
    }
  );

  return response.clientRequestId;
}
