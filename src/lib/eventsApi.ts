import { supabase } from './supabaseClient'

export interface EventSummary {
  id: string
  name: string
  submissionCount: number
  createdAt: string
}

interface EventSummaryFromApi {
  id: string
  name: string
  submission_count: number
  created_at: string
}

export interface FindOrCreateEventResult {
  eventId: string
  name: string
}

// Staff-authenticated. Feeds /dashboard/events — every event with its
// submission count, newest first.
export async function listAllEvents(): Promise<EventSummary[]> {
  const { data, error } = await supabase.rpc('list_events', { query: null })
  if (error) throw error
  return (data as EventSummaryFromApi[]).map((row) => ({
    id: row.id,
    name: row.name,
    submissionCount: row.submission_count,
    createdAt: row.created_at,
  }))
}

// Staff-authenticated. Upsert-by-name (case-insensitive) — resolves to an
// existing event or creates one. GenerateQrPanel calls this before
// generate_consent_token.
export async function findOrCreateEvent(name: string): Promise<FindOrCreateEventResult> {
  const { data, error } = await supabase.rpc('find_or_create_event', { name })
  if (error) throw error
  return { eventId: data.eventId, name: data.name }
}

// True if `err` is the error rename_event throws on a near-duplicate name
// (23505, forced via the RPC's explicit `event_name_taken` exception).
export function isEventNameTakenError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'message' in err && (err as { message: unknown }).message === 'event_name_taken'
}

// Admin-only. Typo-correction rename — see isEventNameTakenError for the
// one error case callers need to special-case inline.
export async function renameEvent(eventId: string, newName: string): Promise<FindOrCreateEventResult> {
  const { data, error } = await supabase.rpc('rename_event', { event_id: eventId, new_name: newName })
  if (error) throw error
  return { eventId: data.eventId, name: data.name }
}
