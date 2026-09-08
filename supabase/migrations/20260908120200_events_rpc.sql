create or replace function public.find_or_create_event(name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_email text := lower(auth.jwt()->>'email');
  caller_status text;
  result_id uuid;
  result_name text;
begin
  select status into caller_status from public.staff_allowlist where email_normalized = caller_email;
  if caller_status is distinct from 'active' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if name is null or trim(name) = '' or char_length(trim(name)) > 120 then
    raise exception 'validation_error' using errcode = '22023';
  end if;

  insert into public.events (name, name_lower, created_by)
  values (trim(name), lower(trim(name)), caller_email)
  on conflict (name_lower) do update set name = events.name -- no-op, just to allow RETURNING on conflict
  returning id, events.name into result_id, result_name;

  return jsonb_build_object('eventId', result_id, 'name', result_name);
end;
$$;

revoke execute on function public.find_or_create_event(text) from public, anon;
grant execute on function public.find_or_create_event(text) to authenticated;


create or replace function public.list_events(query text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_email text := lower(auth.jwt()->>'email');
  caller_status text;
  results jsonb;
begin
  select status into caller_status from public.staff_allowlist where email_normalized = caller_email;
  if caller_status is distinct from 'active' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if query is not null and trim(query) <> '' then
    -- Typeahead mode: feeds GenerateQrPanel's <datalist> as staff type.
    select jsonb_agg(row_to_json(r)) into results
    from (
      select id, name
      from public.events
      where name_lower % lower(query)
      order by similarity(name_lower, lower(query)) desc
      limit 20
    ) r;
  else
    -- Browse mode: feeds /dashboard/events.
    select jsonb_agg(row_to_json(r)) into results
    from (
      select e.id, e.name, e.created_at, count(pr.id) as submission_count
      from public.events e
      left join public.photo_releases pr on pr.event_id = e.id
      group by e.id, e.name, e.created_at
      order by e.created_at desc
    ) r;
  end if;

  return coalesce(results, '[]'::jsonb);
end;
$$;

revoke execute on function public.list_events(text) from public, anon;
grant execute on function public.list_events(text) to authenticated;


create or replace function public.rename_event(event_id uuid, new_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_email text := lower(auth.jwt()->>'email');
  caller_role text;
  caller_status text;
  result_id uuid;
  result_name text;
begin
  select role, status into caller_role, caller_status from public.staff_allowlist where email_normalized = caller_email;
  if caller_status is distinct from 'active' or caller_role is distinct from 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if new_name is null or trim(new_name) = '' or char_length(trim(new_name)) > 120 then
    raise exception 'validation_error' using errcode = '22023';
  end if;

  -- Deliberately no separate `if exists (...)` pre-check before the UPDATE
  -- (an earlier draft of this task had one, matching the TDD's own draft SQL
  -- — removed). A check-then-update is a classic TOCTOU race: two concurrent
  -- renames to the same colliding name can both pass the pre-check before
  -- either commits, and whichever commits second then fails on a raw,
  -- uncaught `events_name_lower_unique` violation instead of the clean
  -- `event_name_taken` error callers expect (see isEventNameTakenError in
  -- F1). Catching the constraint violation directly closes the race
  -- entirely and atomically at the database layer — the same principle
  -- `find_or_create_event`'s `on conflict` already relies on above, just via
  -- an exception handler instead of an upsert, since plain UPDATE has no
  -- `on conflict` clause to lean on.
  begin
    update public.events set name = trim(new_name), name_lower = lower(trim(new_name))
    where id = rename_event.event_id
    returning id, name into result_id, result_name;
  exception when unique_violation then
    raise exception 'event_name_taken' using errcode = '23505';
  end;

  if not found then
    -- Not called out explicitly in the TDD, but a nonexistent event_id needs
    -- *some* defined behavior — reuses generate_consent_token's `invalid_event`
    -- convention (B4) rather than inventing a new error code.
    raise exception 'invalid_event' using errcode = '22023';
  end if;

  return jsonb_build_object('eventId', result_id, 'name', result_name);
end;
$$;

revoke execute on function public.rename_event(uuid, text) from public, anon;
grant execute on function public.rename_event(uuid, text) to authenticated;
