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

import * as url from "url";
import * as Stream from "stream";
import { AzureFunction, Context } from "@azure/functions";
import * as JSZip from "jszip";
import { Manifest } from "../utils/interfaces";
import {
  parseImageKey,
  PlatformGenerateZipInput,
  PlatformGenerateZipOutput,
} from "../utils/platform";
import {
  getBlobServiceClient,
  getManifestJson,
  getTagMetadataProperties,
} from "../utils/storage";
import {
  ContainerSASPermissions,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";
import { buildImageSizeMap } from "../utils/icons";

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

    // Add icons and screenshots to zip
    const containerContents = containerClient.listBlobsFlat();

    const iconsMap = await buildImageSizeMap(manifest.icons, input.siteUrl);
    const screenshotsMap = await buildImageSizeMap(
      manifest.screenshots,
      input.siteUrl
    );

    context.log("iterate through containerContents");
    for await (const blob of containerContents) {
      let size: string, purpose: string;
      const category = blob?.tags?.category;

      context.log("blob item: " + blob.name);
      if (category === "icons") {
        let parsedImageKey = parseImageKey(blob.name);
        const tagMetadata = getTagMetadataProperties(blob.metadata ?? {});
        let size = parsedImageKey.size || tagMetadata.actualSize;

        if (iconsMap.has(size)) {
          const iconManifestEntry =
            manifest.icons[iconsMap.get(size) as number];

          iconManifestEntry.src = new url.URL(
            iconManifestEntry.src,
            manifest.start_url
          ).toString();

          zip
            .folder("icons")
            ?.file(
              blob.name,
              containerClient.getBlobClient(blob.name).downloadToBuffer()
            );
        }
      } else if (category === "screenshots") {
        let parsedImageKey = parseImageKey(blob.name);
        const tagMetadata = getTagMetadataProperties(blob.metadata ?? {});
        let size = parsedImageKey.size || tagMetadata.actualSize;

        if (screenshotsMap.has(size)) {
          const screenshotManifestEntry =
            manifest.screenshots[screenshotsMap.get(size) as number];

          screenshotManifestEntry.src = new url.URL(
            screenshotManifestEntry.src,
            manifest.start_url
          ).toString();

          zip
            .folder("screenshots")
            ?.file(
              blob.name,
              containerClient.getBlobClient(blob.name).downloadToBuffer()
            );
        }
      }
    }

    // write manifest to zip last
    zip.file("manifest.json", Buffer.from(manifest));

    // upload zip and create a link using SAS permissions
    const zipClient = containerClient.getBlobClient(
      `${manifest.short_name}-${input.platform}`
    );
    const uploadResponse = await zipClient
      .getBlockBlobClient()
      .uploadStream(
        Stream.Readable.from(zip.generateNodeStream({ streamFiles: true }))
      );

    if (!uploadResponse.errorCode) {
      // uploadResponse.
    }

    // Shared Access Signature generation
    const startsOn = new Date();
    const expiresOn = new Date();
    expiresOn.setHours(expiresOn.getHours() + 6);
    const delegatedKey = await serviceClient.getUserDelegationKey(
      startsOn,
      expiresOn
    );

    console.log(delegatedKey);

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
