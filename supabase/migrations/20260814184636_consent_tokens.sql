create table consent_tokens (
  id uuid primary key default gen_random_uuid(),
  staff_id text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used boolean not null default false
);

alter table consent_tokens enable row level security;
-- No policies — inserted only by generate_consent_token (B6), consumed only inside create_photo_release (B9).
