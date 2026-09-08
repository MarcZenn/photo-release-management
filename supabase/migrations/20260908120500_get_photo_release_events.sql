drop function if exists public.get_photo_release(text, uuid);

create or replace function public.get_photo_release(
  query text default null,
  release_id uuid default null,
  event_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_email text := lower(auth.jwt()->>'email');
  caller_status text;
  results jsonb;
  found_event_name text;
  event_total_count int;
begin
  select status into caller_status from public.staff_allowlist where email_normalized = caller_email;
  if caller_status is distinct from 'active' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if release_id is not null then
    select jsonb_agg(row_to_json(r)) into results
    from (
      select pr.id, pr.full_name, pr.phone, pr.email, pr.signature_image, pr.submitted_at,
             pr.legal_notice_version, pr.appearance_description, e.name as event_name
      from public.photo_releases pr
      left join public.events e on e.id = pr.event_id
      where pr.id = release_id
    ) r;

    insert into public.audit_log (actor_email, action, target_id) values (caller_email, 'RECORD_VIEW', release_id::text);
    return coalesce(results, '[]'::jsonb);

  elsif get_photo_release.event_id is not null then
    select e.name into found_event_name from public.events e where e.id = get_photo_release.event_id;
    if found_event_name is null then
      raise exception 'invalid_event' using errcode = '22023';
    end if;

    select count(*) into event_total_count
    from public.photo_releases pr where pr.event_id = get_photo_release.event_id;

    -- 500-row cap is a deliberate, permanent MVP ceiling — not deferred
    -- pagination work. See Performance Targets in the TDD. `event_total_count`
    -- above is the true count, letting the client distinguish "exactly 500"
    -- from "truncated at 500."
    select jsonb_agg(row_to_json(r)) into results
    from (
      select pr.id, pr.full_name, pr.phone, pr.email, pr.submitted_at
      from public.photo_releases pr
      where pr.event_id = get_photo_release.event_id
      order by pr.submitted_at desc
      limit 500
    ) r;

    insert into public.audit_log (actor_email, action, metadata)
    values (caller_email, 'RECORD_SEARCH', jsonb_build_object('eventId', get_photo_release.event_id));

    return jsonb_build_object(
      'eventName', found_event_name,
      'totalCount', event_total_count,
      'rows', coalesce(results, '[]'::jsonb)
    );

  elsif query is not null and trim(query) <> '' then
    -- TODO: at 3,601 seeded rows the planner chose a seq scan over the B7 GIN
    -- trigram indexes for this OR-across-3-columns + custom ORDER BY shape
    -- (confirmed via EXPLAIN ANALYZE), unlike the single-column lookups B7
    -- validated. Still ~28ms, well inside NFR8's 2s budget, so left as-is —
    -- but revisit with EXPLAIN ANALYZE once production data volume is much
    -- larger, in case the planner's choice degrades at scale.
    -- (Carried forward unchanged from the pre-existing get_photo_release —
    -- do not drop this note on drop-and-recreate.)
    --
    -- Deliberately does NOT select appearance_description here — see the
    -- migration note above. event_name is included: it's not PII, unlike
    -- appearance_description.
    select jsonb_agg(row_to_json(r)) into results
    from (
      select pr.id, pr.full_name, pr.phone, pr.email, pr.submitted_at, e.name as event_name
      from public.photo_releases pr
      left join public.events e on e.id = pr.event_id
      where pr.name_lower % lower(query) or pr.email_normalized % lower(query) or pr.phone_normalized % query
      order by greatest(similarity(pr.name_lower, lower(query)), similarity(pr.email_normalized, lower(query))) desc
      limit 50
    ) r;

    insert into public.audit_log (actor_email, action, metadata)
    values (caller_email, 'RECORD_SEARCH', jsonb_build_object('query', query));
    return coalesce(results, '[]'::jsonb);

  else
    raise exception 'malformed_query' using errcode = '22023';
  end if;
end;
$$;

revoke execute on function public.get_photo_release(text, uuid, uuid) from public, anon;
grant execute on function public.get_photo_release(text, uuid, uuid) to authenticated;
