'use server';

import { z } from 'zod';
import { getDownloadUrl, getUploadUrl } from '../gcs/gcs.server';

const presignError = 'Could not get presigned URL';

const GetUploadUrlSchema = z.object({
  contentType: z.string().startsWith('image/', { message: 'Only images are supported' }),
  ext: z.string(),
  prefix: z.string().default('uploads'),
});

/**
 * Creates a presigned URL for uploading a file to GCS.
 * This action is rate-limited.
 * @param {object} props - The properties for the upload URL.
 * @param {string} props.contentType - The MIME type of the file.
 * @param {string} props.ext - The file extension.
 * @param {string} props.prefix - The GCS prefix (folder).
 * @returns {Promise<{url: string, key: string} | {error: string}>} - The presigned URL and key, or an error.
 */
export async function getUploadUrlAction(props: z.infer<typeof GetUploadUrlSchema>) {
  try {
    const { contentType, ext, prefix } = GetUploadUrlSchema.parse(props);
    const { url, key } = await getUploadUrl({ contentType, ext, prefix });
    return { url, key };
  } catch (err) {
    console.error(err);
    if (err instanceof z.ZodError) {
      return { error: err.errors.map((e) => e.message).join(', ') };
    }
    return { error: presignError };
  }
}

/**
 * Creates a presigned URL for downloading a file from GCS.
 * This action is rate-limited.
 * @param {string} key - The GCS key of the file.
 * @returns {Promise<{url: string} | {error: string}>} - The presigned URL, or an error.
 */
export async function getDownloadUrlAction(key: string) {
  try {
    const url = await getDownloadUrl(key);
    return { url };
  } catch (err) {
    console.error(err);
    return { error: presignError };
  }
}
