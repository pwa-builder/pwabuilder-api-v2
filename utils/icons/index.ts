import { Manifest } from "../interfaces";

export default async function downloadIcons(
  storageId: number,
  manifest: Manifest
): Promise<void> {}

export function isDataUri(uri: string): boolean {
  return (
    uri.match(/^(data:)([\w\/\+-]*)(;charset=[\w-]+|;base64){0,1},(.*)/gi)
      ?.length === 1
  );
}

export function removeGeneratedImageEntries(manifest: Manifest) {
  manifest.icons = (manifest.icons || []).filter((icon) => !icon.generated);
  manifest.screenshots = (manifest.screenshots || []).filter(
    (icon) => !icon.generated
  );
}
