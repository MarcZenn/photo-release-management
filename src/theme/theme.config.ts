export interface ThemeConfig {
  appName: string
  legalEntityName: string
  logoUrl: string
  colors: {
    primary: string
    accent: string
  }
}

// Single source of truth for all brand values (NFR11) — logo, color tokens,
// app name, legal-entity name. No component should hardcode any of these;
// read them via useTheme() instead.
export const theme: ThemeConfig = {
  appName: 'MSU Denver Photo Release',
  legalEntityName: 'Metropolitan State University of Denver',
  logoUrl: '/theme/msud-logo.png',
  // Still placeholder — real MSU Denver brand hex values haven't been
  // provided yet (see U3).
  colors: {
    primary: '#004990',
    accent: '#c8102e',
  },
}
