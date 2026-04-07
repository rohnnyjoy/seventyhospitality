import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueries, useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, type AvailabilitySlot } from '../../lib/api';
import { getUpcomingDateKeys } from '../../lib/format';
import { AppScreen } from '../../components/AppScreen';
import { ChoiceChip } from '../../components/ChoiceChip';
import { EmptyStateView } from '../../components/EmptyStateView';
import { SectionCard } from '../../components/SectionCard';
import { colors, radius, spacing } from '../../theme/tokens';

type FacilityType = 'court' | 'shower';

function summarizeAvailability(slots: AvailabilitySlot[]) {
  if (slots.length === 0) {
    return 'No open slots';
  }
  if (slots.length === 1) {
    return `${slots[0].startTime} available`;
  }
  return `${slots[0].startTime}, ${slots[1]?.startTime ?? slots[0].endTime}, +${Math.max(slots.length - 2, 0)} more`;
}

export function ReserveScreen() {
  const router = useRouter();
  const [facilityType, setFacilityType] = useState<FacilityType>('court');
  const [selectedDate, setSelectedDate] = useState(getUpcomingDateKeys(7)[0]);

  const facilitiesQuery = useQuery({
    queryKey: ['facilities', facilityType],
    queryFn: () => (facilityType === 'court' ? api.listCourts() : api.listShowers()),
  });

  const availabilityQueries = useQueries({
    queries: (facilitiesQuery.data ?? []).map((facility) => ({
      queryKey: ['availability', facilityType, facility.id, selectedDate],
      queryFn: () =>
        facilityType === 'court'
          ? api.getCourtAvailability(facility.id, selectedDate)
          : api.getShowerAvailability(facility.id, selectedDate),
    })),
  });

  const facilitiesWithAvailability = useMemo(() => {
    return (facilitiesQuery.data ?? []).map((facility, index) => ({
      facility,
      slots: availabilityQueries[index]?.data ?? [],
      loading: availabilityQueries[index]?.isLoading ?? false,
    }));
  }, [availabilityQueries, facilitiesQuery.data]);

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Reserve</Text>
        <Text style={styles.subtitle}>Choose a day, then open a facility to lock in a time.</Text>
      </View>

      <SectionCard>
        <View style={styles.segmentRow}>
          <ChoiceChip label="Courts" active={facilityType === 'court'} onPress={() => setFacilityType('court')} />
          <ChoiceChip label="Showers" active={facilityType === 'shower'} onPress={() => setFacilityType('shower')} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRail}>
          {getUpcomingDateKeys(7).map((dateKey) => (
            <ChoiceChip
              key={dateKey}
              label={dateKey.slice(5)}
              active={selectedDate === dateKey}
              onPress={() => setSelectedDate(dateKey)}
            />
          ))}
        </ScrollView>
      </SectionCard>

      <SectionCard
        title={facilityType === 'court' ? 'Open Courts' : 'Open Showers'}
        subtitle="Availability snapshots update for the selected day."
      >
        {facilitiesQuery.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : facilitiesWithAvailability.length === 0 ? (
          <EmptyStateView
            title="Nothing to reserve"
            description="Facilities will appear here as soon as they are enabled."
          />
        ) : (
          <View style={styles.list}>
            {facilitiesWithAvailability.map(({ facility, loading, slots }) => (
              <Pressable
                key={facility.id}
                onPress={() =>
                  router.push({
                    pathname: '/reserve/[facilityType]/[facilityId]',
                    params: {
                      facilityType,
                      facilityId: facility.id,
                      name: facility.name,
                      date: selectedDate,
                    },
                  })
                }
                style={({ pressed }) => [styles.facilityCard, pressed ? styles.facilityCardPressed : null]}
              >
                <View style={styles.facilityHeader}>
                  <Text style={styles.facilityName}>{facility.name}</Text>
                  <Text style={styles.facilityMeta}>
                    {loading ? 'Loading slots...' : `${slots.length} open`}
                  </Text>
                </View>
                <Text style={styles.facilitySummary}>{loading ? 'Checking availability' : summarizeAvailability(slots)}</Text>
                <Text style={styles.facilityHint}>Tap to view the full day</Text>
              </Pressable>
            ))}
          </View>
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
  segmentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateRail: {
    gap: spacing.sm,
  },
  center: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: spacing.sm,
  },
  facilityCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  facilityCardPressed: {
    opacity: 0.92,
  },
  facilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  facilityName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  facilityMeta: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  facilitySummary: {
    color: colors.sand,
    fontSize: 13,
  },
  facilityHint: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
