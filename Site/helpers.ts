import { HttpRequest } from "@azure/functions";

// Remapping of TV4 schema validation errors
export interface ManifestGuidance {
  code: string; // w3c-schema-${tv4.errorCodes[number]}
  description: string; // tv4 error message
  platform: string; // is going to be 'all', unless overridden by underlying
  level: "warning" | "error"; // if code is not found then 'warning'
  member: string; // tv4 dataPath
}

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
  errors: Array<ManifestGuidance>;
  suggestions: Array<ManifestGuidance>;
  warnings: Array<ManifestGuidance>;
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

export function ifSupportedFile(req: HttpRequest): boolean {
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
