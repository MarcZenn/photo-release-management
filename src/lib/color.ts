// Small helpers for deriving hover/tint shades from the theme's runtime
// primary/accent colors (which are arbitrary hex strings, not known at
// build time) — used by the UI primitives for Material-style state colors.
export function darkenHex(hex: string, amount = 0.15): string {
  const c = hex.replace('#', '')
  const bigint = parseInt(c, 16)
  const r = Math.max(0, Math.round(((bigint >> 16) & 255) * (1 - amount)))
  const g = Math.max(0, Math.round(((bigint >> 8) & 255) * (1 - amount)))
  const b = Math.max(0, Math.round((bigint & 255) * (1 - amount)))
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

export function hexToRgba(hex: string, alpha: number): string {
  const c = hex.replace('#', '')
  const bigint = parseInt(c, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
