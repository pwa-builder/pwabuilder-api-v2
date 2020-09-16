export default async function downloadIcons(
  storageId: number,
  manifest: Manifest.w3c
): Promise<void> {}

export function isDataUri(uri: string): boolean {
  return (
    uri.match(/^(data:)([\w\/\+-]*)(;charset=[\w-]+|;base64){0,1},(.*)/gi)
      ?.length === 1
  );
}
