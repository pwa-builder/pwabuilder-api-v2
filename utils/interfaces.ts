type HexCode = string;
import { Browser, Page, Response } from "puppeteer";
import {
  ManifestImageResource,
  SpaceSeparatedList,
  ExternalApplicationResource,
  ShortcutItem,
} from "./w3c";

// w3c manifest
export interface Manifest {
  dir: "auto" | string;
  lang: "en-US" | "fr" | string;
  name: string;
  short_name: string;
  description: string;
  categories: SpaceSeparatedList;
  iarc_rating_id: string;
  start_url: string;
  icons: Array<IconManifestImageResource>;
  screenshots: Array<ScreenshotManifestImageResource>;
  display: "browser" | "fullscreen" | "standalone" | "minimal-ui";
  orientation:
    | "any"
    | "natural"
    | "landscape"
    | "portrait"
    | "portrait-primary"
    | "portrait-secondary"
    | "landscape-primary"
    | "landscape-secondary";
  theme_color: HexCode;
  background_color: HexCode;
  scope: string;
  related_applications?: Array<ExternalApplicationResource>;
  prefer_related_application?: boolean;
  shortcuts: Array<ShortcutItem>;

  // TODO: populate and remove
  [name: string]: any;
}

export type Categories = "icons" | "screenshots" | "unset";

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
  default: Partial<Manifest>;
  errors: Array<ManifestGuidance>;
  suggestions: Array<ManifestGuidance>;
  warnings: Array<ManifestGuidance>;
}

export type IconManifestImageResource = ManifestImageResource &
  PWABuilderImageResource;
export type ScreenshotManifestImageResource = ManifestImageResource &
  PWABuilderImageResource;
export interface PWABuilderImageResource {
  generated?: boolean;
}

export enum BlobCategory {
  icons = "icons",
  screenshots = "screenshots",
}

export enum ManifestFormat {
  w3c = "w3c",
  chromeos = "chromeos",
  edgeextension = "edgeextension",
  windows10 = "windows10",
  firefox = "firefox",
}

export interface PageData {
  sitePage: Page,
  pageResponse: Response,
  browser: Browser
}

export interface OfflineTestData {
  worksOffline: boolean
}
