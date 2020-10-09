import {
  BlobServiceClient,
  ContainerSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

export async function generateSASLink(
  containerId: string,
  serviceClient: BlobServiceClient
) {
  // Get SAS Credential =
  const credential = new StorageSharedKeyCredential(
    process.env.ACCOUNT_NAME as string,
    process.env.ACCOUNT_KEY as string
  );

  // Create SAS link
  const startsOn = new Date();
  const expiresOn = new Date();
  expiresOn.setHours(expiresOn.getHours() + 6);
  const delegateKey = await getUserDelegationKey(
    serviceClient,
    startsOn,
    expiresOn
  );

  // TODO see if this works first
  return generateBlobSASQueryParameters(
    {
      containerName: containerId,
      permissions: ContainerSASPermissions.parse("r"),
      startsOn,
      expiresOn,
    },
    credential
  );

  // TODO happy path
  return generateBlobSASQueryParameters(
    {
      containerName: containerId,
      permissions: ContainerSASPermissions.parse("r"),
      startsOn,
      expiresOn,
    },
    delegateKey,
    process.env.ACCOUNT_NAME as string
  );
}

export async function getUserDelegationKey(
  serviceClient: BlobServiceClient,
  startsOn: Date,
  expiresOn: Date
) {
  // Get Delegated SAS Key
  return await serviceClient.getUserDelegationKey(startsOn, expiresOn);
}
