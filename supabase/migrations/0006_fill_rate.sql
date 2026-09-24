-- Phase 07 refinement — compute fill rate in SQL with a consistent status
-- filter on both numerator and denominator (a trip cancelled after matching is
-- excluded from both), and no unbounded client-side fetch.
create function fill_rate_stats()
  returns table (trips_total bigint, trips_matched bigint)
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select
    count(*) filter (where t.status <> 'cancelled') as trips_total,
    count(*) filter (
      where t.status <> 'cancelled'
        and exists (
          select 1 from trip_requests r
          where r.trip_id = t.id and r.status = 'accepted'
        )
    ) as trips_matched
  from trips t;
$$;

revoke execute on function fill_rate_stats() from public, anon;
grant execute on function fill_rate_stats() to authenticated, service_role;
