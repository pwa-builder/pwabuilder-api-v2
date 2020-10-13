import * as df from "durable-functions";
import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { createContainer, addManifestToContainer } from "../utils/storage";
import { PlatformBuildOrchestratorInput } from "../PlatformBuildOrchestrator";
import { createId } from "../utils/storage";
import { ExceptionMessage, ExceptionWrap } from "../utils/Exception";

/*
  Platform HTTP Trigger
    Route: <url>/platform/?containerId={containerId: string?}&site={site: string}&platform={PlatformEnum: string?}
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
    const client = df.getClient(context);

    // build path
    if (req.query.containerId && req.query.platform) {
      const orchestratorId = await client.startNew(
        "PlatformBuildOrchestrator",
        undefined,
        {
          containerId: req.query.containerId,
          siteUrl: req.query.site,
          platform: req.query.platform,
        } as PlatformBuildOrchestratorInput
      );

      const statusQueryResponse = client.createCheckStatusResponse(
        context.bindingData.req,
        orchestratorId
      );

      context.res = {
        body: {
          orchestratorId: orchestratorId,
          statusRes: statusQueryResponse,
        },
      };
      return;
    }

    id = createId(req.query.site);
    const manifest = req.body; // pass body as manifest

    // prepare container and add manifest to container
    await createContainer(id, context);
    await addManifestToContainer(id, manifest, context);
    await client.startNew("PlatformOrchestrator", id, {
      siteUrl: req.query.site,
      manifest,
    }); // since id is passed, can ignore return
    const statusQueryResponse = client.createCheckStatusResponse(
      context.bindingData.req,
      id
    );

    const statusQueryResponseBody = statusQueryResponse.body as any;

    context.res = {
      body: {
        id,
        clientStatusQueryUrl: statusQueryResponseBody,
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
