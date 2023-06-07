export type WidthByHeight = string;
export type MimeType = string;
export type W3CPurpose =
  | 'monochrome'
  | 'maskable'
  | 'any'
  | SpaceSeparatedList
  | 'none';
export type SpaceSeparatedList = string;

export interface ManifestImageResource {
  src: string;
  sizes: WidthByHeight | SpaceSeparatedList;
  type: MimeType | SpaceSeparatedList; //use Jimp.MIME_<type>
  purpose?: W3CPurpose;
}

export interface ExternalApplicationResource {
  platform: string;
  url: string;
  id: string;
  min_version: '1' | '2' | string;
  fingerprints: Record<string, string>;
}

export interface ShortcutItem {
  name: string;
  short_name: string;
  description: string;
  url: string;
  icons: Array<ManifestImageResource>;
}
