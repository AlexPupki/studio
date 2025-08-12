import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';

// Ensure required environment variables are set
if (!process.env.GCS_BUCKET_NAME) {
  throw new Error('GCS_BUCKET_NAME environment variable is not set.');
}
if (!process.env.GCS_PRESIGN_SERVICE_ACCOUNT) {
  throw new Error('GCS_PRESIGN_SERVICE_ACCOUNT environment variable is not set.');
}
if (!process.env.GCS_PRESIGN_SERVICE_ACCOUNT_PRIVATE_KEY) {
  throw new Error('GCS_PRESIGN_SERVICE_ACCOUNT_PRIVATE_KEY environment variable is not set.');
}

const gcs = new Storage({
  credentials: {
    client_email: process.env.GCS_PRESIGN_SERVICE_ACCOUNT,
    private_key: process.env.GCS_PRESIGN_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
});

const bucket = gcs.bucket(process.env.GCS_BUCKET_NAME);

interface GetUploadUrlParams {
  contentType: string;
  ext: string;
  prefix?: string;
}

/**
 * Generates a v4 presigned URL for uploading a file to GCS.
 * @param {GetUploadUrlParams} params - The parameters for the upload.
 * @returns {Promise<{url: string, key: string}>} - The presigned URL and the GCS object key.
 */
export async function getUploadUrl({
  contentType,
  ext,
  prefix = 'uploads',
}: GetUploadUrlParams): Promise<{ url: string; key: string }> {
  const key = `${prefix}/${randomUUID()}${ext}`;
  const file = bucket.file(key);
  const expires = Date.now() + 15 * 60 * 1000; // 15 minutes

  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires,
    contentType,
  });

  return { url, key };
}

/**
 * Generates a v4 presigned URL for downloading a file from GCS.
 * @param {string} key - The GCS object key.
 * @returns {Promise<string>} - The presigned URL.
 */
export async function getDownloadUrl(key: string): Promise<string> {
  const file = bucket.file(key);
  const expires = Date.now() + 60 * 60 * 1000; // 1 hour

  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires,
  });

  return url;
}
