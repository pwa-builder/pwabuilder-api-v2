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

export function ImageKey(properties: Partial<ImageProperties>): ImageKey {
  let size = "";
  let purpose = "";
  if (properties.size) {
    size = properties.size;
  } else {
    size = properties.width + "x" + properties.height;
  }

  if (properties.purpose) {
    purpose = "-" + properties.purpose;
  }

  return `${size}${purpose}`;
}

// JSON object that correlates the PWABuilder Image Sizes for the platform
const ImageSizes: PlatformImageSizes = {
  [PlatformId.web]: [],
};
