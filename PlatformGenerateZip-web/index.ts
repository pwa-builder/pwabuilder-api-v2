/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an orchestrator function.
 *
 * Before running this sample, please:
 * - create a Durable orchestration function
 * - create a Durable HTTP starter function
 * - run 'npm install durable-functions' from the wwwroot folder of your
 *   function app in Kudu
 */

import { AzureFunction, Context } from "@azure/functions";
import * as JSZip from "jszip";
import { Manifest } from "../utils/interfaces";
import {
  PlatformGenerateZipInput,
  PlatformGenerateZipOutput,
} from "../utils/platform";
import { getBlobServiceClient, getManifestJson } from "../utils/storage";
import { buildImageSizeMap } from "../utils/icons";
import { addImageToZipAndEditManifestEntry } from "../utils/zip";

const activityFunction: AzureFunction = async function (
  context: Context,
  input: PlatformGenerateZipInput
): Promise<PlatformGenerateZipOutput> {
  let error;
  try {
    /*
      Zip: If image has generated metadata/tag name with ${name}-generated
    */
    const zip = new JSZip();
    const serviceClient = getBlobServiceClient();
    const containerClient = await serviceClient.getContainerClient(
      input.containerId
    );

    // Get manifest json and add to zip
    const manifest: Manifest = await getManifestJson(
      input.containerId,
      serviceClient
    );

    // Add icons and screenshots to zip
    const containerContents = containerClient.listBlobsFlat({
      includeMetadata: true,
    });

    const iconsMap = await buildImageSizeMap(manifest.icons, input.siteUrl);
    const screenshotsMap = await buildImageSizeMap(
      manifest.screenshots,
      input.siteUrl
    );

    for await (const blob of containerContents) {
      const category = blob?.metadata?.category as "icons" | "screenshots";
      let indexMap = iconsMap;
      if (category === "screenshots") {
        indexMap = screenshotsMap;
      }

      addImageToZipAndEditManifestEntry(
        zip,
        containerClient,
        blob,
        manifest,
        indexMap,
        category
      );
    }

    // Write manifest zip with relative paths to new image locations
    zip.file("manifest.json", Buffer.from(JSON.stringify(manifest)));

    // upload zip and create a link using SAS permissions
    const zipClient = containerClient.getBlobClient(
      `${manifest.short_name}-${input.platform}.zip`
    );

    // Create Zip
    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      platform: "UNIX", // TODO - need to set env variable to control this :(
    });

    // Upload Zip
    const uploadResponse = await zipClient
      .getBlockBlobClient()
      .upload(zipBuffer, zipBuffer.byteLength, {
        blobHTTPHeaders: {
          blobContentType: "application/zip",
        },
      });

    if (uploadResponse.errorCode) {
      context.log(uploadResponse);
      throw Error("Upload failed with error code: " + uploadResponse.errorCode);
    }

    // SAS (add here if required again);
    // const zipSAS = await generateSASLink(
    //   input.containerId,
    //   serviceClient,
    //   context
    // );

    const zipLink = `https://${
      process.env.ACCOUNT_NAME
    }.blob.core.windows.net/${input.containerId}/${
      "PWABuilder-" + input.platform
    }`;
    context.log("zip url: " + zipLink);

    return {
      success: true,
      link: zipLink,
      zipSAS: undefined,
    };
  } catch (e) {
    context.log(e);
    error = {
      name: e.name,
      message: e.message,
      stack: e.stack,
    };
  }

  return {
    success: false,
    error,
  };
};

export default activityFunction;
