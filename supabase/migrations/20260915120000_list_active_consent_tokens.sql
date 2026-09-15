-- Not in the original event-grouping TDD/dev-tasks set — added on request
-- to back the dashboard's "Use Existing QR code" flow (reopen/redisplay a
-- still-active QR rather than always minting a fresh consent_tokens row).
-- Visibility is deliberately NOT staff-scoped, matching list_events'
-- existing precedent (every active staff member sees every event/token,
-- not just their own) — a colleague's still-active QR should be pickable
-- by any staff member at a shared device.
create or replace function public.list_active_consent_tokens()
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

  -- Inner join on events: excludes any pre-cutover token with a null
  -- event_id (minted before generate_consent_token required one) — those
  -- can't be resolved to an event name and aren't reusable through this flow.
  select jsonb_agg(row_to_json(r)) into results
  from (
    select ct.id as token_id, ct.event_id, e.name as event_name, ct.expires_at
    from public.consent_tokens ct
    join public.events e on e.id = ct.event_id
    where ct.expires_at > now()
    order by ct.expires_at asc
  ) r;

  return coalesce(results, '[]'::jsonb);
end;
$$;

revoke execute on function public.list_active_consent_tokens() from public, anon;
grant execute on function public.list_active_consent_tokens() to authenticated;
