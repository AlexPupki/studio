'use server';

import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getEnv } from './config.server';
import { logger } from '../logger';

const gcsLogger = logger.withCategory('GCS_SERVICE');
let s3Client: S3Client | undefined;

export function getS3Client(): S3Client {
    if (s3Client) {
        return s3Client;
    }

    const endpoint = getEnv('S3_ENDPOINT_URL');
    const region = getEnv('S3_REGION');
    const accessKeyId = getEnv('S3_ACCESS_KEY_ID');
    const secretAccessKey = getEnv('S3_SECRET_ACCESS_KEY');

    if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
        gcsLogger.error('S3 client configuration is incomplete.');
        throw new Error("S3 client configuration is incomplete. Please check environment variables.");
    }
    
    gcsLogger.debug(`Initializing S3 client for endpoint: ${endpoint} and region: ${region}`);

    s3Client = new S3Client({
        endpoint,
        region,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
        forcePathStyle: true, // Important for GCS and other S3-compatible services
    });

    return s3Client;
}

/**
 * Generates a pre-signed URL for uploading a file to an S3-compatible storage.
 * @param fileName The name of the file to upload.
 * @param contentType The MIME type of the file.
 * @returns The signed URL and the final file path.
 */
export async function generateUploadUrl(
    fileName: string,
    contentType: string,
): Promise<{ url: string; path: string }> {
    const bucketName = getEnv('S3_BUCKET_NAME');
     if (!bucketName) {
        gcsLogger.error('S3_BUCKET_NAME environment variable is not set.');
        throw new Error("S3_BUCKET_NAME environment variable is not set.");
    }
    gcsLogger.time(`generateUploadUrl:${fileName}`);
    const client = getS3Client();
    const expiresIn = getEnv('S3_SIGNED_URL_TTL_SECONDS');

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        ContentType: contentType,
    });
    
    const url = await getSignedUrl(client, command, { expiresIn });
    gcsLogger.info('Generated signed URL for upload', { fileName, path: fileName });
    gcsLogger.timeEnd(`generateUploadUrl:${fileName}`);
    return { url, path: fileName };
}

/**
 * Generates a pre-signed URL for downloading a file from an S3-compatible storage.
 * @param filePath The full path to the file in the bucket.
 * @returns The signed URL.
 */
export async function generateDownloadUrl(
    filePath: string,
): Promise<string> {
    const bucketName = getEnv('S3_BUCKET_NAME');
     if (!bucketName) {
        gcsLogger.error('S3_BUCKET_NAME environment variable is not set.');
        throw new Error("S3_BUCKET_NAME environment variable is not set.");
    }
    gcsLogger.time(`generateDownloadUrl:${filePath}`);
    const client = getS3Client();
    const expiresIn = getEnv('S3_SIGNED_URL_TTL_SECONDS');

     const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: filePath,
    });

    const url = await getSignedUrl(client, command, { expiresIn });
    gcsLogger.info('Generated signed URL for download', { filePath });
    gcsLogger.timeEnd(`generateDownloadUrl:${filePath}`);
    return url;
}
