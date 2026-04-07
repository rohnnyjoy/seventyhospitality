import { MediaService, type ManagedMediaAssetRepository, type MediaStorage } from './media.service';
import type { ManagedMediaAsset, MediaAsset } from '../domain';

function mockStorage(): MediaStorage {
  return {
    saveEventImage: vi.fn(),
    deleteManagedAsset: vi.fn(),
    readManagedAsset: vi.fn(),
    isManagedAsset: vi.fn().mockReturnValue(true),
  };
}

function mockAssetRepo(): ManagedMediaAssetRepository {
  return {
    createPendingEventImage: vi.fn(),
    attachManagedAsset: vi.fn(),
    markManagedAssetDiscarded: vi.fn(),
    listStalePendingEventImages: vi.fn().mockResolvedValue([]),
  };
}

function makeAsset(overrides: Partial<MediaAsset> = {}): MediaAsset {
  return {
    publicPath: '/uploads/event-images/test-image.png',
    contentType: 'image/png',
    sizeBytes: 128,
    originalFilename: 'poster.png',
    ...overrides,
  };
}

function makeManagedAsset(overrides: Partial<ManagedMediaAsset> = {}): ManagedMediaAsset {
  return {
    ...makeAsset(),
    usage: 'event-image',
    status: 'pending',
    ownerType: null,
    ownerId: null,
    createdAt: new Date('2026-04-01T12:00:00.000Z'),
    attachedAt: null,
    discardedAt: null,
    ...overrides,
  };
}

describe('MediaService', () => {
  it('records uploaded event images as pending managed assets', async () => {
    const storage = mockStorage();
    const assetRepo = mockAssetRepo();
    const asset = makeAsset();
    (storage.saveEventImage as ReturnType<typeof vi.fn>).mockResolvedValue(asset);
    const service = new MediaService(storage, assetRepo);

    const result = await service.uploadEventImage({
      filename: 'poster.png',
      contentType: 'image/png',
      bytes: Buffer.from('png'),
    });

    expect(result).toEqual(asset);
    expect(assetRepo.createPendingEventImage).toHaveBeenCalledWith(asset);
  });

  it('attaches managed assets to an owner', async () => {
    const storage = mockStorage();
    const assetRepo = mockAssetRepo();
    const service = new MediaService(storage, assetRepo);

    await service.attachManagedAssetToOwner('/uploads/event-images/test-image.png', {
      ownerType: 'club-event',
      ownerId: 'evt_1',
    });

    expect(assetRepo.attachManagedAsset).toHaveBeenCalledWith('/uploads/event-images/test-image.png', {
      ownerType: 'club-event',
      ownerId: 'evt_1',
    });
  });

  it('deletes and discards managed assets', async () => {
    const storage = mockStorage();
    const assetRepo = mockAssetRepo();
    const service = new MediaService(storage, assetRepo);

    await service.deleteManagedAsset('/uploads/event-images/test-image.png');

    expect(storage.deleteManagedAsset).toHaveBeenCalledWith('/uploads/event-images/test-image.png');
    expect(assetRepo.markManagedAssetDiscarded).toHaveBeenCalledWith('/uploads/event-images/test-image.png');
  });

  it('cleans up stale pending event images', async () => {
    const storage = mockStorage();
    const assetRepo = mockAssetRepo();
    const staleAssets = [
      makeManagedAsset({ publicPath: '/uploads/event-images/one.png' }),
      makeManagedAsset({ publicPath: '/uploads/event-images/two.png' }),
    ];
    (assetRepo.listStalePendingEventImages as ReturnType<typeof vi.fn>).mockResolvedValue(staleAssets);
    const service = new MediaService(storage, assetRepo);
    const now = new Date('2026-04-04T12:00:00.000Z');

    const result = await service.cleanupStaleEventImages({
      maxAgeHours: 24,
      limit: 10,
      now,
    });

    expect(assetRepo.listStalePendingEventImages).toHaveBeenCalledWith(
      new Date('2026-04-03T12:00:00.000Z'),
      10,
    );
    expect(storage.deleteManagedAsset).toHaveBeenNthCalledWith(1, '/uploads/event-images/one.png');
    expect(storage.deleteManagedAsset).toHaveBeenNthCalledWith(2, '/uploads/event-images/two.png');
    expect(assetRepo.markManagedAssetDiscarded).toHaveBeenNthCalledWith(1, '/uploads/event-images/one.png', now);
    expect(assetRepo.markManagedAssetDiscarded).toHaveBeenNthCalledWith(2, '/uploads/event-images/two.png', now);
    expect(result).toEqual({
      deletedCount: 2,
      deletedImageUrls: ['/uploads/event-images/one.png', '/uploads/event-images/two.png'],
      cutoff: new Date('2026-04-03T12:00:00.000Z'),
    });
  });
});
