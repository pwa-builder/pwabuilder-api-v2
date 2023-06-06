import { Context } from "@azure/functions";
import {
  BlobServiceClient,
  ContainerSASPermissions,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";

export async function generateSASLink(
  containerId: string,
  serviceClient: BlobServiceClient,
  context?: Context
) {
  try {
    context?.log("creating delegate key");
    const startsOn = new Date();
    const expiresOn = new Date();
    expiresOn.setHours(expiresOn.getHours() + 6);
    const delegateKey = await getUserDelegationKey(
      serviceClient,
      startsOn,
      expiresOn
    );

    context?.log("create SAS query parameters");
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
  } catch (e) {
    context?.log("failed to create SAS credentials");
    context?.log(e);
  }
}

export async function getUserDelegationKey(
  serviceClient: BlobServiceClient,
  startsOn: Date,
  expiresOn: Date
) {
  // Get Delegated SAS Key
  return await serviceClient.getUserDelegationKey(startsOn, expiresOn);
}
