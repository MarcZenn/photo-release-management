create or replace function public.add_legal_notice_version(
  notice_text text,
  source_reference text,
  effective_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_email text := lower(auth.jwt()->>'email');
  caller_role text;
  caller_status text;
  new_version_id uuid;
begin
  select role, status into caller_role, caller_status from public.staff_allowlist where email_normalized = caller_email;
  if caller_status is distinct from 'active' or caller_role is distinct from 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if notice_text is null or trim(notice_text) = '' or source_reference is null or trim(source_reference) = '' then
    raise exception 'validation_error' using errcode = '22023';
  end if;

  insert into public.legal_notice_versions (notice_text, source_reference, effective_at, created_by)
  values (notice_text, source_reference, effective_at, caller_email)
  returning version_id into new_version_id;

  return jsonb_build_object('versionId', new_version_id, 'effectiveAt', effective_at);
end;
$$;

-- Admin-only. anon has no legitimate reason to call this.
revoke execute on function public.add_legal_notice_version(text, text, timestamptz) from public, anon;
grant execute on function public.add_legal_notice_version(text, text, timestamptz) to authenticated;
