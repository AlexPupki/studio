import { describe, it, expect } from 'vitest';
import { getS3Client } from '@/lib/server/gcs';
import { getEnv } from '@/lib/server/config.server';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';

describe('S3 Connection', () => {
  it('should connect to S3-compatible storage and list objects', async () => {
    try {
      const s3Client = getS3Client();
      const bucketName = getEnv('S3_BUCKET_NAME');

      expect(bucketName, 'S3_BUCKET_NAME environment variable is not set').toBeDefined();

      // The command will list up to 1 object.
      // It's a lightweight way to check if credentials and bucket name are correct.
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        MaxKeys: 1,
      });

      const response = await s3Client.send(command);

      // We expect the command to succeed without throwing an error.
      // The response should be an object.
      expect(response).toBeInstanceOf(Object);
      expect(response.$metadata.httpStatusCode).toBe(200);

      console.log('S3-compatible storage connection test successful!');
    } catch (error) {
      console.error(
        'S3 connection test failed. Please check your S3_* environment variables.'
      );
      throw error;
    }
  });
});
