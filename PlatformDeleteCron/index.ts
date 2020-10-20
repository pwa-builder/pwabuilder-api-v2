import { AzureFunction, Context } from "@azure/functions";
import { getBlobServiceClient } from "../utils/storage";

const timerTrigger: AzureFunction = async function (
  context: Context,
  myTimer: any
): Promise<void> {
  if (myTimer.isPastDue) {
    const blobServiceClient = getBlobServiceClient();
    for await (const container of blobServiceClient.listContainers()) {
      if (
        new Date(container.properties.lastModified).getTime() <
          new Date(myTimer.Last).getTime() &&
          container.metadata && 
        container.metadata["isSiteData"]
      ) {
        await blobServiceClient.deleteContainer(container.name);
      }
    }
  }
};

export default timerTrigger;
