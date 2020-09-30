import { ManifestInfo } from "./interfaces";

type WidthByHeight = string;
type MimeType = string;
export type SpaceSeparatedList = string;

export interface ManifestImageResource {
  src: string;
  sizes: WidthByHeight | SpaceSeparatedList;
  type: MimeType | SpaceSeparatedList;
  purpose?: "monochrome" | "maskable" | "any" | SpaceSeparatedList;
}

export interface ExternalApplicationResource {
  platform: string;
  url: string;
  id: string;
  min_version: "1" | "2" | string;
  fingerprints: Record<string, string>;
}

export interface ShortcutItem {
  name: string;
  short_name: string;
  description: string;
  url: string;
  icons: Array<ManifestImageResource>;
}
