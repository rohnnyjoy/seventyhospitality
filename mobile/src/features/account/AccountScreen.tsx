import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { api, ApiError } from '../../lib/api';
import { formatDateLabel } from '../../lib/format';
import { useSession } from '../../lib/session';
import { AppScreen } from '../../components/AppScreen';
import { BookingCard } from '../../components/BookingCard';
import { EmptyStateView } from '../../components/EmptyStateView';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SectionCard } from '../../components/SectionCard';
import { colors, radius, spacing } from '../../theme/tokens';

export function AccountScreen() {
  const queryClient = useQueryClient();
  const { signOut } = useSession();

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: api.getProfile,
  });
  const bookingsQuery = useQuery({
    queryKey: ['my-bookings'],
    queryFn: api.getMyBookings,
  });

  const checkoutMutation = useMutation({
    mutationFn: async (planId: string) => {
      const memberId = profileQuery.data?.member?.id;
      if (!memberId) {
        throw new Error('No member profile found');
      }
      return api.createCheckoutSession(memberId, planId);
    },
    onSuccess: async ({ url }) => {
      await WebBrowser.openBrowserAsync(url);
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Unable to open checkout';
      Alert.alert('Checkout unavailable', message);
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const memberId = profileQuery.data?.member?.id;
      if (!memberId) {
        throw new Error('No member profile found');
      }
      return api.createPortalSession(memberId);
    },
    onSuccess: async ({ url }) => {
      await WebBrowser.openBrowserAsync(url);
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Unable to open billing portal';
      Alert.alert('Portal unavailable', message);
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: api.cancelMyBooking,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['home'] }),
        queryClient.invalidateQueries({ queryKey: ['my-bookings'] }),
      ]);
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Unable to cancel booking';
      Alert.alert('Cancellation unavailable', message);
    },
  });

  if (profileQuery.isLoading || bookingsQuery.isLoading) {
    return (
      <AppScreen scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </AppScreen>
    );
  }

  const member = profileQuery.data?.member ?? null;
  const plans = profileQuery.data?.plans ?? [];
  const bookings = bookingsQuery.data ?? [];

  return (
    <AppScreen>
      <SectionCard title="Account">
        {member ? (
          <View style={styles.profileBlock}>
            <Text style={styles.profileName}>
              {member.firstName} {member.lastName}
            </Text>
            <Text style={styles.profileMeta}>{member.email}</Text>
            {member.phone ? <Text style={styles.profileMeta}>{member.phone}</Text> : null}
          </View>
        ) : (
          <EmptyStateView
            title="No member profile"
            description="This session is active, but it is not linked to a club member record yet."
          />
        )}
      </SectionCard>

      <SectionCard title="Membership">
        {member?.membership ? (
          <View style={styles.membershipBlock}>
            <View style={styles.membershipTag}>
              <Text style={styles.membershipTagLabel}>{member.membership.status}</Text>
            </View>
            <Text style={styles.membershipPlan}>{member.membership.plan.name}</Text>
            <Text style={styles.profileMeta}>
              Current period ends {formatDateLabel(member.membership.currentPeriodEnd.slice(0, 10))}
            </Text>
            <PrimaryButton
              label="Manage Billing"
              variant="secondary"
              loading={portalMutation.isPending}
              onPress={() => portalMutation.mutate()}
            />
          </View>
        ) : plans.length > 0 ? (
          <View style={styles.planList}>
            {plans.map((plan) => (
              <View key={plan.id} style={styles.planCard}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.profileMeta}>
                  ${(plan.amountCents / 100).toFixed(0)}/{plan.interval}
                </Text>
                <PrimaryButton
                  label="Start Membership"
                  loading={checkoutMutation.isPending}
                  onPress={() => checkoutMutation.mutate(plan.id)}
                />
              </View>
            ))}
          </View>
        ) : (
          <EmptyStateView
            title="No plans available"
            description="Membership plans will appear here once they are configured."
          />
        )}
      </SectionCard>

      <SectionCard title="Upcoming Reservations">
        {bookings.length > 0 ? (
          <View style={styles.bookingStack}>
            {bookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onPress={() =>
                  Alert.alert(
                    'Cancel reservation?',
                    `${booking.facilityName} on ${booking.date} at ${booking.startTime}`,
                    [
                      { text: 'Keep', style: 'cancel' },
                      {
                        text: 'Cancel Booking',
                        style: 'destructive',
                        onPress: () => cancelBookingMutation.mutate(booking.id),
                      },
                    ],
                  )
                }
              />
            ))}
          </View>
        ) : (
          <EmptyStateView
            title="Nothing reserved"
            description="Use the Reserve tab to book your next court or shower."
          />
        )}
      </SectionCard>

      <PrimaryButton label="Sign Out" variant="ghost" onPress={() => void signOut()} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBlock: {
    gap: spacing.xs,
  },
  profileName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  profileMeta: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  membershipBlock: {
    gap: spacing.sm,
  },
  membershipTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(229, 240, 164, 0.14)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  membershipTagLabel: {
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 11,
    fontWeight: '700',
  },
  membershipPlan: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  planList: {
    gap: spacing.sm,
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  planName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  bookingStack: {
    gap: spacing.sm,
  },
});
