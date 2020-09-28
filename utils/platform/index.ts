type ImageKey = string;
type SpaceSeparatedList = string;

export interface ImageProperties {
  width: number;
  height: number;
  size: string;
  path?: string;
  purpose?: "monochrome" | "maskable" | "any" | SpaceSeparatedList | "none";
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

export function ImageKey(properties: ImageProperties): ImageKey {
  return `${properties.width}x${properties.height}${
    properties.purpose ? "-" + properties.purpose : ""
  }`;
}

// JSON object that correlates the PWABuilder Image Sizes for the platform
const ImageSizes: PlatformImageSizes = {
  [PlatformId.web]: [],
};
