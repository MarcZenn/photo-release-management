create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_email text not null,
  action text not null check (action in (
    'GRANT_ACCESS', 'REVOKE_ACCESS', 'RECORD_SEARCH', 'RECORD_VIEW',
    'LOGIN_SUCCESS', 'LOGIN_DENIED'
  )),
  target_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_log_actor_created on audit_log (actor_email, created_at);

alter table audit_log enable row level security;
-- No policies — insert-only from within SECURITY DEFINER functions; reads only via list_audit_log (B14).
