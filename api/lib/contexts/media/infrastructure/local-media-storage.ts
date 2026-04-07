import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createId } from '@paralleldrive/cuid2';
import type { MediaStorage, UploadEventImageInput } from '../application';
import type { MediaAsset } from '../domain';
import {
  buildEventImageObjectKey,
  buildEventImagePublicPath,
  getEventImageCacheControl,
  getEventImageDirectory,
  getEventImageObjectKey,
  getFileExtensionForContentType,
  inferContentTypeFromObjectKey,
} from './managed-media-paths';

export function getMediaUploadsRoot(cwd = process.cwd()): string {
  return path.resolve(cwd, 'uploads');
}

export async function ensureMediaUploadsRoot(rootDir = getMediaUploadsRoot()): Promise<void> {
  await mkdir(path.join(rootDir, getEventImageDirectory()), { recursive: true });
}

function toEventImagesDir(rootDir: string): string {
  return path.join(rootDir, getEventImageDirectory());
}

export class LocalMediaStorage implements MediaStorage {
  constructor(
    private readonly uploadsRoot = getMediaUploadsRoot(),
  ) {}

  async saveEventImage(input: UploadEventImageInput): Promise<MediaAsset> {
    await ensureMediaUploadsRoot(this.uploadsRoot);

    const extension = getFileExtensionForContentType(input.contentType, input.filename);
    const objectName = `${createId()}${extension}`;
    const objectKey = buildEventImageObjectKey(objectName);
    const filePath = path.join(this.uploadsRoot, objectKey);

    await writeFile(filePath, input.bytes);

    return {
      publicPath: buildEventImagePublicPath(objectKey),
      contentType: input.contentType,
      sizeBytes: input.bytes.byteLength,
      originalFilename: input.filename || objectName,
    };
  }

  isManagedAsset(publicPath: string): boolean {
    return getEventImageObjectKey(publicPath) != null;
  }

  async deleteManagedAsset(publicPath: string): Promise<void> {
    const objectKey = getEventImageObjectKey(publicPath);
    if (!objectKey) return;

    const rootDir = path.resolve(this.uploadsRoot);
    const filePath = path.resolve(rootDir, objectKey);

    if (!filePath.startsWith(`${rootDir}${path.sep}`)) {
      return;
    }

    await rm(filePath, { force: true });
  }

  async readManagedAsset(publicPath: string) {
    const objectKey = getEventImageObjectKey(publicPath);
    if (!objectKey) {
      return null;
    }

    const rootDir = path.resolve(this.uploadsRoot);
    const filePath = path.resolve(rootDir, objectKey);

    if (!filePath.startsWith(`${rootDir}${path.sep}`)) {
      return null;
    }

    try {
      const fileStat = await stat(filePath);
      return {
        body: createReadStream(filePath),
        contentType: inferContentTypeFromObjectKey(objectKey),
        contentLength: fileStat.size,
        cacheControl: getEventImageCacheControl(),
        lastModifiedAt: fileStat.mtime,
      };
    } catch (readError) {
      if (
        typeof readError === 'object' &&
        readError != null &&
        'code' in readError &&
        (readError as { code?: string }).code === 'ENOENT'
      ) {
        return null;
      }

      throw readError;
    }
  }
}
