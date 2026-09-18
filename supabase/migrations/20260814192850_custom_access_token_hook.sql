-- GoTrue wraps the entire login attempt (user lookup + hook invocation) in a
-- single transaction and rolls it all back whenever the hook denies access —
-- regardless of whether denial is signaled via `raise exception` or the
-- documented `{"error": ...}` return shape. A plain INSERT into audit_log from
-- inside the hook is therefore lost on every LOGIN_DENIED outcome.
--
-- Postgres has no native autonomous-transaction feature, so the only way for a
-- statement to survive its caller's rollback is to run it over a *separate*
-- connection. dblink provides that loopback connection. The connecting role is
-- scoped to INSERT-only on audit_log (nothing else), and its password is
-- generated at migration time and stored only in Supabase Vault — never
-- written in plaintext into this (or any) file.

create extension if not exists dblink;

do $$
declare
  generated_password text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  execute format('create role audit_writer with login password %L', generated_password);
  perform vault.create_secret(
    generated_password,
    'audit_writer_password',
    'Loopback DB password used by custom_access_token_hook to write LOGIN_DENIED audit rows outside GoTrue''s enclosing transaction.'
  );
end $$;

grant usage on schema public to audit_writer;
grant insert on public.audit_log to audit_writer;

-- audit_log has RLS enabled with zero policies (B3) — a table-level GRANT alone
-- does not bypass RLS. This policy is scoped narrowly to audit_writer, a role
-- with no client-facing credential path (not exposed via PostgREST/anon/authenticated),
-- so it does not weaken B3's "direct client access denied" guarantee.
create policy audit_writer_insert on public.audit_log
  for insert
  to audit_writer
  with check (true);

create or replace function public.write_denied_login_audit(p_actor_email text, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  writer_password text;
  conn_str text;
begin
  select decrypted_secret into writer_password
  from vault.decrypted_secrets
  where name = 'audit_writer_password';

  conn_str := format('host=localhost port=5432 dbname=postgres user=audit_writer password=%s', writer_password);

  perform dblink_exec(
    conn_str,
    format(
      'insert into public.audit_log (actor_email, action, metadata) values (%L, %L, %L)',
      p_actor_email, 'LOGIN_DENIED', jsonb_build_object('reason', p_reason)::text
    )
  );
end;
$$;

revoke execute on function public.write_denied_login_audit(text, text) from public, anon, authenticated;
grant execute on function public.write_denied_login_audit(text, text) to supabase_auth_admin;

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  claims jsonb;
  user_email text;
  allow_status text;
  allow_role text;
begin
  user_email := lower(event->'claims'->>'email');

  select status, role into allow_status, allow_role
  from public.staff_allowlist
  where email_normalized = user_email;

  if allow_status = 'active' then
    insert into public.audit_log (actor_email, action, target_id, metadata)
    values (user_email, 'LOGIN_SUCCESS', null, jsonb_build_object('role', allow_role));

    claims := event->'claims';
    claims := jsonb_set(claims, '{app_role}', to_jsonb(allow_role));
    event := jsonb_set(event, '{claims}', claims);
    return event;
  else
    perform public.write_denied_login_audit(user_email, coalesce(allow_status, 'not_on_allowlist'));

    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'access_denied: email not on active staff allowlist'
      )
    );
  end if;
end;
$$;

-- Custom Access Token Hook must be directly callable by the supabase_auth_admin role
-- (Supabase Auth invokes it as that role, not through PostgREST/RLS). search_path is
-- pinned above since supabase_auth_admin's default search_path does not include public,
-- and pinning it is also standard hardening for SECURITY DEFINER functions generally.
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
