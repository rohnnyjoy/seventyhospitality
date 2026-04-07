import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../lib/api';
import { formatDateLabel, getMemberLabel } from '../../lib/format';
import { AppScreen } from '../../components/AppScreen';
import { BookingCard } from '../../components/BookingCard';
import { EmptyStateView } from '../../components/EmptyStateView';
import { EventSpotlightCard } from '../../components/EventSpotlightCard';
import { SectionCard } from '../../components/SectionCard';
import { colors, spacing } from '../../theme/tokens';

export function HomeScreen() {
  const router = useRouter();
  const homeQuery = useQuery({
    queryKey: ['home'],
    queryFn: api.getHome,
  });

  if (homeQuery.isLoading) {
    return (
      <AppScreen scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </AppScreen>
    );
  }

  if (homeQuery.isError || !homeQuery.data) {
    return (
      <AppScreen scroll={false}>
        <SectionCard title="Home unavailable" subtitle="The mobile feed could not be loaded right now.">
          <Text style={styles.errorText}>Check the API URL and sign-in session, then try again.</Text>
        </SectionCard>
      </AppScreen>
    );
  }

  const { member, spotlightEvents, upcomingBookings } = homeQuery.data;
  const greetingName = member ? member.firstName : 'Member';
  const memberCode = member ? getMemberLabel(member.id) : '#PENDING';

  return (
    <AppScreen>
      <View style={styles.hero}>
        <View>
          <Text style={styles.memberName}>{greetingName}</Text>
          <Text style={styles.memberCode}>{memberCode}</Text>
        </View>
        <Text style={styles.subtleCopy}>
          {member?.membership
            ? `${member.membership.plan.name} member`
            : 'Magic-link session active'}
        </Text>
      </View>

      <SectionCard title="Events & Spotlight">
        {spotlightEvents.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRail}>
            {spotlightEvents.map((event) => (
              <EventSpotlightCard
                key={event.id}
                event={event}
                onPress={() => router.push(`/event/${event.id}`)}
              />
            ))}
          </ScrollView>
        ) : (
          <EmptyStateView
            title="No spotlight events"
            description="Club events will appear here as soon as they are published."
          />
        )}
      </SectionCard>

      <SectionCard title="Upcoming Reservations">
        {upcomingBookings.length > 0 ? (
          <View style={styles.stack}>
            {upcomingBookings.map((booking, index) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                variant={index === 1 ? 'highlight' : 'standard'}
                onPress={() => router.push('/reserve')}
              />
            ))}
          </View>
        ) : (
          <EmptyStateView
            title="No upcoming bookings"
            description="Reserve a court or shower to populate your home feed."
          />
        )}
      </SectionCard>

      {member?.membership ? (
        <SectionCard title="Membership">
          <Text style={styles.membershipTitle}>{member.membership.plan.name}</Text>
          <Text style={styles.membershipMeta}>
            Status: {member.membership.status} | Renews through {formatDateLabel(member.membership.currentPeriodEnd.slice(0, 10))}
          </Text>
        </SectionCard>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    gap: spacing.xs,
  },
  memberName: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  memberCode: {
    color: colors.accentMuted,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  subtleCopy: {
    color: colors.textMuted,
    fontSize: 14,
  },
  horizontalRail: {
    gap: spacing.md,
    paddingRight: spacing.sm,
  },
  stack: {
    gap: spacing.sm,
  },
  membershipTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  membershipMeta: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  errorText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
