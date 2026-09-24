export const leeColors = {
  black: '#050304',
  background: '#090708',
  surface: '#150B0E',
  surfaceRaised: '#211116',
  burgundy: '#35131C',
  crimson: '#C91F41',
  crimsonDeep: '#94112D',
  rose: '#DF6375',
  ivory: '#F7F0E8',
  muted: '#C0B8BA',
  coolGray: '#A5A0A4',
  healthy: '#72D79A',
  caution: '#E7B458',
  blocked: '#D52B4A',
  divider: '#512330',
} as const;

export const leeSpace = { xs: 6, sm: 10, md: 16, lg: 22, xl: 28, xxl: 36 } as const;
export const leeRadius = { card: 18, control: 14, pill: 999, sheet: 26 } as const;
export const leeTouch = { minimum: 48, nav: 76, todayDiameter: 64 } as const;
export const leeType = {
  display: 'Cormorant Garamond',
  body: 'Inter',
  titleSize: 42,
  sectionSize: 25,
  bodySize: 16,
  metaSize: 14,
  microSize: 12,
} as const;

export const mobileTokens = {
  colors: {
    black: leeColors.black,
    background: leeColors.background,
    surface: leeColors.surface,
    surfaceRaised: leeColors.surfaceRaised,
    surfaceSubtle: leeColors.burgundy,
    burgundy: leeColors.burgundy,
    crimsonDeep: leeColors.crimsonDeep,
    rose: leeColors.rose,
    foreground: leeColors.ivory,
    mutedForeground: leeColors.muted,
    primary: leeColors.crimson,
    primaryForeground: '#FFFFFF',
    accent: '#4A1B27',
    accentForeground: '#FFE9EC',
    border: leeColors.divider,
    divider: leeColors.divider,
    input: '#652D3D',
    destructive: leeColors.blocked,
    destructiveForeground: '#FFFFFF',
    success: leeColors.healthy,
    warning: leeColors.caution,
  },
  spacing: leeSpace,
  radius: {
    sm: leeRadius.control,
    md: leeRadius.control,
    lg: leeRadius.card,
    pill: leeRadius.pill,
  },
  typography: {
    eyebrow: leeType.microSize,
    meta: leeType.metaSize,
    body: leeType.bodySize,
    title: 34,
    display: leeType.titleSize,
  },
  icon: {
    sm: 16,
    md: 20,
    lg: 24,
  },
  touchTarget: leeTouch.minimum,
  motion: {
    quick: 160,
    standard: 220,
  },
} as const;

export type MobilePalette = typeof mobileTokens.colors;