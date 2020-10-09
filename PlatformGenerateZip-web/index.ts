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
import {
  ContainerSASPermissions,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";
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

    context.log(input.containerId);
    context.log("init zip");
    const zip = new JSZip();
    const serviceClient = getBlobServiceClient();
    const containerClient = await serviceClient.getContainerClient(
      input.containerId
    );

    context.log("get manifest");
    // Get manifest json and add to zip
    const manifest: Manifest = await getManifestJson(
      input.containerId,
      serviceClient
    );

    context.log(manifest);

    // Add icons and screenshots to zip
    const containerContents = containerClient.listBlobsFlat({
      includeMetadata: true,
    });

    const iconsMap = await buildImageSizeMap(manifest.icons, input.siteUrl);
    const screenshotsMap = await buildImageSizeMap(
      manifest.screenshots,
      input.siteUrl
    );

    context.log(iconsMap);
    context.log(screenshotsMap);

    context.log("iterate through containerContents");
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
        screenshotsMap,
        category
      );
    }

    // Write manifest zip with relative paths to new image locations
    zip.file("manifest.json", Buffer.from(JSON.stringify(manifest)));

    // upload zip and create a link using SAS permissions
    const zipClient = containerClient.getBlobClient(
      `${manifest.short_name}-${input.platform}`
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

    // Get Delegated SAS Key
    const startsOn = new Date();
    const expiresOn = new Date();
    expiresOn.setHours(expiresOn.getHours() + 6);
    const delegatedKey = await serviceClient.getUserDelegationKey(
      startsOn,
      expiresOn
    );

    // Create SAS link
    const zipSAS = generateBlobSASQueryParameters(
      {
        containerName: input.containerId,
        permissions: ContainerSASPermissions.parse("r"),
        startsOn,
        expiresOn,
      },
      delegatedKey,
      process.env.ACCOUNT_NAME as string
    );

    context.log(zipSAS);

    return {
      success: true,
      link: "testing",
      zipSAS,
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
