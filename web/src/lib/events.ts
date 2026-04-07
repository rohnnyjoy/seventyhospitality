import type { FacilityOption } from './facilities';

export interface ClubEventCourt {
  id: string;
  name: string;
}

export interface ClubEvent {
  id: string;
  title: string;
  imageUrl: string | null;
  details: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  active: boolean;
  courts: ClubEventCourt[];
  createdAt: string;
  updatedAt: string;
}

export type CourtOption = FacilityOption;

export interface CourtConflict {
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

export interface CourtConflictDetails {
  conflicts: CourtConflict[];
}

export interface EventListOptions {
  includePast?: boolean;
  includeInactive?: boolean;
}

export interface EventUpsertPayload {
  title: string;
  imageUrl: string | null;
  details: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  active: boolean;
  courtIds: string[];
  cancelConflictingBookings?: boolean;
}

const MANAGED_EVENT_IMAGE_PREFIX = '/uploads/event-images/';

export function resolveEventImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  if (/^(?:[a-z]+:)?\/\//i.test(imageUrl) || imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
    return imageUrl;
  }

  const configuredBase = import.meta.env.VITE_API_URL?.trim();
  const baseUrl = configuredBase || (typeof window !== 'undefined' ? window.location.origin : '');
  if (!baseUrl) return imageUrl;

  try {
    return new URL(imageUrl, baseUrl).toString();
  } catch {
    return imageUrl;
  }
}

export function isManagedEventImageUrl(imageUrl: string | null): boolean {
  return typeof imageUrl === 'string' && imageUrl.startsWith(MANAGED_EVENT_IMAGE_PREFIX);
}

export function isCourtConflictDetails(value: unknown): value is CourtConflictDetails {
  return (
    value != null &&
    typeof value === 'object' &&
    'conflicts' in value &&
    Array.isArray((value as { conflicts: unknown }).conflicts)
  );
}

export function serializeSelectedIds(ids: string[]): string {
  return [...new Set(ids)].sort().join('|');
}

export function toggleSelectedId(ids: string[], nextId: string, checked: boolean): string[] {
  const nextIds = checked ? [...ids, nextId] : ids.filter((id) => id !== nextId);
  return [...new Set(nextIds)];
}
