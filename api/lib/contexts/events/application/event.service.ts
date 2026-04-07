import {
  ClubEventCourtConflictError,
  ClubEventCourtNotFoundError,
  type ClubEvent,
  type ClubEventCourt,
  ClubEventNotFoundError,
  ClubEventValidationError,
  clubEventInvariants,
  dateToKey,
  getEventCourtSlotOnDate,
  getEventDateKeys,
  type ClubEventCourtConflict,
} from '../domain';
import type { ClubEventRepository, ClubEventWriteInput, ListClubEventsOptions } from '../infrastructure';
import type { CourtBookingConflictRecord } from '@/lib/contexts/bookings/infrastructure/booking.repository';
import { slotsOverlap } from '@/lib/contexts/bookings/domain';

export interface CreateClubEventInput {
  title: string;
  imageUrl?: string | null;
  details?: string | null;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  active?: boolean;
  courtIds?: string[];
  cancelConflictingBookings?: boolean;
}

export interface UpdateClubEventInput {
  title?: string;
  imageUrl?: string | null;
  details?: string | null;
  startsAt?: Date;
  endsAt?: Date;
  timezone?: string;
  active?: boolean;
  courtIds?: string[];
  cancelConflictingBookings?: boolean;
}

interface ManagedEventImageStore {
  deleteManagedAsset(publicPath: string | null | undefined): Promise<void>;
  isManagedAsset(publicPath: string | null | undefined): boolean;
  attachManagedAssetToOwner(
    publicPath: string | null | undefined,
    owner: { ownerType: string; ownerId: string },
  ): Promise<void>;
}

interface EventBookingConflictStore {
  listConfirmedCourtBookings(courtIds: string[], dates: Date[]): Promise<CourtBookingConflictRecord[]>;
  cancelMany(ids: string[]): Promise<void>;
}

interface EventCourtCatalog {
  listByIds(ids: string[]): Promise<Array<Pick<ClubEventCourt, 'id' | 'name'>>>;
}

export class ClubEventService {
  constructor(
    private readonly repo: ClubEventRepository,
    private readonly bookingRepo: EventBookingConflictStore,
    private readonly courtRepo: EventCourtCatalog,
    private readonly mediaStore: ManagedEventImageStore,
  ) {}

  async list(query: ListClubEventsOptions) {
    return this.repo.list(query);
  }

  async getById(id: string) {
    const event = await this.repo.getById(id);
    if (!event) throw new ClubEventNotFoundError(id);
    return event;
  }

  async create(input: CreateClubEventInput) {
    const eventData = await this.prepareWriteInput(input);
    const event = await this.repo.create(eventData);
    await this.attachEventImage(event.imageUrl, event.id);
    return event;
  }

  async update(id: string, input: UpdateClubEventInput) {
    const existing = await this.repo.getById(id);
    if (!existing) throw new ClubEventNotFoundError(id);
    const eventData = await this.prepareWriteInput(input, existing);
    const updated = await this.repo.update(id, eventData);
    await this.attachEventImage(updated.imageUrl, updated.id);
    await this.cleanupReplacedManagedImage(existing.imageUrl, updated.imageUrl);
    return updated;
  }

  private async prepareWriteInput(
    input: CreateClubEventInput | UpdateClubEventInput,
    existing?: ClubEvent,
  ): Promise<ClubEventWriteInput> {
    const eventData: ClubEventWriteInput = {
      title: input.title ?? existing?.title ?? '',
      imageUrl: input.imageUrl === undefined ? existing?.imageUrl ?? null : input.imageUrl ?? null,
      details: input.details === undefined ? existing?.details ?? null : input.details ?? null,
      startsAt: input.startsAt ?? existing?.startsAt ?? new Date(Number.NaN),
      endsAt: input.endsAt ?? existing?.endsAt ?? new Date(Number.NaN),
      timezone: input.timezone ?? existing?.timezone ?? '',
      active: input.active ?? existing?.active ?? true,
      courtIds: this.normalizeCourtIds(input.courtIds ?? existing?.courts.map((court) => court.id) ?? []),
    };

    this.validateEvent(eventData.title, eventData.startsAt, eventData.endsAt, eventData.timezone);
    this.validateEventImage(eventData.imageUrl);

    const courts = await this.loadCourts(eventData.courtIds);
    await this.resolveCourtConflicts(
      eventData,
      courts,
      input.cancelConflictingBookings ?? false,
    );

    return eventData;
  }

  private validateEvent(title: string, startsAt: Date, endsAt: Date, timezone: string) {
    clubEventInvariants.validateTitle(title);
    clubEventInvariants.validateTimezone(timezone);
    clubEventInvariants.validateSchedule(startsAt, endsAt);
  }

  private validateEventImage(imageUrl: string | null) {
    if (!imageUrl) {
      return;
    }

    if (!this.mediaStore.isManagedAsset(imageUrl)) {
      throw new ClubEventValidationError('Event images must be uploaded through the media endpoint');
    }
  }

  private normalizeCourtIds(ids?: string[]) {
    return [...new Set((ids ?? []).map((id) => id.trim()).filter(Boolean))];
  }

  private async loadCourts(courtIds: string[]) {
    if (courtIds.length === 0) return [];

    const courts = await this.courtRepo.listByIds(courtIds);
    if (courts.length !== courtIds.length) {
      const foundIds = new Set(courts.map((court) => court.id));
      throw new ClubEventCourtNotFoundError(courtIds.filter((id) => !foundIds.has(id)));
    }

    return courts;
  }

  private async resolveCourtConflicts(
    eventData: ClubEventWriteInput,
    courts: Array<Pick<ClubEventCourt, 'id' | 'name'>>,
    cancelConflictingBookings: boolean,
  ) {
    if (!eventData.active || eventData.courtIds.length === 0) return;

    const conflicts = await this.listCourtConflicts(eventData, courts);
    if (conflicts.length === 0) return;

    if (!cancelConflictingBookings) {
      throw new ClubEventCourtConflictError(conflicts);
    }

    await this.bookingRepo.cancelMany([...new Set(conflicts.map((conflict) => conflict.bookingId))]);
  }

  private async listCourtConflicts(eventData: ClubEventWriteInput, courts: Array<Pick<ClubEventCourt, 'id' | 'name'>>): Promise<ClubEventCourtConflict[]> {
    const eventDateKeys = getEventDateKeys(eventData.startsAt, eventData.endsAt, eventData.timezone);
    const bookings = await this.bookingRepo.listConfirmedCourtBookings(
      eventData.courtIds,
      eventDateKeys.map((dateKey) => new Date(dateKey)),
    );
    const courtNames = new Map(courts.map((court) => [court.id, court.name]));

    return bookings
      .filter((booking) => {
        const eventSlot = getEventCourtSlotOnDate(
          eventData.startsAt,
          eventData.endsAt,
          eventData.timezone,
          dateToKey(booking.date),
        );
        if (!eventSlot) return false;
        return slotsOverlap(eventSlot, {
          startTime: booking.startTime,
          endTime: booking.endTime,
        });
      })
      .map((booking) => ({
        bookingId: booking.id,
        courtId: booking.facilityId,
        courtName: courtNames.get(booking.facilityId) ?? booking.facilityId,
        memberId: booking.memberId,
        memberName: `${booking.member.firstName} ${booking.member.lastName}`.trim(),
        memberEmail: booking.member.email,
        date: dateToKey(booking.date),
        startTime: booking.startTime,
        endTime: booking.endTime,
      }));
  }

  private async cleanupReplacedManagedImage(previousImageUrl: string | null, nextImageUrl: string | null) {
    if (!previousImageUrl || previousImageUrl === nextImageUrl) {
      return;
    }

    await this.mediaStore.deleteManagedAsset(previousImageUrl);
  }

  private async attachEventImage(imageUrl: string | null, eventId: string) {
    await this.mediaStore.attachManagedAssetToOwner(imageUrl, {
      ownerType: 'club-event',
      ownerId: eventId,
    });
  }
}
