-- RoadMate — schema for plain Postgres (Railway).
-- Squashes the former Supabase migrations 0001–0006. There is no RLS: every
-- query runs server-side and authorization lives in the Route Handlers / the
-- request RPCs below, which take the acting user id explicitly (p_uid).
-- Phone and school_email live in profile_private so the public profile shape
-- can never leak them.

-- ============================================================
-- Enums
-- ============================================================
create type gender as enum ('male', 'female', 'other');
create type zone as enum ('HL', 'HN');
create type trip_type as enum ('offer', 'need');
create type trip_dir as enum ('HL_HN', 'HN_HL');
create type trip_status as enum ('open', 'full', 'done', 'cancelled');
create type request_status as enum ('pending', 'accepted', 'declined', 'withdrawn');

-- ============================================================
-- Auth: email + password, server-side sessions
-- ============================================================
create table users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique check (email = lower(email)),
  password_hash text not null,               -- scrypt (lib/auth/password.ts)
  created_at    timestamptz not null default now()
);

-- Session id = sha-256 of the cookie token; the raw token is never stored.
create table sessions (
  id         text primary key,
  user_id    uuid not null references users (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index sessions_user_idx on sessions (user_id);
create index sessions_expires_idx on sessions (expires_at);

-- ============================================================
-- Profiles
-- ============================================================
-- Public-safe profile. NEVER stores phone or school_email.
-- sv_verified / rating_avg / zalo_id are server-managed.
create table profiles (
  id                  uuid primary key references users (id) on delete cascade,
  zalo_id             text unique,                    -- nullable until Zalo linked
  name                text not null default '',
  gender              gender,
  sv_verified         boolean not null default false, -- soft badge (not a hard gate)
  rating_avg          numeric(3, 2) not null default 0 check (rating_avg between 0 and 5),
  women_pref          boolean not null default false,
  email_notifications boolean not null default true,  -- gates emails only
  created_at          timestamptz not null default now()
);

-- Private info: revealed to a counterpart only after a request is accepted.
create table profile_private (
  user_id      uuid primary key references profiles (id) on delete cascade,
  phone        text,
  school_email text
);

-- ============================================================
-- Reference data
-- ============================================================
create table corridors (
  id   uuid primary key default gen_random_uuid(),
  name text not null
);

create table points (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  zone        zone not null,
  corridor_id uuid not null references corridors (id) on delete cascade,
  geo         jsonb,               -- optional {lat, lng}, reserved for future
  sort        integer not null default 0
);

-- ============================================================
-- Trips & requests
-- ============================================================
create table trips (
  id               uuid primary key default gen_random_uuid(),
  creator_id       uuid not null references profiles (id) on delete cascade,
  type             trip_type not null,
  dir              trip_dir not null,
  from_point_id    uuid not null references points (id),
  to_point_id      uuid not null references points (id),
  pickup_note      text,
  depart_at        timestamptz not null,     -- date + time (bucket derived in app)
  seats_total      integer not null check (seats_total > 0),
  seats_left       integer not null check (seats_left >= 0),
  price_per_person integer not null default 0 check (price_per_person >= 0),
  women_only       boolean not null default false,
  status           trip_status not null default 'open',
  matching_score   numeric,                  -- reserved for Phase 2-B auto-match
  created_at       timestamptz not null default now(),
  check (seats_left <= seats_total),
  check (from_point_id <> to_point_id)
);

create table trip_requests (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references trips (id) on delete cascade,
  requester_id uuid not null references profiles (id) on delete cascade,
  status       request_status not null default 'pending',
  created_at   timestamptz not null default now(),
  unique (trip_id, requester_id)
);

create table reviews (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references trips (id) on delete cascade,
  from_user  uuid not null references profiles (id) on delete cascade,
  to_user    uuid not null references profiles (id) on delete cascade,
  rating     integer not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz not null default now(),
  check (from_user <> to_user),
  unique (trip_id, from_user, to_user)
);

create table reports (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid references trips (id) on delete set null,
  reporter_id uuid not null references profiles (id) on delete cascade,
  -- Keep the abuse trail if the reported user deletes their account.
  reported_id uuid references profiles (id) on delete set null,
  reason      text not null,
  detail      text,
  created_at  timestamptz not null default now()
);

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles (id) on delete cascade,
  type       text not null,
  payload    jsonb not null default '{}'::jsonb,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- SV email verification codes (OTP hashed, never stored raw).
create table sv_verifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles (id) on delete cascade,
  email       text not null,
  code_hash   text not null,
  expires_at  timestamptz not null,
  attempts    integer not null default 0,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);

-- Append-only event log for the liquidity metrics (fill rate, time-to-match…).
create table events (
  id         uuid primary key default gen_random_uuid(),
  type       text not null,          -- trip_created | request_created | request_accepted | trip_completed
  user_id    uuid references profiles (id) on delete set null,
  trip_id    uuid references trips (id) on delete set null,
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================
create index trips_dir_depart_idx        on trips (dir, depart_at);
create index trips_from_point_idx        on trips (from_point_id);
create index trips_to_point_idx          on trips (to_point_id);
create index trips_status_idx            on trips (status);
create index trips_depart_at_idx         on trips (depart_at);
create index trips_creator_idx           on trips (creator_id);
create index trip_requests_trip_idx      on trip_requests (trip_id);
create index trip_requests_requester_idx on trip_requests (requester_id);
create index points_corridor_idx         on points (corridor_id);
create index points_zone_idx             on points (zone);
create index notifications_user_read_idx on notifications (user_id, read);
create index sv_verifications_user_idx   on sv_verifications (user_id, created_at desc);
create index events_type_created_idx     on events (type, created_at);
create index events_trip_idx             on events (trip_id);

-- ============================================================
-- Keep profiles.rating_avg in sync when a review is written.
-- ============================================================
create function update_rating_avg()
  returns trigger
  language plpgsql
as $$
begin
  update profiles
    set rating_avg = coalesce(
      (select round(avg(rating)::numeric, 2) from reviews where to_user = new.to_user),
      0
    )
    where id = new.to_user;
  return new;
end;
$$;

create trigger on_review_insert
  after insert on reviews
  for each row execute function update_rating_avg();

-- ============================================================
-- Atomic request lifecycle. Each takes the acting user (p_uid) from the
-- server session, enforces authorization, and locks the trip row (FOR UPDATE)
-- to keep seat accounting race-free. Errors are raised with stable codes the
-- API maps to HTTP statuses (lib/requests.ts).
-- ============================================================

-- Accept a pending request: decrement a seat, mark accepted, flip to full when
-- the last seat goes, and notify the requester — all in one transaction.
create function accept_request(p_uid uuid, p_request_id uuid)
  returns void
  language plpgsql
as $$
declare
  v_req  trip_requests;
  v_trip trips;
begin
  select * into v_req from trip_requests where id = p_request_id;
  if not found then raise exception 'request_not_found'; end if;

  select * into v_trip from trips where id = v_req.trip_id for update;
  if v_trip.creator_id <> p_uid then raise exception 'not_owner'; end if;
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

-- Decline a pending request + notify.
create function decline_request(p_uid uuid, p_request_id uuid)
  returns void
  language plpgsql
as $$
declare
  v_req  trip_requests;
  v_trip trips;
begin
  select * into v_req from trip_requests where id = p_request_id;
  if not found then raise exception 'request_not_found'; end if;
  select * into v_trip from trips where id = v_req.trip_id;
  if v_trip.creator_id <> p_uid then raise exception 'not_owner'; end if;
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
create function withdraw_request(p_uid uuid, p_request_id uuid)
  returns void
  language plpgsql
as $$
declare
  v_req  trip_requests;
  v_trip trips;
begin
  select * into v_req from trip_requests where id = p_request_id;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.requester_id <> p_uid then raise exception 'not_requester'; end if;

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
create function cancel_trip(p_uid uuid, p_trip_id uuid)
  returns void
  language plpgsql
as $$
declare
  v_trip trips;
begin
  select * into v_trip from trips where id = p_trip_id for update;
  if not found then raise exception 'trip_not_found'; end if;
  if v_trip.creator_id <> p_uid then raise exception 'not_owner'; end if;
  if v_trip.status not in ('open', 'full') then raise exception 'invalid_state'; end if;

  update trips set status = 'cancelled' where id = p_trip_id;

  insert into notifications (user_id, type, payload)
  select tr.requester_id, 'trip_cancelled', jsonb_build_object('trip_id', p_trip_id)
  from trip_requests tr
  where tr.trip_id = p_trip_id and tr.status = 'accepted';
end;
$$;
