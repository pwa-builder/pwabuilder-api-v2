import * as df from "durable-functions";
import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { createContainer, addManifestToContainer } from "../utils/storage";
import { createId } from "../utils/storage";
import { ExceptionMessage, ExceptionWrap } from "../utils/Exception";

/*
  Platform HTTP Trigger
    Route: <url>/platform/{id: string?}?site={site: string}platform={PlatformEnum: string?}
    - id: if passed with the platform will try to invoke the platform build path.
    - site: the url, used to create the id.
    - platform: determines what kind of app to build

  This function will all upon
*/
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
    if (req.params.containerId && platform) {
      // df.startNew();
      return;
    }

    // prepare path
    await createContainer(id, context);
    await addManifestToContainer(id, manifest, context);

    // since id is passed, can ignore here.
    await client.startNew("PlatformOrchestrator", id);
    const statusQueryResponse = client.createCheckStatusResponse(
      context.bindingData.req,
      id
    );

    context.res = {
      body: {
        id,
        clientStatusQueryUrl: statusQueryResponse.body["statusQueryGetUri"],
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
