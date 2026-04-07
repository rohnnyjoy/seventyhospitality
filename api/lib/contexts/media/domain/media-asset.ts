export interface MediaAsset {
  publicPath: string;
  contentType: string;
  sizeBytes: number;
  originalFilename: string;
}

export const EVENT_IMAGE_USAGE = 'event-image';
export const MEDIA_ASSET_STATUS_PENDING = 'pending';
export const MEDIA_ASSET_STATUS_ATTACHED = 'attached';
export const MEDIA_ASSET_STATUS_DISCARDED = 'discarded';

export interface ManagedMediaAsset extends MediaAsset {
  usage: typeof EVENT_IMAGE_USAGE;
  status: typeof MEDIA_ASSET_STATUS_PENDING | typeof MEDIA_ASSET_STATUS_ATTACHED | typeof MEDIA_ASSET_STATUS_DISCARDED;
  ownerType: string | null;
  ownerId: string | null;
  createdAt: Date;
  attachedAt: Date | null;
  discardedAt: Date | null;
}

export const MAX_EVENT_IMAGE_BYTES = 5 * 1024 * 1024;
export const EVENT_IMAGE_MAX_DIMENSION_PX = 1600;

export const EVENT_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const mediaInvariants = {
  validateEventImageContentType(contentType: string): void {
    if (!EVENT_IMAGE_MIME_TYPES.includes(contentType as (typeof EVENT_IMAGE_MIME_TYPES)[number])) {
      throw new MediaValidationError('Event images must be JPG, PNG, WebP, or GIF files');
    }
  },

  validateEventImageSize(sizeBytes: number): void {
    if (sizeBytes <= 0) {
      throw new MediaValidationError('Image upload is empty');
    }

    if (sizeBytes > MAX_EVENT_IMAGE_BYTES) {
      throw new MediaValidationError('Event images must be 5 MB or smaller');
    }
  },
};

export class MediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaValidationError';
  }
}
