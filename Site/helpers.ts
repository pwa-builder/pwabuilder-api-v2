import { HttpRequest } from "@azure/functions"

export enum ValidContentType {
  webmanifest = "application/manifest+json",
  json = "application/json",
  binary = "application/octet-stream"
}

export enum ManifestFormat {
  w3c = "w3c",
  chromeos = "chromeos",
  edgeextension = "edgeextension",
  windows10 = "windows10",
  firefox = "firefox"
}

// TODO need to implement
export function validManifest(manifest: any): boolean {
  return false;
}

export function ifFile(req: HttpRequest): boolean {
  switch (req.headers['content-type']) {
    case ValidContentType.webmanifest:
    case ValidContentType.json:
      return true

    case ValidContentType.binary:
    default:
      // handle binary later
      return false
  }
}

export async function addToClient(manifest: any): Promise<void> {
  return new Promise((res, rej) => {
    res();
  });
}