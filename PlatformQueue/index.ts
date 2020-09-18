import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { Manifest } from "../utils/getManifestFromFile";

const httpTrigger: AzureFunction = async function (
  context: Context,
  manifest: Manifest
): Promise<void> {
  context.log("\n\n\nplatform queue\n\n\n");
  context.log(arguments);
  context.log(context.bindings);
  context.log("Queue Item: " + context.bindings.queueItem);
  context.log("Manifest Additional Input: " + manifest);
  context.log("Manifest Binding: " + context.bindings.manifest);
  context.log("Store Read: " + context.bindings.storeRead);
  context.log("Store Write: " + context.bindings.storeWrite);
  context.bindings.storeWrite = context.bindings.storeRead;
  context.done();
  // context.bindings.queueItem;
  // context.bindings.storeRead;
  // context.bindings.storeWrite;
};

export default httpTrigger;
