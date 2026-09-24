-- Phase 05 — atomic request lifecycle RPCs.
-- All are SECURITY DEFINER (bypass RLS) so they can change seats and write
-- notifications, but each enforces authorization via auth.uid() internally and
-- locks the trip row (FOR UPDATE) to keep seat accounting race-free.
-- Errors are raised with stable codes the API maps to messages.

-- Accept a pending request: decrement a seat, mark accepted, flip to full when
-- the last seat goes, and notify the requester — all in one transaction.
create function accept_request(p_request_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_req  trip_requests;
  v_trip trips;
begin
  select * into v_req from trip_requests where id = p_request_id;
  if not found then raise exception 'request_not_found'; end if;

  select * into v_trip from trips where id = v_req.trip_id for update;
  if v_trip.creator_id <> v_uid then raise exception 'not_owner'; end if;
  if v_req.status <> 'pending' then raise exception 'not_pending'; end if;
  if v_trip.status <> 'open' or v_trip.seats_left <= 0 then
    raise exception 'no_seats';
  end if;

  update trips
    set seats_left = seats_left - 1,
        status = case when seats_left - 1 <= 0 then 'full'::trip_status else status end
    where id = v_trip.id;

  update trip_requests set status = 'accepted' where id = p_request_id;

  insert into notifications (user_id, type, payload)
  values (
    v_req.requester_id,
    'request_accepted',
    jsonb_build_object('trip_id', v_trip.id, 'request_id', p_request_id)
  );
end;
$$;

-- Decline a pending request + notify. (Owner could also do this via the RLS
-- policy, but routing it here keeps the notification write server-side.)
create function decline_request(p_request_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_uid uuid := (select auth.uid());
  v_req trip_requests;
  v_trip trips;
begin
  select * into v_req from trip_requests where id = p_request_id;
  if not found then raise exception 'request_not_found'; end if;
  select * into v_trip from trips where id = v_req.trip_id;
  if v_trip.creator_id <> v_uid then raise exception 'not_owner'; end if;
  if v_req.status <> 'pending' then raise exception 'not_pending'; end if;

  update trip_requests set status = 'declined' where id = p_request_id;

  insert into notifications (user_id, type, payload)
  values (
    v_req.requester_id,
    'request_declined',
    jsonb_build_object('trip_id', v_trip.id, 'request_id', p_request_id)
  );
end;
$$;

-- Requester withdraws: pending -> withdrawn (no seat change); accepted ->
-- withdrawn with an atomic seat refund (full -> open) + owner notification.
create function withdraw_request(p_request_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_req  trip_requests;
  v_trip trips;
begin
  select * into v_req from trip_requests where id = p_request_id;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.requester_id <> v_uid then raise exception 'not_requester'; end if;

  select * into v_trip from trips where id = v_req.trip_id for update;

  if v_req.status = 'pending' then
    update trip_requests set status = 'withdrawn' where id = p_request_id;
  elsif v_req.status = 'accepted' then
    update trip_requests set status = 'withdrawn' where id = p_request_id;
    update trips
      set seats_left = seats_left + 1,
          status = case when status = 'full' then 'open'::trip_status else status end
      where id = v_trip.id;
    insert into notifications (user_id, type, payload)
    values (
      v_trip.creator_id,
      'passenger_withdrew',
      jsonb_build_object('trip_id', v_trip.id, 'request_id', p_request_id)
    );
  else
    raise exception 'invalid_state';
  end if;
end;
$$;

-- Owner cancels a trip + notifies every accepted passenger.
create function cancel_trip(p_trip_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_trip trips;
begin
  select * into v_trip from trips where id = p_trip_id for update;
  if not found then raise exception 'trip_not_found'; end if;
  if v_trip.creator_id <> v_uid then raise exception 'not_owner'; end if;
  if v_trip.status not in ('open', 'full') then raise exception 'invalid_state'; end if;

  update trips set status = 'cancelled' where id = p_trip_id;

  insert into notifications (user_id, type, payload)
  select tr.requester_id, 'trip_cancelled', jsonb_build_object('trip_id', p_trip_id)
  from trip_requests tr
  where tr.trip_id = p_trip_id and tr.status = 'accepted';
end;
$$;

revoke execute on function accept_request(uuid), decline_request(uuid),
  withdraw_request(uuid), cancel_trip(uuid) from public, anon;
grant execute on function accept_request(uuid), decline_request(uuid),
  withdraw_request(uuid), cancel_trip(uuid) to authenticated;
