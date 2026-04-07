import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../lib/api';
import { formatEventWindow } from '../../lib/format';
import { AppScreen } from '../../components/AppScreen';
import { EventSpotlightCard } from '../../components/EventSpotlightCard';
import { SectionCard } from '../../components/SectionCard';
import { colors, spacing } from '../../theme/tokens';

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function EventDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const eventId = getSingleParam(params.id) ?? '';

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => api.getEvent(eventId),
    enabled: eventId.length > 0,
  });

  return (
    <AppScreen>
      {eventQuery.isLoading || !eventQuery.data ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <>
          <EventSpotlightCard compact event={eventQuery.data} />
          <SectionCard title="Schedule" subtitle={formatEventWindow(eventQuery.data.startsAt, eventQuery.data.endsAt)}>
            <Text style={styles.body}>
              {eventQuery.data.courts.length > 0
                ? `Courts reserved: ${eventQuery.data.courts.map((court) => court.name).join(', ')}`
                : 'No courts are claimed for this event.'}
            </Text>
          </SectionCard>
          <SectionCard title="Details">
            <ScrollView nestedScrollEnabled>
              <Text style={styles.body}>
                {eventQuery.data.details ?? 'Event details will be posted soon.'}
              </Text>
            </ScrollView>
          </SectionCard>
        </>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
});
