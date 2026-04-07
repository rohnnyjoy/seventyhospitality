import type { TimeSlot } from '@/lib/contexts/bookings/domain';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function getZonedParts(value: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(value)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function partsToDateKey(parts: { year: number; month: number; day: number }) {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function partsToTime(parts: { hour: number; minute: number }) {
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function dateToKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getEventDateKeys(startsAt: Date, endsAt: Date, timeZone: string): string[] {
  const startKey = partsToDateKey(getZonedParts(startsAt, timeZone));
  const endKey = partsToDateKey(getZonedParts(endsAt, timeZone));
  const keys: string[] = [];
  let cursor = startKey;

  while (cursor <= endKey) {
    keys.push(cursor);
    const next = new Date(`${cursor}T00:00:00.000Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    cursor = dateToKey(next);
  }

  return keys;
}

export function getEventCourtSlotOnDate(
  startsAt: Date,
  endsAt: Date,
  timeZone: string,
  date: Date | string,
): TimeSlot | null {
  const bookingDateKey = typeof date === 'string' ? date : dateToKey(date);
  const startParts = getZonedParts(startsAt, timeZone);
  const endParts = getZonedParts(endsAt, timeZone);
  const startDateKey = partsToDateKey(startParts);
  const endDateKey = partsToDateKey(endParts);

  if (bookingDateKey < startDateKey || bookingDateKey > endDateKey) {
    return null;
  }

  const startTime = bookingDateKey === startDateKey ? partsToTime(startParts) : '00:00';
  const endTime = bookingDateKey === endDateKey ? partsToTime(endParts) : '24:00';

  if (startTime >= endTime) {
    return null;
  }

  return { startTime, endTime };
}
