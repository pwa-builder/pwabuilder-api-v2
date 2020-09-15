export default function downloadIcons(
  storageId: number,
  manifest: WebManifest
): void {}

export function isDataUri(uri: string): boolean {
  return (
    uri.match(/^(data:)([\w\/\+-]*)(;charset=[\w-]+|;base64){0,1},(.*)/gi)
      ?.length === 1
  );
}
