import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { createContainer } from "../utils/storage";
import { createId } from "../utils/storage";
import { ExceptionMessage, ExceptionWrap } from "../utils/Exception";

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  try {
    const { site, platform } = req.query;

    const id = createId(site);
    const manifest = req.body; // pass body as manifest

    await createContainer(id, manifest, context);

    context.bindings.queueItem = id;

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
