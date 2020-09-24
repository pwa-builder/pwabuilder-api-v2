/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an HTTP starter function.
 *
 * Before running this sample, please:
 * - create a Durable activity function (default name is "Hello")
 * - create a Durable HTTP starter function
 * - run 'npm install durable-functions' from the wwwroot folder of your
 *    function app in Kudu
 *
 * This orchestrator downloads the and adds them to the container with the manifest, allowing the
 */

import * as url from "url";
import * as df from "durable-functions";
import { Manifest } from "../utils/interfaces";

const orchestrator = df.orchestrator(function* (context) {
  const outputs = [];

  context.log(context.df.instanceId);
  const manifest = context.df.getInput() as Manifest;

  const iconActivities = manifest.icons.map((icon) =>
    context.df.callActivity("PlatformDownloadImage", {
      containerId: context.df.instanceId,
      imageUrl: new url.URL(icon.src, manifest.start_url),
      tags: ["icons", icon.sizes, icon.type, icon.purpose],
    })
  );

  const screenshotActivities = manifest.screenshots.map((screenshot) =>
    context.df.callActivity("PlatformDownloadImage", {
      containerId: context.df.instanceId,
      imageUrl: new url.URL(screenshot.src, manifest.start_url),
      tags: [
        "screenshots",
        screenshot.sizes,
        screenshot.type,
        screenshot.purpose,
      ],
    })
  );

  yield context.df.Task.all(iconActivities.concat(screenshotActivities));
  return outputs;
});

export default orchestrator;
