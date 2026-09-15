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
export async function generateConsentToken(eventId: string): Promise<ConsentToken> {
  const { data, error } = await supabase.rpc('generate_consent_token', { event_id: eventId })
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

export interface ActiveConsentToken {
  tokenId: string
  eventId: string
  eventName: string
  expiresAt: string
}

interface ActiveConsentTokenFromApi {
  token_id: string
  event_id: string
  event_name: string
  expires_at: string
}

// Staff-authenticated. Feeds GenerateQrPanel's "Use Existing QR code" list —
// every currently-unexpired token, system-wide (not scoped to the calling
// staff member — see the migration note), so any active QR a colleague
// already generated can be picked back up and redisplayed without minting a
// new token.
export async function listActiveConsentTokens(): Promise<ActiveConsentToken[]> {
  const { data, error } = await supabase.rpc('list_active_consent_tokens')
  if (error) throw error
  return (data as ActiveConsentTokenFromApi[]).map((row) => ({
    tokenId: row.token_id,
    eventId: row.event_id,
    eventName: row.event_name,
    expiresAt: row.expires_at,
  }))
}

export interface CreatePhotoReleaseInput {
  consentToken: string
  fullName: string
  phone: string
  email: string
  signatureImage: string
  ageAttested: boolean
  noticeAcknowledged: boolean
  appearanceDescription?: string
}

export interface CreatePhotoReleaseResult {
  releaseId: string
  submittedAt: string
}

// True if `err` is the PostgrestError create_photo_release throws for an
// invalid/expired token (PT401, forced via PostgREST's PTxyz convention —
// see the migration). Duck-typed rather than importing PostgrestError, since
// the only thing that matters here is the `code` field.
export function isInvalidTokenError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === 'PT401'
}

// Public, unauthenticated. Since I1's multi-submission revision, this
// succeeds for as many participants as use the same still-unexpired
// token — duplicate-submission protection for one participant's accidental
// double-tap is the caller's job (disable Submit while in flight), not this
// function's.
export async function createPhotoRelease(input: CreatePhotoReleaseInput): Promise<CreatePhotoReleaseResult> {
  const { data, error } = await supabase.rpc('create_photo_release', {
    consent_token: input.consentToken,
    full_name: input.fullName,
    phone: input.phone,
    email: input.email,
    signature_image: input.signatureImage,
    age_attested: input.ageAttested,
    notice_acknowledged: input.noticeAcknowledged,
    appearance_description: input.appearanceDescription?.trim() || null,
  })
  if (error) throw error
  return { releaseId: data.releaseId, submittedAt: data.submittedAt }
}
