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
import {
  IconManifestImageResource,
  Manifest,
  ScreenshotManifestImageResource,
} from "../utils/interfaces";
import {
  PlatformDownloadImageInput,
  PlatformDownloadImageOutput,
} from "../PlatformDownloadImage";
import { Task } from "durable-functions/lib/src/classes";

interface PlatformOrchestratorInput {
  siteUrl: string;
  manifest: Manifest;
}

const orchestrator = df.orchestrator(function* (context) {
  let outputs: Array<Task> = [];
  const input = context.df.getInput() as PlatformOrchestratorInput;
  const manifest = input.manifest;

  if (manifest.icons) {
    const iconActivities = manifest.icons.map(
      (icon: IconManifestImageResource) =>
        context.df.callActivity("PlatformDownloadImage", {
          containerId: context.df.instanceId,
          siteUrl: input.siteUrl,
          imageUrl: new url.URL(icon.src, input.siteUrl).toString(),
          category: "icons",
          tags: ["icons", icon.sizes, icon.type, icon.purpose],
        } as PlatformDownloadImageInput)
    );
    outputs = outputs.concat(iconActivities);
  }

  if (manifest.screenshots) {
    const screenshotActivities = manifest.screenshots.map(
      (screenshot: ScreenshotManifestImageResource) =>
        context.df.callActivity("PlatformDownloadImage", {
          containerId: context.df.instanceId,
          siteUrl: input.siteUrl,
          imageUrl: new url.URL(screenshot.src, input.siteUrl).toString(),
          category: "screenshots",
          tags: [
            "screenshots",
            screenshot.sizes,
            screenshot.type,
            screenshot.purpose,
          ],
        } as PlatformDownloadImageInput)
    );
    outputs = outputs.concat(screenshotActivities);
  }

  context.log("start the sub jobs");
  yield context.df.Task.all(outputs);
  context.log(
    outputs.map((task) => task.result as PlatformDownloadImageOutput)
  );
  // outputs.reduce((prev, cur) => prev + cur )
  return outputs;
});

export default orchestrator;
