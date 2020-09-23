import * as df from "durable-functions";
import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { createContainer, addManifestToContainer } from "../utils/storage";
import { createId } from "../utils/storage";
import { ExceptionMessage, ExceptionWrap } from "../utils/Exception";

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  let id;
  try {
    const { site, platform } = req.query;

    id = createId(site);
    // context.log("id: " + id);
    const manifest = req.body; // pass body as manifest
    // context.log(manifest);

    const client = df.getClient(context);

    // build path - TODO
    if (context.bindings.id && platform) {
      // df.startNew();
      return;
    }

    // prepare path
    await createContainer(id, context);
    await addManifestToContainer(id, manifest, context);
    await client.startNew("PlatformOrchestrator", id);

    context.res = {
      body: {
        id,
      },
    };
  } catch (exception) {
    context.log(exception);
    if (exception instanceof ExceptionWrap) {
      context.res = {
        body: {
          message: ExceptionMessage[exception.type],
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
