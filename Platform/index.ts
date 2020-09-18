import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { createId } from "../utils/storage";
import config from "../config";
import { ExceptionWrap } from "../utils/Exception";

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  try {
    const { site, platform } = req.query;

    const id = createId(site);
    const manifest = req.body; // pass body as manifest

    context.bindings.queueItem = id;
    context.bindings.manifest = manifest;

    context.res = {
      body: {
        id,
      },
    };

    context.done(undefined, {
      manifest,
    });
  } catch (exception) {
    context.log(exception);
    if (exception instanceof ExceptionWrap) {
      context.res = {
        body: {
          message: Exception.Message[exception.type],
        },
      };
    } else {
      context.res = {
        status: 400,
        body: {
          message: "there was an issue",
          exception,
        },
      };
    }
  }
};

export default httpTrigger;

const a = {
  queueName: "platform-queue",
  connection: "pwabuilderstore",
  name: "manifest",
  type: "queue",
  direction: "out",
};
