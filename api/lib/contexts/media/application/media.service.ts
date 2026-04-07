import type { Readable } from 'node:stream';
import {
  type ManagedMediaAsset,
  type MediaAsset,
  mediaInvariants,
} from '../domain';

export interface UploadEventImageInput {
  filename: string;
  contentType: string;
  bytes: Buffer;
}

export interface MediaAssetReadResult {
  body: Readable;
  contentType: string;
  contentLength?: number;
  cacheControl?: string;
  lastModifiedAt?: Date;
  etag?: string;
}

export interface MediaStorage {
  saveEventImage(input: UploadEventImageInput): Promise<MediaAsset>;
  deleteManagedAsset(publicPath: string): Promise<void>;
  readManagedAsset(publicPath: string): Promise<MediaAssetReadResult | null>;
  isManagedAsset(publicPath: string): boolean;
}

export interface EventImageProcessor {
  normalizeEventImage(input: UploadEventImageInput): Promise<UploadEventImageInput>;
}

export interface MediaAssetOwner {
  ownerType: string;
  ownerId: string;
}

export interface ManagedMediaAssetRepository {
  createPendingEventImage(asset: MediaAsset): Promise<void>;
  attachManagedAsset(publicPath: string, owner: MediaAssetOwner, attachedAt?: Date): Promise<void>;
  markManagedAssetDiscarded(publicPath: string, discardedAt?: Date): Promise<void>;
  listStalePendingEventImages(createdBefore: Date, limit: number): Promise<ManagedMediaAsset[]>;
}

export interface CleanupStaleEventImagesInput {
  maxAgeHours?: number;
  limit?: number;
  now?: Date;
}

export interface CleanupStaleEventImagesResult {
  deletedCount: number;
  deletedImageUrls: string[];
  cutoff: Date;
}

export class MediaService {
  constructor(
    private readonly storage: MediaStorage,
    private readonly assetRepo: ManagedMediaAssetRepository,
    private readonly imageProcessor: EventImageProcessor = passthroughEventImageProcessor,
  ) {}

  async uploadEventImage(input: UploadEventImageInput): Promise<MediaAsset> {
    mediaInvariants.validateEventImageContentType(input.contentType);
    mediaInvariants.validateEventImageSize(input.bytes.byteLength);
    const normalizedInput = await this.imageProcessor.normalizeEventImage(input);
    mediaInvariants.validateEventImageContentType(normalizedInput.contentType);
    mediaInvariants.validateEventImageSize(normalizedInput.bytes.byteLength);
    const asset = await this.storage.saveEventImage(normalizedInput);
    await this.assetRepo.createPendingEventImage(asset);
    return asset;
  }

  async deleteManagedAsset(publicPath: string | null | undefined): Promise<void> {
    if (!publicPath || !this.storage.isManagedAsset(publicPath)) {
      return;
    }

    await this.storage.deleteManagedAsset(publicPath);
    await this.assetRepo.markManagedAssetDiscarded(publicPath);
  }

  async readManagedAsset(publicPath: string): Promise<MediaAssetReadResult | null> {
    if (!this.storage.isManagedAsset(publicPath)) {
      return null;
    }

    return this.storage.readManagedAsset(publicPath);
  }

  isManagedAsset(publicPath: string | null | undefined): boolean {
    if (!publicPath) {
      return false;
    }

    return this.storage.isManagedAsset(publicPath);
  }

  async attachManagedAssetToOwner(publicPath: string | null | undefined, owner: MediaAssetOwner): Promise<void> {
    if (!publicPath || !this.storage.isManagedAsset(publicPath)) {
      return;
    }

    await this.assetRepo.attachManagedAsset(publicPath, owner);
  }

  async cleanupStaleEventImages(input: CleanupStaleEventImagesInput = {}): Promise<CleanupStaleEventImagesResult> {
    const now = input.now ?? new Date();
    const maxAgeHours = coercePositiveInteger(input.maxAgeHours, 24);
    const limit = coercePositiveInteger(input.limit, 100);
    const cutoff = new Date(now.getTime() - maxAgeHours * 60 * 60 * 1000);
    const staleAssets = await this.assetRepo.listStalePendingEventImages(cutoff, limit);
    const deletedImageUrls: string[] = [];

    for (const asset of staleAssets) {
      await this.storage.deleteManagedAsset(asset.publicPath);
      await this.assetRepo.markManagedAssetDiscarded(asset.publicPath, now);
      deletedImageUrls.push(asset.publicPath);
    }

    return {
      deletedCount: deletedImageUrls.length,
      deletedImageUrls,
      cutoff,
    };
  }
}

function coercePositiveInteger(value: number | undefined, fallback: number): number {
  const parsed = typeof value === 'number' ? Math.floor(value) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

const passthroughEventImageProcessor: EventImageProcessor = {
  async normalizeEventImage(input) {
    return input;
  },
};
