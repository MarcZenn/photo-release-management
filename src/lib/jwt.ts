// Client-side JWT payload decoding only — never treat this as verification.
// The server (PostgREST/Postgres, via the JWT signature) is the only place
// claims are actually trusted; this is UX-only (see AdminRouteGuard).
export function decodeJwtClaims(token: string): Record<string, unknown> | null {
  const payload = token.split('.')[1]
  if (!payload) return null

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}
