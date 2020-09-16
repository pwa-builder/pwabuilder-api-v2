import { AzureFunction, Context, HttpRequest } from "@azure/functions";

const httpTrigger: AzureFunction = async function (
  context: Context
): Promise<void> {
  context.log("Queue Item: " + context.bindings.queueItem);
  context.log("Store Read: " + context.bindings.storeRead);
  context.log("Store Write: " + context.bindings.storeWrite);
  context.bindings.storeWrite = context.bindings.storeRead;
  context.done();
  // context.bindings.queueItem;
  // context.bindings.storeRead;
  // context.bindings.storeWrite;
};

export default httpTrigger;
