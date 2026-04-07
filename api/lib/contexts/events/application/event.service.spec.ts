import { ClubEventService } from './event.service';
import type { ClubEventRepository } from '../infrastructure';
import type { ClubEvent } from '../domain';
import type { CourtBookingConflictRecord } from '@/lib/contexts/bookings/infrastructure/booking.repository';

function mockEventRepo(): ClubEventRepository {
  return {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    listCourtBlockingSlots: vi.fn(),
  } as unknown as ClubEventRepository;
}

function mockBookingRepo() {
  return {
    listConfirmedCourtBookings: vi.fn().mockResolvedValue([] as CourtBookingConflictRecord[]),
    cancelMany: vi.fn(),
  };
}

function mockCourtRepo() {
  return {
    listByIds: vi.fn().mockResolvedValue([]),
  };
}

function mockMediaStore() {
  return {
    isManagedAsset: vi.fn().mockReturnValue(true),
    attachManagedAssetToOwner: vi.fn(),
    deleteManagedAsset: vi.fn(),
  };
}

function makeEvent(overrides: Partial<ClubEvent> = {}): ClubEvent {
  return {
    id: 'evt_1',
    title: 'Sunday Open Play',
    imageUrl: '/uploads/event-images/original.png',
    details: 'Round robin',
    startsAt: new Date('2026-04-05T14:00:00.000Z'),
    endsAt: new Date('2026-04-05T22:00:00.000Z'),
    timezone: 'America/New_York',
    active: true,
    courts: [],
    createdAt: new Date('2026-04-01T12:00:00.000Z'),
    updatedAt: new Date('2026-04-01T12:00:00.000Z'),
    ...overrides,
  };
}

describe('ClubEventService', () => {
  it('attaches uploaded images when creating an event', async () => {
    const repo = mockEventRepo();
    const bookingRepo = mockBookingRepo();
    const courtRepo = mockCourtRepo();
    const mediaStore = mockMediaStore();
    const createdEvent = makeEvent();
    (repo.create as ReturnType<typeof vi.fn>).mockResolvedValue(createdEvent);
    const service = new ClubEventService(repo, bookingRepo, courtRepo, mediaStore);

    const result = await service.create({
      title: createdEvent.title,
      imageUrl: createdEvent.imageUrl,
      startsAt: createdEvent.startsAt,
      endsAt: createdEvent.endsAt,
      timezone: createdEvent.timezone,
      active: true,
    });

    expect(result).toBe(createdEvent);
    expect(mediaStore.attachManagedAssetToOwner).toHaveBeenCalledWith(createdEvent.imageUrl, {
      ownerType: 'club-event',
      ownerId: createdEvent.id,
    });
  });

  it('attaches a replacement image and discards the previous one on update', async () => {
    const repo = mockEventRepo();
    const bookingRepo = mockBookingRepo();
    const courtRepo = mockCourtRepo();
    const mediaStore = mockMediaStore();
    const existing = makeEvent();
    const updated = makeEvent({
      imageUrl: '/uploads/event-images/replacement.png',
      updatedAt: new Date('2026-04-02T12:00:00.000Z'),
    });
    (repo.getById as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
    (repo.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated);
    const service = new ClubEventService(repo, bookingRepo, courtRepo, mediaStore);

    const result = await service.update(existing.id, {
      imageUrl: updated.imageUrl,
    });

    expect(result).toBe(updated);
    expect(mediaStore.attachManagedAssetToOwner).toHaveBeenCalledWith(updated.imageUrl, {
      ownerType: 'club-event',
      ownerId: updated.id,
    });
    expect(mediaStore.deleteManagedAsset).toHaveBeenCalledWith(existing.imageUrl);
  });

  it('does not discard the image when it is unchanged on update', async () => {
    const repo = mockEventRepo();
    const bookingRepo = mockBookingRepo();
    const courtRepo = mockCourtRepo();
    const mediaStore = mockMediaStore();
    const existing = makeEvent();
    const updated = makeEvent({
      updatedAt: new Date('2026-04-02T12:00:00.000Z'),
    });
    (repo.getById as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
    (repo.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated);
    const service = new ClubEventService(repo, bookingRepo, courtRepo, mediaStore);

    await service.update(existing.id, {
      details: 'Updated details',
    });

    expect(mediaStore.attachManagedAssetToOwner).toHaveBeenCalledWith(updated.imageUrl, {
      ownerType: 'club-event',
      ownerId: updated.id,
    });
    expect(mediaStore.deleteManagedAsset).not.toHaveBeenCalled();
  });

  it('rejects unmanaged image urls', async () => {
    const repo = mockEventRepo();
    const bookingRepo = mockBookingRepo();
    const courtRepo = mockCourtRepo();
    const mediaStore = mockMediaStore();
    (mediaStore.isManagedAsset as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const service = new ClubEventService(repo, bookingRepo, courtRepo, mediaStore);

    await expect(service.create({
      title: 'Bad Image Event',
      imageUrl: 'https://example.com/image.png',
      startsAt: new Date('2026-04-05T14:00:00.000Z'),
      endsAt: new Date('2026-04-05T15:00:00.000Z'),
      timezone: 'America/New_York',
      active: true,
    })).rejects.toThrow('uploaded through the media endpoint');
  });
});
