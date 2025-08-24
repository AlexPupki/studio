

'use server';

import { Storage, StorageOptions } from '@google-cloud/storage';
import { getEnv } from './config.server';

let storage: Storage | undefined;

function getStorageClient(): Storage {
    if (storage) {
        return storage;
    }
    
    const projectId = getEnv('GCS_PROJECT_ID');
    const clientEmail = getEnv('GCS_CLIENT_EMAIL');
    const privateKey = getEnv('GCS_PRIVATE_KEY')?.replace(/\\n/g, '\n');

    const options: StorageOptions = {};

    if (projectId && clientEmail && privateKey) {
        // If individual credential components are provided, use them.
        options.projectId = projectId;
        options.credentials = {
            client_email: clientEmail,
            private_key: privateKey,
        };
        console.log("Initializing GCS client with credentials from environment variables.");
    } else {
        // Otherwise, fall back to Application Default Credentials (ADC).
        // This will work automatically in Google Cloud environments.
        console.log("Initializing GCS client with Application Default Credentials.");
    }

    storage = new Storage(options);
    return storage;
}

/**
 * Generates a v4 signed URL for uploading a file to GCS.
 * @param fileName The name of the file to upload.
 * @param contentType The MIME type of the file.
 * @returns The signed URL and the final file path.
 */
export async function generateUploadUrl(
    fileName: string,
    contentType: string,
): Promise<{ url: string; path: string }> {
    const bucketName = getEnv('GCS_BUCKET');
     if (!bucketName) {
        throw new Error("GCS_BUCKET environment variable is not set.");
    }
    const storageClient = getStorageClient();
    const expiresIn = getEnv('GCS_SIGNED_URL_TTL_SECONDS');

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
 * @returns The signed URL.
 */
export async function generateDownloadUrl(
    filePath: string,
): Promise<string> {
    const bucketName = getEnv('GCS_BUCKET');
     if (!bucketName) {
        throw new Error("GCS_BUCKET environment variable is not set.");
    }
    const storageClient = getStorageClient();
    const expiresIn = getEnv('GCS_SIGNED_URL_TTL_SECONDS');

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
