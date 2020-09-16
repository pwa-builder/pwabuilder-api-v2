import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import getManifest from "../utils/getManifest";
import { createId, messageQueue } from "../utils/storage";
import config from "../config";

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  try {
    const { siteUrl, platform } = req.query;
    const id = createId(siteUrl);
    const manifest = req.body; // pass body as manifest

    await messageQueue(id, manifest, {
      storageAccount: config.azure.account_name,
      queueName: "platform-queue",
    });

    context.res = {
      body: {
        id,
      },
    };
  } catch (exception) {}
};

export default httpTrigger;
