import { supabase } from './supabaseClient'

export interface ConsentToken {
  tokenId: string
  expiresAt: string
}

export interface ConsentTokenStatus {
  valid: boolean
  expiresAt?: string
  legalNoticeVersionId?: string
  legalNoticeText?: string
  legalNoticeSourceReference?: string
}

// Staff-authenticated. Called from the dashboard shell (I1) to mint a fresh
// token for a QR code — the token allows unlimited submissions until it
// expires (product decision, 2026-08-21), not just one.
export async function generateConsentToken(): Promise<ConsentToken> {
  const { data, error } = await supabase.rpc('generate_consent_token')
  if (error) throw error
  return { tokenId: data.tokenId, expiresAt: data.expiresAt }
}

// Public, unauthenticated — the only anonymous read the consent form needs
// before rendering: is this token still usable, and if so, what's the
// current legal notice.
export async function getConsentTokenStatus(tokenId: string): Promise<ConsentTokenStatus> {
  const { data, error } = await supabase.rpc('get_consent_token_status', { token_id: tokenId })
  if (error) throw error
  return data as ConsentTokenStatus
}
