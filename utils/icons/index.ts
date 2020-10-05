import * as stream from "stream";
import * as Jimp from "jimp/es";

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
