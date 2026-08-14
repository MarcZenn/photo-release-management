create or replace function public.generate_consent_token()
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

  new_expiry := now() + interval '15 minutes';
  insert into public.consent_tokens (staff_id, expires_at)
  values (caller_email, new_expiry)
  returning id into new_id;

  return jsonb_build_object('tokenId', new_id, 'expiresAt', new_expiry);
end;
$$;

-- Exposed via PostgREST as POST /rest/v1/rpc/generate_consent_token.
-- anon has no legitimate reason to call this — only an authenticated,
-- allowlisted staff session should ever generate a consent token.
revoke execute on function public.generate_consent_token() from public, anon;
grant execute on function public.generate_consent_token() to authenticated;
