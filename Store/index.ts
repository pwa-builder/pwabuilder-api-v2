import { AzureFunction, Context, HttpRequest } from "@azure/functions";

const httpTrigger: AzureFunction = async function (
  context: Context
): Promise<void> {
  // context.bindings.queueItem;
  // context.bindings.storeRead;
  // context.bindings.storeWrite;
};

export default httpTrigger;
