-- I1: public, unauthenticated read path the consent form uses to load the
-- current legal notice and confirm its token is still usable before
-- rendering the form. Deliberately the ONLY additional anonymous read
-- surface introduced for this — no other legal_notice_versions field, and
-- no admin write path (add_legal_notice_version stays staff/Admin-only via
-- its own grant), is exposed here.
--
-- Returns a single `valid` boolean rather than distinguishing "not found" vs
-- "expired" vs "already used" — avoids giving an anonymous caller any signal
-- useful for enumerating/probing tokens beyond "this one doesn't work".
create or replace function public.get_consent_token_status(token_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  token_row public.consent_tokens%rowtype;
  current_version_id uuid;
  current_version_text text;
  current_source_reference text;
begin
  select * into token_row from public.consent_tokens where id = token_id;

  if not found or token_row.used or token_row.expires_at <= now() then
    return jsonb_build_object('valid', false);
  end if;

  select version_id, notice_text, source_reference
  into current_version_id, current_version_text, current_source_reference
  from public.legal_notice_versions
  where effective_at <= now()
  order by effective_at desc
  limit 1;

  return jsonb_build_object(
    'valid', true,
    'expiresAt', token_row.expires_at,
    'legalNoticeVersionId', current_version_id,
    'legalNoticeText', current_version_text,
    'legalNoticeSourceReference', current_source_reference
  );
end;
$$;

-- Public, unauthenticated endpoint — same anon-facing shape as
-- create_photo_release, reached before any staff/auth session exists.
grant execute on function public.get_consent_token_status(uuid) to anon;
