create or replace function public.list_staff_allowlist()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_email text := lower(auth.jwt()->>'email');
  caller_role text;
  caller_status text;
  results jsonb;
begin
  select role, status into caller_role, caller_status from public.staff_allowlist where email_normalized = caller_email;
  if caller_status is distinct from 'active' or caller_role is distinct from 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb) into results
  from (select * from public.staff_allowlist order by granted_at desc) r;

  return results;
end;
$$;

revoke execute on function public.list_staff_allowlist() from public, anon;
grant execute on function public.list_staff_allowlist() to authenticated;


create or replace function public.list_legal_notice_versions()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_email text := lower(auth.jwt()->>'email');
  caller_role text;
  caller_status text;
  results jsonb;
begin
  select role, status into caller_role, caller_status from public.staff_allowlist where email_normalized = caller_email;
  if caller_status is distinct from 'active' or caller_role is distinct from 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb) into results
  from (select * from public.legal_notice_versions order by effective_at desc) r;

  return results;
end;
$$;

revoke execute on function public.list_legal_notice_versions() from public, anon;
grant execute on function public.list_legal_notice_versions() to authenticated;


create or replace function public.list_audit_log(
  actor_email text default null,
  action text default null,
  target_id text default null,
  date_from timestamptz default null,
  date_to timestamptz default null,
  page_limit int default 50,
  page_offset int default 0
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
  rows_result jsonb;
  total_count int;
begin
  select role, status into caller_role, caller_status from public.staff_allowlist where email_normalized = caller_email;
  if caller_status is distinct from 'active' or caller_role is distinct from 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if date_from is not null and date_to is not null and date_from > date_to then
    raise exception 'invalid_date_range' using errcode = '22023';
  end if;

  -- Parameter names deliberately match audit_log's own column names (matches
  -- the exposed RPC/API contract). Unqualified references inside the query
  -- below would be ambiguous, so every filter column is qualified with the
  -- `al` table alias and every parameter with `list_audit_log.<name>` to make
  -- unambiguous which one is meant.
  select count(*) into total_count
  from public.audit_log al
  where (list_audit_log.actor_email is null or al.actor_email = list_audit_log.actor_email)
    and (list_audit_log.action is null or al.action = list_audit_log.action)
    and (list_audit_log.target_id is null or al.target_id = list_audit_log.target_id)
    and (list_audit_log.date_from is null or al.created_at >= list_audit_log.date_from)
    and (list_audit_log.date_to is null or al.created_at <= list_audit_log.date_to);

  select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb) into rows_result
  from (
    select al.*
    from public.audit_log al
    where (list_audit_log.actor_email is null or al.actor_email = list_audit_log.actor_email)
      and (list_audit_log.action is null or al.action = list_audit_log.action)
      and (list_audit_log.target_id is null or al.target_id = list_audit_log.target_id)
      and (list_audit_log.date_from is null or al.created_at >= list_audit_log.date_from)
      and (list_audit_log.date_to is null or al.created_at <= list_audit_log.date_to)
    order by al.created_at desc
    limit list_audit_log.page_limit offset list_audit_log.page_offset
  ) r;

  return jsonb_build_object('rows', rows_result, 'totalCount', total_count);
end;
$$;

revoke execute on function public.list_audit_log(text, text, text, timestamptz, timestamptz, int, int) from public, anon;
grant execute on function public.list_audit_log(text, text, text, timestamptz, timestamptz, int, int) to authenticated;
