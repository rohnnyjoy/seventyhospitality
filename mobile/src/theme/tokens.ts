export const colors = {
  background: '#202B20',
  backgroundDeep: '#1A231A',
  backgroundElevated: '#2A3628',
  backgroundMuted: '#344434',
  surface: '#415441',
  surfaceAlt: '#516551',
  overlay: 'rgba(10, 18, 10, 0.42)',
  border: 'rgba(232, 241, 223, 0.08)',
  text: '#F2F5EA',
  textMuted: 'rgba(242, 245, 234, 0.66)',
  accent: '#E5F0A4',
  accentStrong: '#F4F7CC',
  accentMuted: '#CDD89B',
  sand: '#D2C3A6',
  sandMuted: '#B8AA90',
  success: '#7F9B74',
  danger: '#D29076',
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 12,
  md: 18,
  lg: 26,
  pill: 999,
} as const;

export const shadows = {
  soft: {
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
} as const;
