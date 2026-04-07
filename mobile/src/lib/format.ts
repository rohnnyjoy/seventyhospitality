export function formatDateLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTimeLabel(dateTime: string) {
  return new Date(dateTime).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatEventWindow(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const day = startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'numeric',
    day: 'numeric',
  });
  const startTime = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  const endTime = endDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${day} | ${startTime} - ${endTime}`;
}

export function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getUpcomingDateKeys(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    value.setDate(value.getDate() + index);
    return toDateKey(value);
  });
}

export function getMemberLabel(id: string) {
  return `#${id.slice(0, 5).toUpperCase()}`;
}
