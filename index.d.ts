export as namespace global;

declare global {
  type Manifest = any;

  // Remapping of TV4 schema validation errors
  interface ManifestGuidance {
    code: string; // w3c-schema-${tv4.errorCodes[number]}
    description: string; // tv4 error message
    platform: string; // is going to be 'all', unless overridden by underlying
    level: "warning" | "error"; // if code is not found then 'warning'
    member: string; // tv4 dataPath
  }

  interface ManifestInfo {
    id: number;
    format: ManifestFormat;
    generatedUrl: string;
    content: {
      // w3c manifest
      start_url: string;
      [name: string]: any;
    };
    default: {
      // subset of the w3c manifest
      short_name: string;
      [name: string]: any;
    };
    errors: Array<ManifestGuidance>;
    suggestions: Array<ManifestGuidance>;
    warnings: Array<ManifestGuidance>;
  }

  enum ManifestFormat {
    w3c = "w3c",
    chromeos = "chromeos",
    edgeextension = "edgeextension",
    windows10 = "windows10",
    firefox = "firefox",
  }
}

export {};
