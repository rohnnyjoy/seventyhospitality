import path from 'node:path';

const UPLOADS_PUBLIC_PREFIX = '/uploads';
const EVENT_IMAGE_DIRECTORY = 'event-images';
const EVENT_IMAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

const MIME_TYPE_EXTENSIONS: Record<string, string> = {
  'image/gif': '.gif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export function getEventImageDirectory(): string {
  return EVENT_IMAGE_DIRECTORY;
}

export function getEventImageCacheControl(): string {
  return EVENT_IMAGE_CACHE_CONTROL;
}

export function getFileExtensionForContentType(contentType: string, filename: string): string {
  const filenameExtension = path.extname(filename).toLowerCase();
  return MIME_TYPE_EXTENSIONS[contentType] ?? (filenameExtension || '.bin');
}

export function inferContentTypeFromObjectKey(objectKey: string): string {
  return EXTENSION_CONTENT_TYPES[path.extname(objectKey).toLowerCase()] ?? 'application/octet-stream';
}

export function buildEventImageObjectKey(objectName: string, prefix = ''): string {
  const normalizedPrefix = prefix.trim().replace(/^\/+|\/+$/g, '');
  return normalizedPrefix
    ? path.posix.join(normalizedPrefix, EVENT_IMAGE_DIRECTORY, objectName)
    : path.posix.join(EVENT_IMAGE_DIRECTORY, objectName);
}

export function buildEventImagePublicPath(objectKey: string): string {
  const objectName = getEventImageObjectName(objectKey);
  return path.posix.join(UPLOADS_PUBLIC_PREFIX, EVENT_IMAGE_DIRECTORY, objectName);
}

export function getEventImageObjectKey(publicPath: string, prefix = ''): string | null {
  const expectedPrefix = `${UPLOADS_PUBLIC_PREFIX}/${EVENT_IMAGE_DIRECTORY}/`;
  if (!publicPath.startsWith(expectedPrefix)) {
    return null;
  }

  const objectName = publicPath.slice(expectedPrefix.length).replace(/^\/+/, '');
  if (!objectName || objectName.includes('/')) {
    return null;
  }

  return buildEventImageObjectKey(objectName, prefix);
}

export function getEventImageObjectName(objectKey: string): string {
  const normalizedKey = objectKey.replace(/^\/+/, '');
  const index = normalizedKey.lastIndexOf('/');
  return index >= 0 ? normalizedKey.slice(index + 1) : normalizedKey;
}
