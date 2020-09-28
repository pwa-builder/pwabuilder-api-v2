// w3c manifest
export interface Manifest {
  start_url: string;
  [name: string]: any;
}

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
  content: Manifest;
  default: {
    // subset of the w3c manifest
    short_name: string;
    [name: string]: any;
    icons: Array<Icon>;
    screenshots: Array<Screenshot>;
  };
  errors: Array<ManifestGuidance>;
  suggestions: Array<ManifestGuidance>;
  warnings: Array<ManifestGuidance>;
}

export interface Icon {
  src: string;
  sizes: string;
  purpose: string;
  type: string;
  generated?: boolean;
}

export interface Screenshot {
  src: string;
  sizes: string;
  purpose: string;
  type: string;
  generated: boolean;
}

export enum ManifestFormat {
  w3c = "w3c",
  chromeos = "chromeos",
  edgeextension = "edgeextension",
  windows10 = "windows10",
  firefox = "firefox",
}
