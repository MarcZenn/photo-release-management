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
// read them via useTheme() instead. Swap the values below (and the asset at
// logoUrl) once U3 delivers the real MSU Denver brand kit — nothing else in
// the app needs to change.
export const theme: ThemeConfig = {
  appName: 'MSU Denver Photo Release',
  legalEntityName: 'Metropolitan State University of Denver',
  logoUrl: '/theme/logo-placeholder.svg',
  colors: {
    primary: '#004990',
    accent: '#c8102e',
  },
}
