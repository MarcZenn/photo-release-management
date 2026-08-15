create or replace function public.get_photo_release(
  query text default null,
  release_id uuid default null
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
begin
  select status into caller_status from public.staff_allowlist where email_normalized = caller_email;
  if caller_status is distinct from 'active' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if release_id is not null then
    select jsonb_agg(row_to_json(r)) into results
    from (
      select id, full_name, phone, email, signature_image, submitted_at, legal_notice_version
      from public.photo_releases where id = release_id
    ) r;

    insert into public.audit_log (actor_email, action, target_id) values (caller_email, 'RECORD_VIEW', release_id::text);
  elsif query is not null and trim(query) <> '' then
    -- TODO: at 3,601 seeded rows the planner chose a seq scan over the B7 GIN
    -- trigram indexes for this OR-across-3-columns + custom ORDER BY shape
    -- (confirmed via EXPLAIN ANALYZE), unlike the single-column lookups B7
    -- validated. Still ~28ms, well inside NFR8's 2s budget, so left as-is —
    -- but revisit with EXPLAIN ANALYZE once production data volume is much
    -- larger, in case the planner's choice degrades at scale.
    select jsonb_agg(row_to_json(r)) into results
    from (
      select id, full_name, phone, email, submitted_at
      from public.photo_releases
      where name_lower % lower(query) or email_normalized % lower(query) or phone_normalized % query
      order by greatest(similarity(name_lower, lower(query)), similarity(email_normalized, lower(query))) desc
      limit 50
    ) r;

    insert into public.audit_log (actor_email, action, metadata)
    values (caller_email, 'RECORD_SEARCH', jsonb_build_object('query', query));
  else
    raise exception 'malformed_query' using errcode = '22023';
  end if;

  return coalesce(results, '[]'::jsonb);
end;
$$;

-- Staff-only, authenticated. anon has no legitimate reason to call this.
revoke execute on function public.get_photo_release(text, uuid) from public, anon;
grant execute on function public.get_photo_release(text, uuid) to authenticated;
