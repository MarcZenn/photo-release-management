drop function if exists public.generate_consent_token();

create or replace function public.generate_consent_token(event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  new_expiry timestamptz;
  caller_email text := lower(auth.jwt()->>'email');
  caller_status text;
begin
  select status into caller_status from public.staff_allowlist where email_normalized = caller_email;
  if caller_status is distinct from 'active' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not exists (select 1 from public.events where id = generate_consent_token.event_id) then
    raise exception 'invalid_event' using errcode = '22023';
  end if;

  new_expiry := now() + interval '4 hours'; -- unchanged from the 2026-08-21 multi-submission revision
  insert into public.consent_tokens (staff_id, expires_at, event_id)
  values (caller_email, new_expiry, generate_consent_token.event_id)
  returning id into new_id;

  return jsonb_build_object('tokenId', new_id, 'expiresAt', new_expiry);
end;
$$;

revoke execute on function public.generate_consent_token(uuid) from public, anon;
grant execute on function public.generate_consent_token(uuid) to authenticated;
