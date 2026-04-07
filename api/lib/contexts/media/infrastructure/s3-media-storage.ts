import { Readable } from 'node:stream';
import { createId } from '@paralleldrive/cuid2';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { MediaStorage, UploadEventImageInput } from '../application';
import type { MediaAsset } from '../domain';
import {
  buildEventImageObjectKey,
  buildEventImagePublicPath,
  getEventImageCacheControl,
  getEventImageObjectKey,
  getFileExtensionForContentType,
} from './managed-media-paths';

interface S3MediaStorageOptions {
  bucket: string;
  region: string;
  prefix?: string;
  client?: S3Client;
}

function resolveStaticAwsCredentialsFromEnv() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();

  if (!accessKeyId || !secretAccessKey) {
    return undefined;
  }

  return {
    accessKeyId,
    secretAccessKey,
    sessionToken: process.env.AWS_SESSION_TOKEN?.trim() || undefined,
  };
}

export class S3MediaStorage implements MediaStorage {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly prefix: string;

  constructor(options: S3MediaStorageOptions) {
    this.bucket = options.bucket;
    this.prefix = options.prefix ?? '';
    this.client = options.client ?? new S3Client({
      region: options.region,
      credentials: resolveStaticAwsCredentialsFromEnv(),
    });
  }

  async saveEventImage(input: UploadEventImageInput): Promise<MediaAsset> {
    const extension = getFileExtensionForContentType(input.contentType, input.filename);
    const objectName = `${createId()}${extension}`;
    const objectKey = buildEventImageObjectKey(objectName, this.prefix);

    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      Body: input.bytes,
      ContentType: input.contentType,
      CacheControl: getEventImageCacheControl(),
    }));

    return {
      publicPath: buildEventImagePublicPath(objectKey),
      contentType: input.contentType,
      sizeBytes: input.bytes.byteLength,
      originalFilename: input.filename || objectName,
    };
  }

  isManagedAsset(publicPath: string): boolean {
    return getEventImageObjectKey(publicPath, this.prefix) != null;
  }

  async deleteManagedAsset(publicPath: string): Promise<void> {
    const objectKey = getEventImageObjectKey(publicPath, this.prefix);
    if (!objectKey) {
      return;
    }

    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
    }));
  }

  async readManagedAsset(publicPath: string) {
    const objectKey = getEventImageObjectKey(publicPath, this.prefix);
    if (!objectKey) {
      return null;
    }

    try {
      const response = await this.client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
      }));

      const bytes = response.Body ? await response.Body.transformToByteArray() : null;
      if (!bytes) {
        return null;
      }

      return {
        body: Readable.from(Buffer.from(bytes)),
        contentType: response.ContentType ?? 'application/octet-stream',
        contentLength: response.ContentLength,
        cacheControl: response.CacheControl ?? getEventImageCacheControl(),
        lastModifiedAt: response.LastModified,
        etag: response.ETag,
      };
    } catch (readError) {
      if (
        typeof readError === 'object' &&
        readError != null &&
        (
          ('name' in readError && ((readError as { name?: string }).name === 'NoSuchKey' || (readError as { name?: string }).name === 'NotFound')) ||
          ('$metadata' in readError && (readError as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404)
        )
      ) {
        return null;
      }

      throw readError;
    }
  }
}
