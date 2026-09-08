create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_lower text not null,
  created_by text not null, -- staff email; deliberate 4th name for "the staff member on this
                             -- row" alongside consent_tokens.staff_id, photo_releases.issuing_staff_id,
                             -- audit_log.actor_email — no existing convention to match, per TDD
  created_at timestamptz not null default now(),
  constraint events_name_lower_unique unique (name_lower)
);

create index idx_events_name_trgm on events using gin (name_lower gin_trgm_ops);
-- pg_trgm extension is already enabled by 20260814185746_pg_trgm_indexes.sql — do not
-- re-run `create extension`.

alter table events enable row level security;
-- No policies — accessed only via find_or_create_event / list_events / rename_event (B3),
-- all SECURITY DEFINER. Matches every other table in this schema.
