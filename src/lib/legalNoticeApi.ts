import { supabase } from './supabaseClient'

export interface LegalNoticeVersionRow {
  versionId: string
  noticeText: string
  sourceReference: string
  effectiveAt: string
  createdBy: string
  createdAt: string
}

// list_legal_notice_versions builds its jsonb via row_to_json against the
// table's own columns, so its keys are snake_case, not camelCase.
interface LegalNoticeVersionRowFromApi {
  version_id: string
  notice_text: string
  source_reference: string
  effective_at: string
  created_by: string
  created_at: string
}

// Admin-only, authenticated.
export async function listLegalNoticeVersions(): Promise<LegalNoticeVersionRow[]> {
  const { data, error } = await supabase.rpc('list_legal_notice_versions')
  if (error) throw error

  return (data as LegalNoticeVersionRowFromApi[]).map((row) => ({
    versionId: row.version_id,
    noticeText: row.notice_text,
    sourceReference: row.source_reference,
    effectiveAt: row.effective_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }))
}

// Admin-only, authenticated. add_legal_notice_version itself builds its
// jsonb via jsonb_build_object, so — unlike the list function above — this
// one really is camelCase already.
export async function addLegalNoticeVersion(
  noticeText: string,
  sourceReference: string,
  effectiveAt: string,
): Promise<{ versionId: string; effectiveAt: string }> {
  const { data, error } = await supabase.rpc('add_legal_notice_version', {
    notice_text: noticeText,
    source_reference: sourceReference,
    effective_at: effectiveAt,
  })
  if (error) throw error
  return data
}
