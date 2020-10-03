import { SASQueryParameters } from "@azure/storage-blob";
import {
  IconManifestImageResource,
  ScreenshotManifestImageResource,
} from "../interfaces";

type ImageKey = string;
type SpaceSeparatedList = string;

export interface PlatformGenerateZipOutput {
  link: string;
  zipSAS: SASQueryParameters;
}

export interface PlatformGenerateZipInput {
  containerId: string;
  platform: PlatformId;
}
export interface ImageProperties
  extends IconManifestImageResource,
    ScreenshotManifestImageResource {
  category?: string;
  width: number;
  height: number;
  size?: string;
  path?: string;
}

export enum PlatformId {
  web = "web",
}

interface PlatformImageSizes {
  [name: string /* PlatformId */]: Array<ImageProperties>;
}

export function requiredPlatformImages(
  platformId: string | PlatformId
): Map<ImageKey, ImageProperties> {
  return new Map(
    ImageSizes[platformId].map((entry: ImageProperties) => {
      return [ImageKey(entry), entry];
    })
  );
}

export function ImageKey(properties: Partial<ImageProperties>): ImageKey {
  let category = "";
  let size = "";
  let purpose = "";

  if (properties.category) {
    category = properties.category + "-";
  }

  if (properties.size) {
    size = properties.size;
  } else {
    size = properties.width + "x" + properties.height;
  }

  if (properties.purpose && properties.purpose !== "none") {
    purpose = "-" + properties.purpose;
  }

  return `${category}${size}${purpose}`;
}

// JSON object that correlates the PWABuilder Image Sizes for the platform
const ImageSizes: PlatformImageSizes = {
  [PlatformId.web]: [],
};