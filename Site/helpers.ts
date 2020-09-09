import { HttpRequest } from "@azure/functions"

export interface ManifestInfo {
  format: ManifestFormat
  content: {
    start_url: string
    [name: string]: any
  }
}

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

export enum Error {
  MANIFEST_NOT_FOUND = "MANIFEST_NOT_FOUND"
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
