declare namespace Manifest {
  // w3c manifest
  interface w3c {
    start_url: string;
    [name: string]: any;
  }

  // Remapping of TV4 schema validation errors
  interface Guidance {
    code: string; // w3c-schema-${tv4.errorCodes[number]}
    description: string; // tv4 error message
    platform: string; // is going to be 'all', unless overridden by underlying
    level: "warning" | "error"; // if code is not found then 'warning'
    member: string; // tv4 dataPath
  }

  interface Info {
    id: number;
    format: Format;
    generatedUrl: string;
    content: w3c;
    default: {
      // subset of the w3c manifest
      short_name: string;
      [name: string]: any;
    };
    errors: Array<Manifest.Guidance>;
    suggestions: Array<Manifest.Guidance>;
    warnings: Array<Manifest.Guidance>;
  }

  enum Format {
    w3c = "w3c",
    chromeos = "chromeos",
    edgeextension = "edgeextension",
    windows10 = "windows10",
    firefox = "firefox",
  }
}
