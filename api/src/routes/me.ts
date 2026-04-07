import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  bookingService,
  clubEventService,
  memberService,
  planRepo,
} from '@/lib/container';
import {
  BookingNotFoundError,
  BookingInPastError,
  BookingTooFarInAdvanceError,
  CancellationDeadlinePassedError,
  FacilityNotFoundError,
  InactiveMembershipError,
  MaxBookingsExceededError,
  OutsideOperatingHoursError,
  SlotUnavailableError,
} from '@/lib/contexts/bookings';
import { error, success } from '@/src/lib/responses';
import { createSelfBookingSchema } from '@/src/lib/validation';

type MemberProfile = Awaited<ReturnType<typeof memberService.findByEmail>>;
type UpcomingBooking = Awaited<ReturnType<typeof bookingService.getMyBookings>>[number];
type ClubEvent = Awaited<ReturnType<typeof clubEventService.list>>[number];

function serializeMember(member: NonNullable<MemberProfile>) {
  return {
    id: member.id,
    email: member.email,
    firstName: member.firstName,
    lastName: member.lastName,
    phone: member.phone,
    membership: member.membership
      ? {
          id: member.membership.id,
          status: member.membership.status,
          currentPeriodEnd: member.membership.currentPeriodEnd.toISOString(),
          cancelAtPeriodEnd: member.membership.cancelAtPeriodEnd,
          plan: {
            id: member.membership.plan.id,
            name: member.membership.plan.name,
            amountCents: member.membership.plan.amountCents,
            interval: member.membership.plan.interval,
          },
        }
      : null,
  };
}

function serializeBooking(
  booking: UpcomingBooking,
  facilityNames: Map<string, string>,
) {
  return {
    id: booking.id,
    facilityType: booking.facilityType,
    facilityId: booking.facilityId,
    facilityName: facilityNames.get(`${booking.facilityType}:${booking.facilityId}`) ?? booking.facilityId,
    date: booking.date.toISOString().slice(0, 10),
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status,
  };
}

function serializeEvent(event: ClubEvent) {
  return {
    id: event.id,
    title: event.title,
    imageUrl: event.imageUrl,
    details: event.details,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    timezone: event.timezone,
    active: event.active,
    courts: event.courts,
  };
}

async function getCurrentMember(req: FastifyRequest) {
  return memberService.findByEmail(req.user!.email);
}

async function getFacilityNames() {
  const [courts, showers] = await Promise.all([
    bookingService.listAllCourts(),
    bookingService.listAllShowers(),
  ]);

  return new Map<string, string>([
    ...courts.map((court) => [`court:${court.id}`, court.name] as const),
    ...showers.map((shower) => [`shower:${shower.id}`, shower.name] as const),
  ]);
}

function handleBookingError(reply: FastifyReply, err: unknown) {
  if (err instanceof FacilityNotFoundError) return error(reply, 'NOT_FOUND', err.message, 404);
  if (err instanceof BookingNotFoundError) return error(reply, 'NOT_FOUND', err.message, 404);
  if (err instanceof SlotUnavailableError) return error(reply, 'SLOT_UNAVAILABLE', err.message, 409);
  if (err instanceof OutsideOperatingHoursError) return error(reply, 'OUTSIDE_HOURS', err.message, 422);
  if (err instanceof MaxBookingsExceededError) return error(reply, 'MAX_BOOKINGS', err.message, 422);
  if (err instanceof BookingTooFarInAdvanceError) return error(reply, 'TOO_FAR_ADVANCE', err.message, 422);
  if (err instanceof BookingInPastError) return error(reply, 'BOOKING_IN_PAST', err.message, 422);
  if (err instanceof CancellationDeadlinePassedError) return error(reply, 'DEADLINE_PASSED', err.message, 422);
  if (err instanceof InactiveMembershipError) return error(reply, 'INACTIVE_MEMBERSHIP', err.message, 403);
  throw err;
}

export async function meRoutes(app: FastifyInstance) {
  app.get('/profile', async (req, reply) => {
    const [member, plans] = await Promise.all([
      getCurrentMember(req),
      planRepo.list(),
    ]);

    return success(reply, {
      member: member ? serializeMember(member) : null,
      plans,
    });
  });

  app.get('/bookings', async (req, reply) => {
    const member = await getCurrentMember(req);
    if (!member) {
      return success(reply, []);
    }

    const [facilityNames, bookings] = await Promise.all([
      getFacilityNames(),
      bookingService.getMyBookings(member.id),
    ]);

    return success(
      reply,
      bookings.map((booking) => serializeBooking(booking, facilityNames)),
    );
  });

  app.post('/bookings', async (req, reply) => {
    const parsed = createSelfBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      return error(reply, 'VALIDATION_ERROR', parsed.error.message);
    }

    const member = await getCurrentMember(req);
    if (!member) {
      return error(reply, 'PROFILE_REQUIRED', 'No member profile found for this account', 403);
    }

    try {
      const booking = parsed.data.facilityType === 'court'
        ? await bookingService.bookCourt(
            parsed.data.facilityId,
            parsed.data.date,
            parsed.data.startTime,
            member.id,
          )
        : await bookingService.bookShower(
            parsed.data.facilityId,
            parsed.data.date,
            parsed.data.startTime,
            member.id,
          );

      const facilityNames = await getFacilityNames();
      return success(reply, serializeBooking(booking, facilityNames), 201);
    } catch (err) {
      return handleBookingError(reply, err);
    }
  });

  app.delete<{ Params: { bookingId: string } }>('/bookings/:bookingId', async (req, reply) => {
    const member = await getCurrentMember(req);
    if (!member) {
      return error(reply, 'PROFILE_REQUIRED', 'No member profile found for this account', 403);
    }

    try {
      await bookingService.cancel(req.params.bookingId, member.id);
      return success(reply, { cancelled: true });
    } catch (err) {
      return handleBookingError(reply, err);
    }
  });

  app.get('/home', async (req, reply) => {
    const member = await getCurrentMember(req);

    const [events, facilityNames, bookings] = await Promise.all([
      clubEventService.list({ includeInactive: false, includePast: false }),
      getFacilityNames(),
      member ? bookingService.getMyBookings(member.id) : Promise.resolve([]),
    ]);

    return success(reply, {
      member: member ? serializeMember(member) : null,
      spotlightEvents: events.slice(0, 6).map(serializeEvent),
      upcomingBookings: bookings.slice(0, 8).map((booking) => serializeBooking(booking, facilityNames)),
    });
  });
}
