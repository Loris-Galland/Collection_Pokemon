import { Platform } from 'react-native';

// Design system tokens. A single dark theme, which makes card previews stand out.

export const colors = {
  background: '#0B0B10',
  surface: '#15151D',
  surfaceRaised: '#1E1E29',
  border: '#2A2A38',
  text: '#F4F4F8',
  textMuted: '#9A9AB0',
  textFaint: '#5E5E72',
  accent: '#FFD23F',
  accentText: '#1A1400',
  success: '#4ADE80',
  danger: '#F87171',
  successSoft: 'rgba(74, 222, 128, 0.12)',
  dangerSoft: 'rgba(248, 113, 113, 0.12)',
  /** Background of the badges laid over a card image. */
  overlay: 'rgba(11, 11, 16, 0.86)',
  /** Wishlist color. */
  wish: '#FF6B9D',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '800' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 1.2 },
} as const;

/** On the web the tab bar floats at the top of the screen, so tab screens leave room for it. */
export const WEB_TAB_BAR_OFFSET = Platform.OS === 'web' ? 56 : 0;

/** Width to height ratio of a Pokémon card (63 × 88 mm). */
export const CARD_ASPECT_RATIO = 63 / 88;
