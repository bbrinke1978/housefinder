import {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

const CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING ?? "";
const CONTAINER_NAME = "receipts";

function getBlobServiceClient(): BlobServiceClient {
  if (!CONNECTION_STRING) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING is not set");
  }
  return BlobServiceClient.fromConnectionString(CONNECTION_STRING);
}

/**
 * uploadBlob — upload a buffer to Azure Blob Storage "receipts" container.
 * Returns the blob URL (not a SAS URL — container is private).
 */
export async function uploadBlob(
  buffer: Buffer,
  blobName: string,
  contentType: string
): Promise<string> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(CONTAINER_NAME);
  const blobClient = containerClient.getBlockBlobClient(blobName);

  await blobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType },
  });

  return blobClient.url;
}

/**
 * generateSasUrl — generate a SAS URL with 1-hour read-only expiry.
 * Must be called server-side. Container is private; SAS URL required for browser display.
 */
export function generateSasUrl(blobName: string): string {
  if (!CONNECTION_STRING) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING is not set");
  }

  // Parse account name and key from connection string
  const accountNameMatch = CONNECTION_STRING.match(/AccountName=([^;]+)/);
  const accountKeyMatch = CONNECTION_STRING.match(/AccountKey=([^;]+)/);

  if (!accountNameMatch || !accountKeyMatch) {
    throw new Error(
      "AZURE_STORAGE_CONNECTION_STRING does not contain AccountName or AccountKey"
    );
  }

  const accountName = accountNameMatch[1];
  const accountKey = accountKeyMatch[1];

  const sharedKeyCredential = new StorageSharedKeyCredential(
    accountName,
    accountKey
  );

  const expiresOn = new Date();
  expiresOn.setHours(expiresOn.getHours() + 1);

  const sasParams = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER_NAME,
      blobName,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn,
    },
    sharedKeyCredential
  );

  return `https://${accountName}.blob.core.windows.net/${CONTAINER_NAME}/${blobName}?${sasParams.toString()}`;
}
