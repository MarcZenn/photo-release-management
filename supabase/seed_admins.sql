-- Bootstrap the initial admin accounts. Deliberately NOT a tracked migration
-- (see B15 in the dev-tasks doc, and the decision to keep production
-- bootstrap a manual one-time action in the Supabase dashboard SQL editor,
-- matching the TDD's original "break-glass, cannot be self-service" intent).
--
-- `supabase db reset` replays only supabase/migrations/*.sql, so it wipes
-- this out every time. Run `npm run db:seed` afterward to restore it locally.
insert into staff_allowlist (email_normalized, display_name, role, status, granted_by, granted_at)
values
  ('marcusareulius@gmail.com', 'Application Creator', 'admin', 'active', 'system-bootstrap', now()),
  ('aschweng@msudenver.edu', 'Amanda Schwengel', 'admin', 'active', 'system-bootstrap', now())
on conflict (email_normalized) do nothing;
