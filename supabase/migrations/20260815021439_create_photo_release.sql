create or replace function public.create_photo_release(
  consent_token uuid,
  full_name text,
  phone text,
  email text,
  signature_image text,
  age_attested boolean,
  notice_acknowledged boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  token_row public.consent_tokens%rowtype;
  current_notice_version uuid;
  new_release_id uuid;
  new_submitted_at timestamptz := now();
begin
  select * into token_row from public.consent_tokens
  where id = consent_token and used = false and expires_at > now()
  for update;

  if not found then
    -- PostgREST maps SQLSTATE class 28 to HTTP 403 by default; the spec here
    -- calls for 401 specifically, so the PTxyz convention is used to force it.
    raise sqlstate 'PT401' using message = 'invalid_or_expired_token';
  end if;

  if full_name is null or trim(full_name) = ''
     or phone is null or trim(phone) = ''
     or email is null or trim(email) = ''
     or signature_image is null or trim(signature_image) = ''
     or age_attested is distinct from true
     or notice_acknowledged is distinct from true then
    raise exception 'validation_error' using errcode = '22023';
  end if;

  select version_id into current_notice_version
  from public.legal_notice_versions
  where effective_at <= now()
  order by effective_at desc
  limit 1;

  insert into public.photo_releases (
    full_name, name_lower, phone, phone_normalized, email, email_normalized,
    signature_image, legal_notice_version, age_attested, submitted_at, issuing_staff_id
  ) values (
    full_name, lower(full_name), phone, regexp_replace(phone, '\D', '', 'g'),
    email, lower(email), signature_image, current_notice_version, age_attested,
    new_submitted_at, token_row.staff_id
  )
  returning id into new_release_id;

  update public.consent_tokens set used = true where id = consent_token;

  return jsonb_build_object('releaseId', new_release_id, 'submittedAt', new_submitted_at);
end;
$$;

-- Public, unauthenticated endpoint — this is the participant-facing consent
-- form submit path (F3/I2), reached before any staff/auth session exists.
grant execute on function public.create_photo_release(uuid, text, text, text, text, boolean, boolean) to anon;
