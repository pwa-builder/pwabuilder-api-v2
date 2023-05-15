import { Context } from "@azure/functions";
import { BlobItem, ContainerClient } from "@azure/storage-blob/dist";
import JSZip from "jszip";
import {
  IconManifestImageResource,
  Manifest,
  ScreenshotManifestImageResource,
} from "../utils/interfaces.js";
import { ImageProperties } from "../utils/platform.js";
import { getTagMetadataProperties } from "../utils/storage.js";
import { ManifestImageResource } from "../utils/w3c.js";

type index = number;
type ImageCategories = "icons" | "screenshots";

export async function addImageToZipAndEditManifestEntry(
  zip: JSZip,
  containerClient: ContainerClient,
  blob: BlobItem,
  manifest: Manifest,
  manifestIndexMap: Map<string, index>,
  category: ImageCategories,
  context?: Context
) {
  try {
    const folderPath = category ? category + "/" : "";
    const metadata = getTagMetadataProperties(blob.metadata ?? {});

    // generated and most images have the correct size, but there's a case where a different sized image is used.
    let size = metadata.actualSize;
    if (metadata.actualSize !== metadata.sizes) {
      size = metadata.sizes;
    }

    const manifestEntry = getManifestEntry(
      size,
      category,
      manifest,
      manifestIndexMap
    );

    const newPath = `${folderPath}${blob.name}`;

    if (manifestEntry) {
      manifestEntry.src = newPath; // TODO seems naive...
    } else {
      const newEntry: ManifestImageResource = {
        sizes: size,
        src: newPath,
        type: metadata.type,
      };

      manifest[category].push(newEntry);
    }

    zip.file(
      newPath,
      containerClient.getBlobClient(blob.name).downloadToBuffer()
    );
  } catch (e) {
    context?.log("failed to add image to zip: " + blob.name);
    context?.log(e);
  }
}

export function getManifestEntry(
  size: string,
  category: ImageCategories,
  manifest: Manifest,
  manifestIndexMap: Map<string, index>
): IconManifestImageResource | ScreenshotManifestImageResource {
  const index = manifestIndexMap.get(size) as number;
  return manifest[category][index];
}
