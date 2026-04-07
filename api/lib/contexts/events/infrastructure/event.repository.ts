import type { Prisma, PrismaClient } from '@prisma/client';
import type { TimeSlot } from '@/lib/contexts/bookings/domain';
import { dateToKey, getEventCourtSlotOnDate, type ClubEvent } from '../domain';

export interface ListClubEventsOptions {
  includeInactive?: boolean;
  includePast?: boolean;
}

export interface ClubEventWriteInput {
  title: string;
  imageUrl: string | null;
  details: string | null;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  active: boolean;
  courtIds: string[];
}

const clubEventInclude = {
  courts: {
    include: {
      court: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      court: {
        name: 'asc' as const,
      },
    },
  },
} as const;

type ClubEventRecord = Prisma.ClubEventGetPayload<{ include: typeof clubEventInclude }>;
type ClubEventCourtBlockRecord = Prisma.ClubEventGetPayload<{
  select: {
    startsAt: true;
    endsAt: true;
    timezone: true;
  };
}>;

function toDomainEvent(event: ClubEventRecord): ClubEvent {
  return {
    id: event.id,
    title: event.title,
    imageUrl: event.imageUrl,
    details: event.details,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timezone: event.timezone,
    active: event.active,
    courts: event.courts.map((claim) => ({
      id: claim.court.id,
      name: claim.court.name,
    })),
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

function toCourtClaimCreate(courtIds: string[]) {
  return courtIds.map((courtId) => ({ courtId }));
}

export class ClubEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(options: ListClubEventsOptions): Promise<ClubEvent[]> {
    const where: Prisma.ClubEventWhereInput = {};

    if (!options.includeInactive) {
      where.active = true;
    }

    if (!options.includePast) {
      where.endsAt = { gte: new Date() };
    }

    const events = await this.prisma.clubEvent.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      include: clubEventInclude,
    });
    return events.map(toDomainEvent);
  }

  async getById(id: string): Promise<ClubEvent | null> {
    const event = await this.prisma.clubEvent.findUnique({
      where: { id },
      include: clubEventInclude,
    });
    return event ? toDomainEvent(event) : null;
  }

  async create(data: ClubEventWriteInput): Promise<ClubEvent> {
    const { courtIds, ...eventData } = data;
    const event = await this.prisma.clubEvent.create({
      data: {
        ...eventData,
        courts: courtIds.length > 0 ? { create: toCourtClaimCreate(courtIds) } : undefined,
      },
      include: clubEventInclude,
    });
    return toDomainEvent(event);
  }

  async update(id: string, data: ClubEventWriteInput): Promise<ClubEvent> {
    const { courtIds, ...eventData } = data;
    const event = await this.prisma.clubEvent.update({
      where: { id },
      data: {
        ...eventData,
        courts: {
          deleteMany: {},
          ...(courtIds.length > 0 ? { create: toCourtClaimCreate(courtIds) } : {}),
        },
      },
      include: clubEventInclude,
    });
    return toDomainEvent(event);
  }

  async listCourtBlockingSlots(courtId: string, date: Date): Promise<TimeSlot[]> {
    const events = await this.prisma.clubEvent.findMany({
      where: {
        active: true,
        courts: {
          some: { courtId },
        },
      },
      select: {
        startsAt: true,
        endsAt: true,
        timezone: true,
      },
      orderBy: { startsAt: 'asc' },
    });

    const dateKey = dateToKey(date);
    return events
      .map((event: ClubEventCourtBlockRecord) =>
        getEventCourtSlotOnDate(event.startsAt, event.endsAt, event.timezone, dateKey),
      )
      .filter((slot): slot is TimeSlot => slot != null);
  }
}
