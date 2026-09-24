-- Phase 07 — lightweight analytics events + email opt-out.

-- Append-only event log for the liquidity metrics (fill rate, time-to-match…).
create table events (
  id         uuid primary key default gen_random_uuid(),
  type       text not null,          -- trip_created | request_created | request_accepted | trip_completed
  user_id    uuid references profiles (id) on delete set null,
  trip_id    uuid references trips (id) on delete set null,
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index events_type_created_idx on events (type, created_at);
create index events_trip_idx on events (trip_id);

-- Written only by the server (service role); no client access.
alter table events enable row level security;
revoke all on events from anon, authenticated;

-- Email opt-out (in-app notifications are always on; this gates emails only).
alter table profiles add column email_notifications boolean not null default true;

-- Let users toggle their own email preference (client-writable column).
grant update (email_notifications) on profiles to authenticated;
grant select (email_notifications) on profiles to authenticated;
-- (Fill rate is computed in lib/analytics.ts via the service-role client.)
