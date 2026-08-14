create table photo_releases (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  name_lower text not null,
  phone text not null,
  phone_normalized text not null,
  email text not null,
  email_normalized text not null,
  signature_image text not null, -- base64 PNG/SVG, inline — no external file storage (NFR10)
  legal_notice_version uuid not null references legal_notice_versions(version_id),
  age_attested boolean not null,
  submitted_at timestamptz not null default now(),
  issuing_staff_id text not null,
  created_at timestamptz not null default now()
);

alter table photo_releases enable row level security;
-- No policies — all access via create_photo_release (B9) and get_photo_release (B13).
