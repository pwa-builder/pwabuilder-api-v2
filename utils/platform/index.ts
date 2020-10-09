import { SASQueryParameters } from "@azure/storage-blob";
import {
  IconManifestImageResource,
  ScreenshotManifestImageResource,
} from "../interfaces";

type ImageKey = string;
type SpaceSeparatedList = string;

export interface PlatformGenerateZipOutput {
  success: boolean;
  link?: string;
  zipSAS?: SASQueryParameters;
  error?: {
    name: string;
    message: string;
    stack: string;
  };
}

export interface PlatformGenerateZipInput {
  containerId: string;
  platform: PlatformId;
  siteUrl: string;
}
export interface ImageProperties
  extends IconManifestImageResource,
    ScreenshotManifestImageResource {
  name?: string;
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
  let name = "";

  if (properties.size) {
    size = properties.size;
  } else {
    size = properties.width + "x" + properties.height;
  }

  if (properties.purpose && properties.purpose !== "none") {
    purpose = "-" + properties.purpose;
  }

  if (properties.category) {
    name = "-" + properties.category;
  }

  if (properties.name) {
    name = "-" + properties.name;
  }

  return `${size}${purpose}${category}${name}`;
}

export function parseImageBlobName(imageKey: ImageKey): Partial<ImageProperties> {
  let [size, purpose, category, name] = imageKey.split("-");
  return {
    size,
    purpose,
    category,
    name,
  };
}

// JSON object that correlates the PWABuilder Image Sizes for the platform
const ImageSizes: PlatformImageSizes = {
  [PlatformId.web]: [],
};
