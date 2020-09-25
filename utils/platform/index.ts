import { Image } from "svgjs";

interface ImageProperties {
  width: number;
  height: number;
  path: string;
  purpose?: string;
}

export enum PlatformId {
  web = "web",
}

interface PlatformImageSizes {
  [name: string /* PlatformId */]: Array<ImageProperties>;
}

export function requiredPlatformImages(
  platformId: string | PlatformId
): Array<ImageProperties> {
  return ImageSizes[platformId];
}

// JSON object that correlates the PWABuilder Image Sizes for the platform
const ImageSizes: PlatformImageSizes = {
  [PlatformId.web]: [],
};
