create table legal_notice_versions (
  version_id uuid primary key default gen_random_uuid(),
  notice_text text not null,
  source_reference text not null,
  effective_at timestamptz not null default now(),
  created_by text not null,
  created_at timestamptz not null default now()
);

alter table legal_notice_versions enable row level security;
-- No UPDATE/DELETE grants exist anywhere in this system for this table — insert-only via add_legal_notice_version (B10).
