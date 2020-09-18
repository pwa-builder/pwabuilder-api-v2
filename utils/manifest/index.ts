import { Manifest } from "../getManifestFromFile";

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

