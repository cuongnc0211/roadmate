-- RoadMate — initial schema, indexes, and RLS.
-- Identity is keyed on auth.users.id (profiles.id). zalo_id is nullable until a
-- Zalo account is linked (Phase 2). Phone lives in profile_private so RLS can
-- hide it (row-level security cannot hide a single column).

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
-- Tables
-- ============================================================

-- Public-safe profile. NEVER stores phone or school_email (see profile_private).
-- Trust columns (sv_verified, rating_avg) and identity key (zalo_id) are
-- server-managed — not client-writable (see column grants below).
create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  zalo_id     text unique,                       -- nullable until Zalo linked
  name        text not null default '',
  gender      gender,
  sv_verified boolean not null default false,    -- soft badge (not a hard gate)
  rating_avg  numeric(3, 2) not null default 0 check (rating_avg between 0 and 5),
  women_pref  boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Private info. Revealed to a counterpart only via a service-role route after a
-- request is accepted (Phase 05). school_email is PII / the SV-verification
-- anchor, so it lives here (owner-only), not on the public profile.
create table profile_private (
  user_id      uuid primary key references profiles (id) on delete cascade,
  phone        text,
  school_email text
);

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

-- ============================================================
-- Indexes (board filtering + request lookups)
-- ============================================================
create index trips_dir_depart_idx       on trips (dir, depart_at);
create index trips_from_point_idx       on trips (from_point_id);
create index trips_to_point_idx         on trips (to_point_id);
create index trips_status_idx           on trips (status);
create index trips_depart_at_idx        on trips (depart_at);   -- expiry filter
create index trip_requests_trip_idx     on trip_requests (trip_id);
create index trip_requests_requester_idx on trip_requests (requester_id);
create index points_corridor_idx        on points (corridor_id);
create index points_zone_idx            on points (zone);
create index notifications_user_read_idx on notifications (user_id, read);

-- ============================================================
-- Row Level Security — enabled on every table (defense-in-depth)
-- ============================================================
alter table profiles       enable row level security;
alter table profile_private enable row level security;
alter table corridors      enable row level security;
alter table points         enable row level security;
alter table trips          enable row level security;
alter table trip_requests  enable row level security;
alter table reviews        enable row level security;
alter table reports        enable row level security;
alter table notifications  enable row level security;

-- ---- Helper functions (SECURITY DEFINER) ----
-- These break the mutual recursion between the trips and trip_requests read
-- policies: each policy would otherwise reference the other table, whose RLS
-- references back, causing "infinite recursion detected in policy". Running the
-- check inside a definer function bypasses RLS on the inner query.
create function auth_is_trip_owner(t_id uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select exists (
    select 1 from trips
    where id = t_id and creator_id = (select auth.uid())
  );
$$;

create function auth_has_trip_request(t_id uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select exists (
    select 1 from trip_requests
    where trip_id = t_id and requester_id = (select auth.uid())
  );
$$;

revoke execute on function auth_is_trip_owner(uuid) from public;
revoke execute on function auth_has_trip_request(uuid) from public;
grant execute on function auth_is_trip_owner(uuid) to authenticated;
grant execute on function auth_has_trip_request(uuid) to authenticated;

-- ---- Reference data: readable by any authenticated user ----
create policy corridors_read on corridors
  for select to authenticated using (true);

create policy points_read on points
  for select to authenticated using (true);

-- ---- profiles: public fields readable; own row writable ----
create policy profiles_read on profiles
  for select to authenticated using (true);
create policy profiles_insert_self on profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update_self on profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Column-level grants (H1): `authenticated` has blanket table privileges by
-- default, so the row policy alone would let a user forge sv_verified /
-- rating_avg / zalo_id. Restrict writes to genuinely user-editable columns and
-- reads to public-safe columns (zalo_id is server-managed, not client-readable).
revoke select, insert, update, delete on profiles from authenticated;
grant select (id, name, gender, sv_verified, rating_avg, women_pref, created_at)
  on profiles to authenticated;
grant insert (id, name, gender, women_pref) on profiles to authenticated;
grant update (name, gender, women_pref) on profiles to authenticated;
-- sv_verified, rating_avg, zalo_id are written only by service-role / definer
-- flows (SV verification in Phase 03, rating aggregate in Phase 06).

-- ---- profile_private: only the owner (phone stays hidden) ----
create policy profile_private_owner on profile_private
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---- trips ----
-- Readable when open/full, or you own it, or you have a request on it.
create policy trips_read on trips
  for select to authenticated using (
    status in ('open', 'full')
    or creator_id = (select auth.uid())
    or auth_has_trip_request(id)
  );
create policy trips_insert_own on trips
  for insert to authenticated
  with check (creator_id = (select auth.uid()));
create policy trips_update_own on trips
  for update to authenticated
  using (creator_id = (select auth.uid()))
  with check (creator_id = (select auth.uid()));
create policy trips_delete_own on trips
  for delete to authenticated
  using (creator_id = (select auth.uid()));

-- ---- trip_requests ----
-- Readable by the requester or the trip owner.
create policy trip_requests_read on trip_requests
  for select to authenticated using (
    requester_id = (select auth.uid())
    or auth_is_trip_owner(trip_id)
  );
-- Requester creates their own request; cannot request their own trip.
create policy trip_requests_insert_self on trip_requests
  for insert to authenticated with check (
    requester_id = (select auth.uid())
    and not auth_is_trip_owner(trip_id)
  );
-- Update is split into narrow, transition-constrained policies (H2). Without a
-- WITH CHECK a requester could self-accept (status='accepted') and force the
-- Phase-05 contact reveal without the owner's consent. Only NON-seat-affecting
-- transitions are allowed client-side; anything that changes seats
-- (accept, or withdrawing an already-accepted request) goes through a
-- security-definer RPC in Phase 05.
--
-- Requester may withdraw their own PENDING request (pending -> withdrawn).
create policy trip_requests_withdraw_pending on trip_requests
  for update to authenticated
  using (requester_id = (select auth.uid()) and status = 'pending')
  with check (requester_id = (select auth.uid()) and status = 'withdrawn');
-- Trip owner may decline a PENDING request (pending -> declined).
create policy trip_requests_owner_decline on trip_requests
  for update to authenticated
  using (auth_is_trip_owner(trip_id) and status = 'pending')
  with check (auth_is_trip_owner(trip_id) and status = 'declined');

-- ---- reviews: ratings readable; inserts are server-only (H3) ----
-- Client inserts are intentionally NOT allowed: a with-check on from_user alone
-- can't verify trip membership or completion, so any user could fake reviews.
-- Phase 06 inserts reviews via a service-role/definer route that checks the
-- reviewer was in a completed trip. (No insert policy => RLS denies client insert.)
create policy reviews_read on reviews
  for select to authenticated using (true);

-- ---- reports: private to the reporter (ops reads via service role) ----
create policy reports_owner_read on reports
  for select to authenticated using (reporter_id = (select auth.uid()));
create policy reports_insert_self on reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));

-- ---- notifications: only the recipient reads / marks read ----
-- Inserts are performed server-side (service role / definer RPCs, Phase 05).
create policy notifications_owner_read on notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_owner_update on notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
