import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api } from '../../lib/api';
import { AppScreen } from '../../components/AppScreen';
import { EmptyStateView } from '../../components/EmptyStateView';
import { EventSpotlightCard } from '../../components/EventSpotlightCard';
import { SectionCard } from '../../components/SectionCard';
import { colors, spacing } from '../../theme/tokens';

export function ConnectScreen() {
  const router = useRouter();
  const eventsQuery = useQuery({
    queryKey: ['events'],
    queryFn: api.listEvents,
  });

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Connect</Text>
        <Text style={styles.subtitle}>Upcoming club events, lessons, and member programming.</Text>
      </View>

      <SectionCard title="Club Calendar">
        {eventsQuery.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : eventsQuery.data && eventsQuery.data.length > 0 ? (
          <View style={styles.stack}>
            {eventsQuery.data.map((event) => (
              <EventSpotlightCard
                key={event.id}
                compact
                event={event}
                onPress={() => router.push(`/event/${event.id}`)}
              />
            ))}
          </View>
        ) : (
          <EmptyStateView
            title="No upcoming events"
            description="When new club programming is scheduled, it will land here."
          />
        )}
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
  },
  center: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stack: {
    gap: spacing.md,
  },
});
