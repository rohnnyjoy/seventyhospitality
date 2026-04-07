// In dev, Vite proxies /api/* to the API server (see vite.config.ts)
// In production, configure your reverse proxy to do the same
import type { ClubEvent, EventListOptions, EventUpsertPayload } from './events';
import type { Facility } from './facilities';

const API_URL = import.meta.env.VITE_API_URL ?? '';

function withQuery(path: string, params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      query.set(key, String(value));
    }
  }

  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}

function normalizeJsonResponse(text: string) {
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  const isFormDataBody = typeof FormData !== 'undefined' && options?.body instanceof FormData;

  if (!isFormDataBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers,
    ...options,
  });

  const text = await res.text();
  const json = normalizeJsonResponse(text);

  if (!res.ok) {
    throw new ApiError(
      json.error?.code ?? 'UNKNOWN',
      json.error?.message ?? 'Request failed',
      res.status,
      json.error?.details,
    );
  }

  return json.data;
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = {
  // Auth
  sendMagicLink: (email: string) =>
    request('/api/auth/magic-link', { method: 'POST', body: JSON.stringify({ email }) }),
  getMe: () => request<{ userId: string; email: string } | null>('/api/auth/me'),
  logout: () => request('/api/auth/logout', { method: 'POST' }),

  // Members
  listMembers: (params?: { search?: string; status?: string; page?: number; limit?: number }) => {
    return request<any>(
      withQuery('/api/members', {
        search: params?.search,
        status: params?.status,
        page: params?.page,
        limit: params?.limit,
      }),
    );
  },
  getMember: (id: string) => request<any>(`/api/members/${id}`),
  createMember: (data: { email: string; firstName: string; lastName: string; phone?: string }) =>
    request<any>('/api/members', { method: 'POST', body: JSON.stringify(data) }),
  updateMember: (id: string, data: Record<string, unknown>) =>
    request<any>(`/api/members/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  addNote: (memberId: string, content: string) =>
    request<any>(`/api/members/${memberId}/notes`, { method: 'POST', body: JSON.stringify({ content }) }),

  // Stripe
  createCheckoutSession: (memberId: string, planId: string) =>
    request<{ url: string }>('/api/stripe/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ memberId, planId }),
    }),
  createPortalSession: (memberId: string) =>
    request<{ url: string }>('/api/stripe/create-portal-session', {
      method: 'POST',
      body: JSON.stringify({ memberId }),
    }),
  // Plans
  listPlans: () => request<any[]>('/api/plans'),

  // Courts
  listCourts: () => request<any[]>('/api/courts'),
  getCourtAvailability: (courtId: string, date: string) =>
    request<any[]>(`/api/courts/${courtId}/availability?date=${date}`),
  bookCourt: (courtId: string, date: string, startTime: string, memberId: string) =>
    request<any>(`/api/courts/${courtId}/bookings`, {
      method: 'POST',
      body: JSON.stringify({ date, startTime, memberId }),
    }),
  cancelCourtBooking: (courtId: string, bookingId: string) =>
    request<any>(`/api/courts/${courtId}/bookings/${bookingId}`, { method: 'DELETE' }),

  // Showers
  listShowers: () => request<any[]>('/api/showers'),
  getShowerAvailability: (showerId: string, date: string) =>
    request<any[]>(`/api/showers/${showerId}/availability?date=${date}`),
  bookShower: (showerId: string, date: string, startTime: string, memberId: string) =>
    request<any>(`/api/showers/${showerId}/bookings`, {
      method: 'POST',
      body: JSON.stringify({ date, startTime, memberId }),
    }),
  cancelShowerBooking: (showerId: string, bookingId: string) =>
    request<any>(`/api/showers/${showerId}/bookings/${bookingId}`, { method: 'DELETE' }),

  // Bookings (admin)
  listBookings: (date?: string) => request<any[]>(withQuery('/api/bookings', { date })),

  // Facility booking count
  getFacilityBookingCount: (type: 'court' | 'shower', id: string) =>
    request<{ count: number }>(`/api/facilities/${type}/${id}/booking-count`),

  // Court admin
  listAllCourts: () => request<Facility[]>('/api/courts/all'),
  createCourt: (data: { name: string }) =>
    request<any>('/api/courts', { method: 'POST', body: JSON.stringify(data) }),
  updateCourt: (id: string, data: Record<string, unknown>) =>
    request<any>(`/api/courts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Shower admin
  listAllShowers: () => request<Facility[]>('/api/showers/all'),
  createShower: (data: { name: string }) =>
    request<any>('/api/showers', { method: 'POST', body: JSON.stringify(data) }),
  updateShower: (id: string, data: Record<string, unknown>) =>
    request<any>(`/api/showers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Events admin
  listEvents: (params?: EventListOptions) =>
    request<ClubEvent[]>(
      withQuery('/api/events', {
        includePast: params?.includePast ? 'true' : undefined,
        includeInactive: params?.includeInactive ? 'true' : undefined,
      }),
    ),
  createEvent: (data: EventUpsertPayload) =>
    request<ClubEvent>('/api/events', { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (id: string, data: EventUpsertPayload) =>
    request<ClubEvent>(`/api/events/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  uploadEventImage: (file: File) => {
    const formData = new FormData();
    formData.set('file', file);
    return request<{ imageUrl: string }>('/api/media/event-images', {
      method: 'POST',
      body: formData,
    });
  },
  deleteEventImage: (imageUrl: string) =>
    request<{ deleted: true }>('/api/media/event-images', {
      method: 'DELETE',
      body: JSON.stringify({ imageUrl }),
    }),
};
