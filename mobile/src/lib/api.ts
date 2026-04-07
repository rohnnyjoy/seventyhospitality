import { API_URL } from './env';

export interface SessionUser {
  userId: string;
  email: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  amountCents: number;
  interval: string;
  active?: boolean;
}

export interface MemberProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  membership: {
    id: string;
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    plan: MembershipPlan;
  } | null;
}

export interface MemberProfilePayload {
  member: MemberProfile | null;
  plans: MembershipPlan[];
}

export interface Facility {
  id: string;
  name: string;
  slotDurationMinutes: number;
  operatingHoursStart: string;
  operatingHoursEnd: string;
}

export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
}

export interface UpcomingBooking {
  id: string;
  facilityType: 'court' | 'shower';
  facilityId: string;
  facilityName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
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
  courts: Array<{
    id: string;
    name: string;
  }>;
}

export interface HomePayload {
  member: MemberProfile | null;
  spotlightEvents: ClubEvent[];
  upcomingBookings: UpcomingBooking[];
}

type FacilityType = 'court' | 'shower';

let authToken: string | null = null;

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
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

function resolveApiAssetUrl(imageUrl: string | null): string | null {
  if (!imageUrl) {
    return null;
  }

  if (/^(?:[a-z]+:)?\/\//i.test(imageUrl) || imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
    return imageUrl;
  }

  try {
    return new URL(imageUrl, API_URL).toString();
  } catch {
    const baseUrl = API_URL.replace(/\/+$/, '');
    const normalizedPath = imageUrl.replace(/^\/+/, '');
    return `${baseUrl}/${normalizedPath}`;
  }
}

function normalizeEvent(event: ClubEvent): ClubEvent {
  return {
    ...event,
    imageUrl: resolveApiAssetUrl(event.imageUrl),
  };
}

function normalizeEvents(events: ClubEvent[]): ClubEvent[] {
  return events.map(normalizeEvent);
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  headers.set('Content-Type', 'application/json');

  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  const json = normalizeJsonResponse(text);

  if (!response.ok) {
    throw new ApiError(
      json.error?.code ?? 'UNKNOWN',
      json.error?.message ?? 'Request failed',
      response.status,
    );
  }

  return json.data as T;
}

export function setApiToken(token: string | null) {
  authToken = token;
}

export const api = {
  sendMagicLink(email: string, redirectTo: string) {
    return request<{ sent: true }>('/api/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({ email, redirectTo }),
    });
  },
  getCurrentUser() {
    return request<SessionUser | null>('/api/auth/me');
  },
  logout() {
    return request<{ loggedOut: true }>('/api/auth/logout', {
      method: 'POST',
    });
  },
  getHome() {
    return request<HomePayload>('/api/me/home').then((payload) => ({
      ...payload,
      spotlightEvents: normalizeEvents(payload.spotlightEvents),
    }));
  },
  getProfile() {
    return request<MemberProfilePayload>('/api/me/profile');
  },
  getMyBookings() {
    return request<UpcomingBooking[]>('/api/me/bookings');
  },
  createMyBooking(input: {
    facilityType: FacilityType;
    facilityId: string;
    date: string;
    startTime: string;
  }) {
    return request<UpcomingBooking>('/api/me/bookings', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  cancelMyBooking(bookingId: string) {
    return request<{ cancelled: true }>(`/api/me/bookings/${bookingId}`, {
      method: 'DELETE',
    });
  },
  listCourts() {
    return request<Facility[]>('/api/courts');
  },
  listShowers() {
    return request<Facility[]>('/api/showers');
  },
  getCourtAvailability(courtId: string, date: string) {
    return request<AvailabilitySlot[]>(`/api/courts/${courtId}/availability?date=${date}`);
  },
  getShowerAvailability(showerId: string, date: string) {
    return request<AvailabilitySlot[]>(`/api/showers/${showerId}/availability?date=${date}`);
  },
  listEvents() {
    return request<ClubEvent[]>('/api/events').then(normalizeEvents);
  },
  getEvent(id: string) {
    return request<ClubEvent>(`/api/events/${id}`).then(normalizeEvent);
  },
  createCheckoutSession(memberId: string, planId: string) {
    return request<{ url: string }>('/api/stripe/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ memberId, planId }),
    });
  },
  createPortalSession(memberId: string) {
    return request<{ url: string }>('/api/stripe/create-portal-session', {
      method: 'POST',
      body: JSON.stringify({ memberId }),
    });
  },
};
