export interface ClubEventCourt {
  id: string;
  name: string;
}

export interface ClubEvent {
  id: string;
  title: string;
  imageUrl: string | null;
  details: string | null;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  active: boolean;
  courts: ClubEventCourt[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ClubEventCourtConflict {
  bookingId: string;
  courtId: string;
  courtName: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  date: string;
  startTime: string;
  endTime: string;
}

export const clubEventInvariants = {
  validateTitle(title: string): void {
    if (!title.trim()) {
      throw new ClubEventValidationError('Title is required');
    }
  },

  validateTimezone(timezone: string): void {
    if (!timezone.trim()) {
      throw new ClubEventValidationError('Timezone is required');
    }
  },

  validateSchedule(startsAt: Date, endsAt: Date): void {
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new ClubEventValidationError('Invalid event date');
    }

    if (endsAt <= startsAt) {
      throw new ClubEventValidationError('Event end time must be after the start time');
    }
  },
};

export class ClubEventValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClubEventValidationError';
  }
}

export class ClubEventNotFoundError extends Error {
  constructor(id: string) {
    super(`Event not found: ${id}`);
    this.name = 'ClubEventNotFoundError';
  }
}

export class ClubEventCourtNotFoundError extends Error {
  constructor(ids: string[]) {
    super(`Court not found: ${ids.join(', ')}`);
    this.name = 'ClubEventCourtNotFoundError';
  }
}

export class ClubEventCourtConflictError extends Error {
  constructor(public readonly conflicts: ClubEventCourtConflict[]) {
    super(
      conflicts.length === 1
        ? 'This event conflicts with 1 existing court booking'
        : `This event conflicts with ${conflicts.length} existing court bookings`,
    );
    this.name = 'ClubEventCourtConflictError';
  }
}
