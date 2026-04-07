export interface Facility {
  id: string;
  name: string;
  slotDurationMinutes: number;
  operatingHoursStart: string;
  operatingHoursEnd: string;
  maxAdvanceDays: number;
  maxBookingsPerMemberPerDay: number;
  cancellationDeadlineMinutes: number;
  active: boolean;
}

export type FacilityOption = Pick<Facility, 'id' | 'name' | 'active'>;
