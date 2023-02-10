import * as stream from "stream";
import * as url from "url";
import * as Jimp from "jimp";
import {
  IconManifestImageResource,
  ScreenshotManifestImageResource,
} from "./interfaces.js";

export function isDataUri(uri: string): boolean {
  return (
    uri.match(/^(data:)([\w\/\+-]*)(;charset=[\w-]+|;base64){0,1},(.*)/gi)
      ?.length === 1
  );
}

type SizeString = string;
export function getSize(
  blobName: SizeString
): { width: number; height: number } {
  const [widthStr, heightStr] = blobName.split("-")[0].split("x");
  const width = Number(widthStr);
  const height = Number(heightStr);
  return {
    width,
    height,
  };
}

export function isBigger(current: SizeString, other: SizeString): boolean {
  const { width: cW, height: cH } = getSize(current);
  const { width: oW, height: oH } = getSize(other);

  // Add aspect ratio comparisons? https://en.wikipedia.org/wiki/Aspect_ratio_(image)
  return cW * cH >= oW * oH;
}

// string, index map of entries
export async function buildImageSizeMap(
  imageList: Array<IconManifestImageResource | ScreenshotManifestImageResource>,
  siteUrl: string
): Promise<Map<string, number>> {
  const map = new Map<string, number>();

  for (let i = 0; i < imageList.length; i++) {
    const entry = imageList[i];
    let sizes: Array<string> = [];

    if (entry.sizes) {
      sizes = entry.sizes.split(" ");
      map.set(entry.sizes, i); // set sizes if a list of sizes.
    } else if ((entry as any).size) {
      // not in manifest spec, but a logical next step to check
      sizes = [(entry as any).size];
    } else {
      // just download image and see size, Jimp uses gzipped so latency shouldn't be too horrible. I wish we could consistently use HEAD calls instead though.
      const img = await Jimp.read(new url.URL(entry.src, siteUrl).toString());
      sizes = [`${img.getWidth()}x${img.getHeight()}`];
    }

    sizes.forEach((size) => {
      map.set(size, i);
    });
  }

  return map;
}

interface JimpStreamInterface {
  stream: stream.Readable;
  buffer: Buffer;
}

export async function createImageStreamFromJimp(
  jimpImage: Jimp
): Promise<JimpStreamInterface> {
  const buffer = await jimpImage.getBufferAsync(jimpImage.getMIME());
  const imageStream = new stream.Readable();
  imageStream.push(buffer);
  imageStream.push(null);

  return { stream: imageStream, buffer };
}
