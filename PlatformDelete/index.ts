import { AzureFunction, Context } from "@azure/functions";
import { getBlobServiceClient } from "../utils/storage";

const timerTrigger: AzureFunction = async function (
  context: Context,
  myTimer: any
): Promise<void> {\
  if (myTimer.isPastDue) {
    const blobServiceClient = getBlobServiceClient();
    const promiseList = [];
    for await (const container of blobServiceClient.listContainers()) {
      if (
        new Date(container.properties.lastModified).getTime() <
          new Date(myTimer.Last).getTime() &&
        container.metadata["isSiteData"]
      ) {
        promiseList.push(blobServiceClient.deleteContainer(container.name));
      }
    }

    // LTS 12
    if ("allSettled" in Promise) {
      return (<any>Promise).allSettled(promiseList);
    } else {
      // LTS 10

      for (const promise of promiseList) {
        try {
          await promise;
        } catch (e) {
          /* Ignored */
        }
      }
    }
  }
};

export default timerTrigger;
