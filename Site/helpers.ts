import { HttpRequest } from "@azure/functions";

export interface ManifestInfo {
  id: number;
  format: ManifestFormat;
  generatedUrl: string;
  content: {
    start_url: string;
    [name: string]: any;
  };
  default: {
    short_name: string;
    [name: string]: any;
  };
  errors: [];
  suggestions: Array<{ code: string; description: string; platform: string }>;
  warnings: Array<{ code: string; description: string; platform: string }>;
}

export enum ValidContentType {
  webmanifest = "application/manifest+json",
  json = "application/json",
  binary = "application/octet-stream",
}

export enum ManifestFormat {
  w3c = "w3c",
  chromeos = "chromeos",
  edgeextension = "edgeextension",
  windows10 = "windows10",
  firefox = "firefox",
}

export enum Error {
  MANIFEST_NOT_FOUND = "MANIFEST_NOT_FOUND",
}

export function ifFile(req: HttpRequest): boolean {
  switch (req.headers["content-type"]) {
    case ValidContentType.webmanifest:
    case ValidContentType.json:
      return true;

    case ValidContentType.binary:
    default:
      // handle binary later
      return false;
  }
}
