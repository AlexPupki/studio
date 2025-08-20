'use server';

import { Storage } from '@google-cloud/storage';
import { getEnv } from './config.server';

let storage: Storage | undefined;

function getStorageClient(): Storage {
    if (!storage) {
        storage = new Storage();
    }
    return storage;
}

/**
 * Generates a v4 signed URL for uploading a file to GCS.
 * @param bucketName The name of the GCS bucket.
 * @param fileName The name of the file to upload.
 * @param contentType The MIME type of the file.
 * @param expiresIn The URL expiration time in seconds.
 * @returns The signed URL and the final file path.
 */
export async function generateUploadUrl(
    fileName: string,
    contentType: string,
    expiresIn: number = 3600 // 1 hour
): Promise<{ url: string; path: string }> {
    const bucketName = getEnv('GCS_BUCKET');
     if (!bucketName) {
        throw new Error("GCS_BUCKET environment variable is not set.");
    }
    const storageClient = getStorageClient();

    const options = {
        version: 'v4' as const,
        action: 'write' as const,
        expires: Date.now() + expiresIn * 1000,
        contentType,
    };

    const [url] = await storageClient
        .bucket(bucketName)
        .file(fileName)
        .getSignedUrl(options);

    return { url, path: fileName };
}

/**
 * Generates a v4 signed URL for downloading a file from GCS.
 * @param filePath The full path to the file in the bucket.
 * @param expiresIn The URL expiration time in seconds.
 * @returns The signed URL.
 */
export async function generateDownloadUrl(
    filePath: string,
    expiresIn: number = 3600 // 1 hour
): Promise<string> {
    const bucketName = getEnv('GCS_BUCKET');
     if (!bucketName) {
        throw new Error("GCS_BUCKET environment variable is not set.");
    }
    const storageClient = getStorageClient();

    const options = {
        version: 'v4' as const,
        action: 'read' as const,
        expires: Date.now() + expiresIn * 1000,
    };

    const [url] = await storageClient
        .bucket(bucketName)
        .file(filePath)
        .getSignedUrl(options);

    return url;
}
