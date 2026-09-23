-- Phase 03 — auth support: auto-provision a profile on signup, and a
-- server-only table backing the SV (student) email verification badge.

-- ============================================================
-- Auto-create profile + profile_private when an auth user is created.
-- Runs as definer (bypasses RLS + column grants), so it can seed the row
-- before the user's first authenticated request.
-- ============================================================
create function handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(nullif(split_part(new.email, '@', 1), ''), 'Người dùng'))
  on conflict (id) do nothing;

  insert into public.profile_private (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- SV email verification codes. Server-only: written/read exclusively via the
-- service-role client in the verify-email routes. No RLS policies => no
-- authenticated/anon access at all.
-- ============================================================
create table sv_verifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles (id) on delete cascade,
  email       text not null,
  code_hash   text not null,          -- sha-256 of the OTP, never the raw code
  expires_at  timestamptz not null,
  attempts    integer not null default 0,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);

create index sv_verifications_user_idx on sv_verifications (user_id, created_at desc);

alter table sv_verifications enable row level security;
-- Belt-and-braces: strip the default table grants from client roles.
revoke all on sv_verifications from anon, authenticated;
