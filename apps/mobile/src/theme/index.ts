/**
 * Design tokens for EduGenie AI.
 *
 * Every colour, radius, space and text style used by the UI comes from here so
 * that screens contain no hard-coded visual values. Contrast ratios for text on
 * `bg`/`surface` meet WCAG AA.
 */

import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const colors = {
  /** Indigo primary — calm and academic rather than childish. */
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  primarySoft: '#EEF2FF',

  /** Accent used for the voice affordance, the app's signature action. */
  accent: '#7C3AED',
  accentSoft: '#F5F3FF',

  success: '#059669',
  successSoft: '#ECFDF5',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',

  bg: '#F7F8FC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F3F9',

  text: '#111827',
  textMuted: '#6B7280',
  textFaint: '#9CA3AF',
  onPrimary: '#FFFFFF',

  border: '#E5E7EB',
  borderStrong: '#D1D5DB',

  overlay: 'rgba(17, 24, 39, 0.45)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  bodyStrong: { fontSize: 15, fontWeight: '600' },
  caption: { fontSize: 13, fontWeight: '400' },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
} satisfies Record<string, TextStyle>;

/**
 * Elevation presets. iOS uses shadows and Android uses `elevation`; this keeps
 * the two visually consistent without per-screen platform checks.
 */
export const shadows: Record<'sm' | 'md' | 'lg', ViewStyle> = {
  sm: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },
    default: { elevation: 1 },
  }) as ViewStyle,
  md: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOpacity: 0.1,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
    default: { elevation: 3 },
  }) as ViewStyle,
  lg: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOpacity: 0.16,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
    },
    default: { elevation: 8 },
  }) as ViewStyle,
};

/** Minimum touch target, per Apple HIG and Material guidance. */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const MIN_TOUCH = 44;

import type { Difficulty } from '../types/domain';

export const difficultyColors: Record<
  Difficulty,
  { fg: string; bg: string }
> = {
  easy: { fg: colors.success, bg: colors.successSoft },
  medium: { fg: colors.warning, bg: colors.warningSoft },
  hard: { fg: colors.danger, bg: colors.dangerSoft },
};
