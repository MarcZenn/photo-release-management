import { legalNoticeText } from '../content/legalNotice'

export interface LegalNoticeVersionRow {
  versionId: string
  noticeText: string
  sourceReference: string
  effectiveAt: string
  createdBy: string
  createdAt: string
}

// In-memory stub for F10, seeded with F3's current static notice text so the
// "current version" display starts consistent with what the consent form
// already shows. I5 replaces both functions below with real
// list_legal_notice_versions / add_legal_notice_version RPC calls.
let versions: LegalNoticeVersionRow[] = [
  {
    versionId: 'mock-v1',
    noticeText: legalNoticeText,
    sourceReference: 'CLAUDE.md (draft, pending UCM confirmation — see U4)',
    effectiveAt: '2026-01-01T00:00:00Z',
    createdBy: 'system-bootstrap',
    createdAt: '2026-01-01T00:00:00Z',
  },
]

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function listLegalNoticeVersions(): Promise<LegalNoticeVersionRow[]> {
  await delay(200)
  return [...versions].sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt))
}

// Mirrors B13: rejects missing notice_text or source_reference, never
// overwrites/deletes a prior version (insert-only, matching the no-UPDATE/
// DELETE database constraint on legal_notice_versions).
export async function addLegalNoticeVersion(
  noticeText: string,
  sourceReference: string,
  effectiveAt: string,
): Promise<{ versionId: string; effectiveAt: string }> {
  await delay(200)

  if (!noticeText.trim() || !sourceReference.trim()) {
    throw new Error('Notice text and source reference are both required.')
  }

  const versionId = `mock-v${versions.length + 1}`
  versions = [
    ...versions,
    {
      versionId,
      noticeText: noticeText.trim(),
      sourceReference: sourceReference.trim(),
      effectiveAt,
      createdBy: 'you@msudenver.edu',
      createdAt: new Date().toISOString(),
    },
  ]
  return { versionId, effectiveAt }
}
