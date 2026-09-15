import { supabase } from './supabaseClient'

export interface SearchResultRow {
  id: string
  fullName: string
  phone: string
  email: string
  submittedAt: string
  eventName: string | null
}

export interface PhotoReleaseDetail {
  id: string
  fullName: string
  phone: string
  email: string
  signatureImage: string // full data: URI, as produced by SignaturePad.toDataUrl() and stored as-is by create_photo_release
  submittedAt: string
  legalNoticeVersion: string // raw legal_notice_versions.version_id — matches the TDD's record_detail field, not resolved to notice text/source_reference here
  eventName: string | null
  appearanceDescription: string | null
}

// get_photo_release returns jsonb built via row_to_json (not
// jsonb_build_object like the other RPCs), so its keys are the actual
// snake_case column names, not camelCase.
interface SearchResultRowFromApi {
  id: string
  full_name: string
  phone: string
  email: string
  submitted_at: string
  event_name: string | null
}

interface PhotoReleaseDetailFromApi extends SearchResultRowFromApi {
  signature_image: string
  legal_notice_version: string
  appearance_description: string | null
}

// Staff-authenticated. Every call writes exactly one audit_log row
// server-side (RECORD_SEARCH here, RECORD_VIEW in getPhotoReleaseById) —
// see B11.
export async function searchPhotoReleases(query: string): Promise<SearchResultRow[]> {
  const { data, error } = await supabase.rpc('get_photo_release', { query })
  if (error) throw error

  return (data as SearchResultRowFromApi[]).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    submittedAt: row.submitted_at,
    eventName: row.event_name,
  }))
}

export async function getPhotoReleaseById(id: string): Promise<PhotoReleaseDetail | null> {
  const { data, error } = await supabase.rpc('get_photo_release', { release_id: id })
  if (error) throw error

  const rows = data as PhotoReleaseDetailFromApi[]
  const row = rows[0]
  if (!row) return null

  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    signatureImage: row.signature_image,
    submittedAt: row.submitted_at,
    legalNoticeVersion: row.legal_notice_version,
    eventName: row.event_name,
    appearanceDescription: row.appearance_description,
  }
}

export interface EventRosterRow {
  id: string
  fullName: string
  phone: string
  email: string
  submittedAt: string
}

interface EventRosterRowFromApi {
  id: string
  full_name: string
  phone: string
  email: string
  submitted_at: string
}

export interface EventRoster {
  eventName: string
  totalCount: number
  rows: EventRosterRow[]
}

interface EventRosterFromApi {
  eventName: string
  totalCount: number
  rows: EventRosterRowFromApi[]
}

// Staff-authenticated. Feeds EventDetailPage (F7). Writes one RECORD_SEARCH
// audit row server-side, same sensitivity class as a name/email/phone search.
export async function getEventRoster(eventId: string): Promise<EventRoster> {
  const { data, error } = await supabase.rpc('get_photo_release', { event_id: eventId })
  if (error) throw error

  const result = data as EventRosterFromApi
  return {
    eventName: result.eventName,
    totalCount: result.totalCount,
    rows: result.rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      email: row.email,
      submittedAt: row.submitted_at,
    })),
  }
}
