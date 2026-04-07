import { useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { api, ApiError } from '../../lib/api';
import { AppScreen } from '../../components/AppScreen';
import { EmptyStateView } from '../../components/EmptyStateView';
import { SectionCard } from '../../components/SectionCard';
import { colors, radius, spacing } from '../../theme/tokens';

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function FacilityDetailScreen() {
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    facilityType?: string;
    facilityId?: string;
    name?: string;
    date?: string;
  }>();

  const facilityType = getSingleParam(params.facilityType) === 'shower' ? 'shower' : 'court';
  const facilityId = getSingleParam(params.facilityId) ?? '';
  const facilityName = getSingleParam(params.name) ?? facilityId;
  const date = getSingleParam(params.date) ?? new Date().toISOString().slice(0, 10);

  const availabilityQuery = useQuery({
    queryKey: ['availability', facilityType, facilityId, date],
    queryFn: () =>
      facilityType === 'court'
        ? api.getCourtAvailability(facilityId, date)
        : api.getShowerAvailability(facilityId, date),
    enabled: facilityId.length > 0,
  });

  const bookingMutation = useMutation({
    mutationFn: (startTime: string) =>
      api.createMyBooking({
        facilityType,
        facilityId,
        date,
        startTime,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['availability', facilityType, facilityId, date] }),
        queryClient.invalidateQueries({ queryKey: ['home'] }),
        queryClient.invalidateQueries({ queryKey: ['my-bookings'] }),
      ]);
    },
  });

  const slotGroups = useMemo(() => {
    return availabilityQuery.data ?? [];
  }, [availabilityQuery.data]);

  return (
    <AppScreen>
      <SectionCard
        title={facilityName}
        subtitle={`${facilityType === 'court' ? 'Court' : 'Shower'} availability for ${date}`}
      >
        {availabilityQuery.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : slotGroups.length === 0 ? (
          <EmptyStateView
            title="No open times"
            description="Choose another date or try a different facility."
          />
        ) : (
          <View style={styles.slotList}>
            {slotGroups.map((slot) => (
              <Pressable
                key={`${slot.startTime}-${slot.endTime}`}
                onPress={() =>
                  Alert.alert(
                    `Book ${facilityName}?`,
                    `${date} | ${slot.startTime} - ${slot.endTime}`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Confirm',
                        onPress: () =>
                          bookingMutation.mutate(slot.startTime, {
                            onSuccess: () => {
                              Alert.alert('Booked', `${facilityName} is reserved for ${slot.startTime}.`);
                            },
                            onError: (err) => {
                              const message = err instanceof ApiError ? err.message : 'Booking failed';
                              Alert.alert('Unable to book', message);
                            },
                          }),
                      },
                    ],
                  )
                }
                style={({ pressed }) => [styles.slotCard, pressed ? styles.slotCardPressed : null]}
              >
                <Text style={styles.slotTitle}>
                  {slot.startTime} - {slot.endTime}
                </Text>
                <Text style={styles.slotMeta}>Tap to confirm this slot</Text>
              </Pressable>
            ))}
          </View>
        )}
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotList: {
    gap: spacing.sm,
  },
  slotCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  slotCardPressed: {
    opacity: 0.92,
  },
  slotTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  slotMeta: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
