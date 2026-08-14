create table staff_allowlist (
  email_normalized text primary key,
  display_name text not null,
  role text not null check (role in ('admin', 'staff')),
  status text not null check (status in ('active', 'revoked')),
  granted_by text not null,
  granted_at timestamptz not null default now(),
  revoked_by text,
  revoked_at timestamptz
);

alter table staff_allowlist enable row level security;
-- No policies added — RLS with zero policies denies all direct client access by default.
-- All reads/writes happen exclusively through SECURITY DEFINER functions (B8, B11, B12).
