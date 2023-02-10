import { BlobDownloadResponseParsed } from "@azure/storage-blob";
import { Manifest } from "./interfaces.js";

export function sanitizeName(manifest: Manifest) {
  let sanitizedName = manifest.short_name;
  sanitizedName.replace(/[^a-zA-Z0-9]/g, "_");

  var currentLength;
  do {
    currentLength = sanitizedName.length;
    sanitizedName = sanitizedName.replace(/^[0-9]/, "");
    sanitizedName = sanitizedName.replace(/^\./, "");
    sanitizedName = sanitizedName.replace(/\.[0-9]/g, ".");
    sanitizedName = sanitizedName.replace(/\.\./g, ".");
    sanitizedName = sanitizedName.replace(/\.$/, "");
  } while (currentLength > sanitizedName.length);

  if (sanitizedName.length === 0) {
    sanitizedName = "myPWABuilderApp";
  }

  manifest.short_name = sanitizedName;
}

export function readManifestBlob(
  response: BlobDownloadResponseParsed
): Manifest {
  const streamBody: ReadableStream<any> | any = response.readableStreamBody;

  return (JSON.stringify(streamToBuffer(streamBody)) as unknown) as Manifest;
}

async function streamToBuffer(readableStream: any) {
  return new Promise((resolve, reject) => {
    const chunks: Array<Uint8Array> = [];
    readableStream.on("data", (data: Buffer) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on("error", reject);
  });
}
