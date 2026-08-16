create or replace function public.update_staff_allowlist(
  target_email text,
  action text,
  new_role text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_email text := lower(auth.jwt()->>'email');
  caller_role text;
  caller_status text;
  target_normalized text := lower(target_email);
  active_admin_count int;
  target_current_role text;
  target_current_status text;
  would_remove_active_admin boolean := false;
begin
  select role, status into caller_role, caller_status from public.staff_allowlist where email_normalized = caller_email;
  if caller_status is distinct from 'active' or caller_role is distinct from 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select role, status into target_current_role, target_current_status
  from public.staff_allowlist where email_normalized = target_normalized;

  -- Guardrail (NFR6): revoking, or demoting away from 'admin', an active Admin
  -- must never drop the active-Admin count below 2. This covers both the
  -- 'revoke' action AND a 'grant' action that changes an active Admin's role
  -- to something other than 'admin' (role-change-in-place demotion) — the
  -- task spec's own AC calls out "Revoking (or demoting)" as both guarded,
  -- but the literal reference SQL only checked the 'revoke' branch.
  if target_current_role = 'admin' and target_current_status = 'active' then
    if action = 'revoke' or (action = 'grant' and new_role is not null and new_role <> 'admin') then
      would_remove_active_admin := true;
    end if;
  end if;

  if would_remove_active_admin then
    select count(*) into active_admin_count from public.staff_allowlist where role = 'admin' and status = 'active';
    if active_admin_count <= 2 then
      -- PostgREST's default SQLSTATE-class-23 mapping is 400, not the 409 the
      -- spec calls for, so PTxyz is used to force it (same pattern as B10's
      -- PT401 for invalid_or_expired_token).
      raise sqlstate 'PT409' using message = 'min_admin_guardrail';
    end if;
  end if;

  if action = 'grant' then
    insert into public.staff_allowlist (email_normalized, display_name, role, status, granted_by, granted_at)
    values (target_normalized, target_normalized, coalesce(new_role, 'staff'), 'active', caller_email, now())
    on conflict (email_normalized) do update
      set role = coalesce(new_role, staff_allowlist.role),
          status = 'active',
          granted_by = caller_email,
          granted_at = now(),
          revoked_by = null,
          revoked_at = null;

    insert into public.audit_log (actor_email, action, target_id) values (caller_email, 'GRANT_ACCESS', target_normalized);
    return jsonb_build_object('email', target_normalized, 'status', 'active', 'role', coalesce(new_role, target_current_role, 'staff'));

  elsif action = 'revoke' then
    update public.staff_allowlist set status = 'revoked', revoked_by = caller_email, revoked_at = now()
    where email_normalized = target_normalized;

    insert into public.audit_log (actor_email, action, target_id) values (caller_email, 'REVOKE_ACCESS', target_normalized);
    return jsonb_build_object('email', target_normalized, 'status', 'revoked', 'role', target_current_role);

  else
    raise exception 'invalid_action' using errcode = '22023';
  end if;
end;
$$;

-- Admin-only. anon has no legitimate reason to call this.
revoke execute on function public.update_staff_allowlist(text, text, text) from public, anon;
grant execute on function public.update_staff_allowlist(text, text, text) to authenticated;
