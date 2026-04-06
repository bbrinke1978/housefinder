import {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

const CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING ?? "";
const CONTAINER_NAME = "receipts";
const CONTRACTS_CONTAINER = "contracts";
const PHOTOS_CONTAINER = "photos";
const FLOOR_PLANS_CONTAINER = "floor-plans";

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

/**
 * uploadContract — upload a signed contract PDF to Azure Blob Storage "contracts" container.
 * Creates the container if it doesn't exist (idempotent first-run).
 * Returns the blob URL (not a SAS URL — container is private).
 */
export async function uploadContract(
  buffer: Buffer,
  blobName: string
): Promise<string> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(CONTRACTS_CONTAINER);
  await containerClient.createIfNotExists();
  const blobClient = containerClient.getBlockBlobClient(blobName);

  await blobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: "application/pdf" },
  });

  return blobClient.url;
}

/**
 * generateContractSasUrl — generate a 1-hour read-only SAS URL for a contract PDF.
 * Must be called server-side.
 */
export function generateContractSasUrl(blobName: string): string {
  if (!CONNECTION_STRING) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING is not set");
  }

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
      containerName: CONTRACTS_CONTAINER,
      blobName,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn,
    },
    sharedKeyCredential
  );

  return `https://${accountName}.blob.core.windows.net/${CONTRACTS_CONTAINER}/${blobName}?${sasParams.toString()}`;
}

/**
 * uploadPhotoBlob — upload a photo buffer to Azure Blob Storage "photos" container.
 * Creates the container if it doesn't exist (idempotent first-run).
 * Returns the blob URL (not a SAS URL — container is private).
 */
export async function uploadPhotoBlob(
  buffer: Buffer,
  blobName: string
): Promise<string> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(PHOTOS_CONTAINER);
  await containerClient.createIfNotExists();
  const blobClient = containerClient.getBlockBlobClient(blobName);

  await blobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: "image/jpeg" },
  });

  return blobClient.url;
}

/**
 * generatePhotoSasUrl — generate a 1-hour read-only SAS URL for a photo.
 * Must be called server-side.
 */
export function generatePhotoSasUrl(blobName: string): string {
  if (!CONNECTION_STRING) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING is not set");
  }

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
      containerName: PHOTOS_CONTAINER,
      blobName,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn,
    },
    sharedKeyCredential
  );

  return `https://${accountName}.blob.core.windows.net/${PHOTOS_CONTAINER}/${blobName}?${sasParams.toString()}`;
}

/**
 * deletePhotoBlob — delete a photo from Azure Blob Storage "photos" container.
 * Uses deleteIfExists to be idempotent — no error if blob is already gone.
 */
export async function deletePhotoBlob(blobName: string): Promise<void> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(PHOTOS_CONTAINER);
  const blobClient = containerClient.getBlockBlobClient(blobName);
  await blobClient.deleteIfExists();
}

/**
 * uploadFloorPlanBlob — upload a floor plan (PDF or image) to Azure Blob Storage "floor-plans" container.
 * Creates the container if it doesn't exist (idempotent first-run).
 * Accepts explicit contentType for PDFs and images.
 * Returns the blob URL (not a SAS URL — container is private).
 */
export async function uploadFloorPlanBlob(
  buffer: Buffer,
  blobName: string,
  contentType: string
): Promise<string> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(FLOOR_PLANS_CONTAINER);
  await containerClient.createIfNotExists();
  const blobClient = containerClient.getBlockBlobClient(blobName);

  await blobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType },
  });

  return blobClient.url;
}

/**
 * generateFloorPlanSasUrl — generate a 4-hour read-only SAS URL for a floor plan.
 * 4-hour expiry (longer than photos) since editing sessions can be long.
 * Must be called server-side.
 */
export function generateFloorPlanSasUrl(blobName: string): string {
  if (!CONNECTION_STRING) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING is not set");
  }

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
  expiresOn.setHours(expiresOn.getHours() + 4); // 4-hour expiry for editing sessions

  const sasParams = generateBlobSASQueryParameters(
    {
      containerName: FLOOR_PLANS_CONTAINER,
      blobName,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn,
    },
    sharedKeyCredential
  );

  return `https://${accountName}.blob.core.windows.net/${FLOOR_PLANS_CONTAINER}/${blobName}?${sasParams.toString()}`;
}
