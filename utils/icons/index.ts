import { Manifest } from "../interfaces";

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

type SizeString = string;
export function getSize(
  blobName: SizeString
): { width: number; height: number } {
  const [widthStr, heightStr] = blobName.split("-")[0].split("x");
  const width = Number(widthStr);
  const height = Number(heightStr);
  return {
    width,
    height,
  };
}

export function isBigger(current: SizeString, other: SizeString): boolean {
  const { width: cW, height: cH } = getSize(current);
  const { width: oW, height: oH } = getSize(other);

  return cW * cH >= oW * oH;
}
