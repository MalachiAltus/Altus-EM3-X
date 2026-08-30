/**
 * EM3 X design tokens — the single swap point for the app's visual identity.
 * Screens should import colors/spacing/radii/type from here, never hard-code values.
 */

export const colors = {
  // Brand — dark blue / light blue / white
  navy: '#12335C',
  navyDark: '#0B2545',
  blue: '#2E7DD1',
  blueDark: '#1F63AC',
  skyTint: '#E4F1FC',
  white: '#FFFFFF',

  // Neutrals
  ink: '#1F2430',
  muted: '#6B7280',
  subtle: '#9CA3AF',
  border: '#E2E8F0',
  background: '#F7F9FC',
  card: '#FFFFFF',

  // Status (semantic, not brand — used for badges/alerts only)
  success: '#1F6B3D',
  successBg: '#E7F5EC',
  warning: '#8A6114',
  warningBg: '#FBF1DC',
  danger: '#8F2323',
  dangerBg: '#FBE7E7',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const type = {
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodyBold: { fontSize: 16, fontWeight: '600' as const },
  small: { fontSize: 13, fontWeight: '400' as const },
  label: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.4 },
} as const;

// Minimum interactive target size per App Store checklist item #16 (44x44pt).
export const minTapTarget = 44;

// Caps content width on web so screens don't stretch edge-to-edge in a
// desktop browser window — every layout here was designed phone-width.
// Native ignores this (screens are never wider than the device).
export const webContentMaxWidth = 900;
