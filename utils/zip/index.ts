import * as url from "url";
import * as path from "path";
import { BlobItem, ContainerClient } from "@azure/storage-blob";
import JSZip = require("jszip");
import {
  IconManifestImageResource,
  Manifest,
  ScreenshotManifestImageResource,
} from "../interfaces";
import { TagMetaDataMap, getTagMetadataProperties } from "../storage";
import { parseImageBlobName } from "../platform";

type index = number;
type ImageCategories = "icons" | "screenshots";

export async function addImageToZipAndEditManifestEntry(
  zip: JSZip,
  containerClient: ContainerClient,
  blob: BlobItem,
  manifest: Manifest,
  manifestIndexMap: Map<string, index>,
  category: ImageCategories
) {
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

  manifestEntry.src = newPath; // TODO seems naive...

  zip.file(
    newPath,
    containerClient.getBlobClient(blob.name).downloadToBuffer()
  );
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
