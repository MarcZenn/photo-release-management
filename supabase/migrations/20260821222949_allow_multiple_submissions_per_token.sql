-- Product decision (2026-08-21, per user): a QR code needs to support
-- several people submitting from the same code over a span of time —
-- photographers often have a group or a steady stream of participants, and
-- generating/displaying a fresh QR per person is too slow in practice.
-- Replaces the original single-use design with: unlimited submissions,
-- gated only by expiry. Expiry itself is bumped from ~15 minutes to 4 hours
-- to comfortably cover a session/shoot, not just one immediate scan.
--
-- The `used` column and its guard are removed outright rather than kept
-- around unused — nothing reads or writes it once this migration lands.

alter table consent_tokens drop column used;

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

  new_expiry := now() + interval '4 hours';
  insert into public.consent_tokens (staff_id, expires_at)
  values (caller_email, new_expiry)
  returning id into new_id;

  return jsonb_build_object('tokenId', new_id, 'expiresAt', new_expiry);
end;
$$;

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
  -- No `for update` row lock here anymore — unlike the old single-use
  -- design, nothing about this check needs mutual exclusion between
  -- concurrent submitters, since the token is never mutated.
  select * into token_row from public.consent_tokens
  where id = consent_token and expires_at > now();

  if not found then
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

  return jsonb_build_object('releaseId', new_release_id, 'submittedAt', new_submitted_at);
end;
$$;

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

  if not found or token_row.expires_at <= now() then
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
