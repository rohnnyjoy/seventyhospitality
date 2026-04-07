export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function getZonedParts(value: string | Date, timeZone: string) {
  const date = toDate(value);
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
      .formatToParts(date)
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

function getTimeZoneOffsetMs(value: Date, timeZone: string): number {
  const parts = getZonedParts(value, timeZone);
  const utcTimestamp = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return utcTimestamp - value.getTime();
}

function isSameZonedDay(start: string | Date, end: string | Date, timeZone: string): boolean {
  const startParts = getZonedParts(start, timeZone);
  const endParts = getZonedParts(end, timeZone);

  return (
    startParts.year === endParts.year &&
    startParts.month === endParts.month &&
    startParts.day === endParts.day
  );
}

export function formatEventDate(value: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'numeric',
    day: 'numeric',
  }).format(toDate(value));
}

export function formatEventTime(value: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(toDate(value));
}

export function formatEventDuration(start: string | Date, end: string | Date): string {
  const diffMs = Math.max(0, toDate(end).getTime() - toDate(start).getTime());
  const totalMinutes = Math.round(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

export function formatEventSchedule(start: string | Date, end: string | Date, timeZone: string): string {
  const duration = formatEventDuration(start, end);

  if (isSameZonedDay(start, end, timeZone)) {
    return `${formatEventDate(start, timeZone)} · ${formatEventTime(start, timeZone)} - ${formatEventTime(end, timeZone)} (${duration})`;
  }

  return `${formatEventDate(start, timeZone)} ${formatEventTime(start, timeZone)} → ${formatEventDate(end, timeZone)} ${formatEventTime(end, timeZone)} (${duration})`;
}

export function formatDateTimeInputValue(value: string | Date, timeZone: string): string {
  const parts = getZonedParts(value, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function parseDateTimeInputValue(value: string, timeZone: string): string {
  const [datePart, timePart] = value.split('T');
  if (!datePart || !timePart) {
    throw new Error('Date and time are required');
  }

  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  if ([year, month, day, hour, minute].some((part) => Number.isNaN(part))) {
    throw new Error('Invalid date or time');
  }

  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let result = new Date(utcGuess);
  let offset = getTimeZoneOffsetMs(result, timeZone);
  result = new Date(utcGuess - offset);

  const resolvedOffset = getTimeZoneOffsetMs(result, timeZone);
  if (resolvedOffset !== offset) {
    result = new Date(utcGuess - resolvedOffset);
  }

  return result.toISOString();
}
