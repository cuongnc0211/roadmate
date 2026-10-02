# Deploy RoadMate to production

RoadMate = **Next.js + PostgreSQL, both on Railway** (region Singapore).
Local dev uses Postgres in Docker (`pnpm db:start`).

> These steps need **your** accounts and secrets — they can't be run for you.

## 1. Create the Railway project

1. https://railway.com → New Project → **Deploy from GitHub repo** → `roadmate`, branch `main`.
   Build/start/healthcheck/region come from [`railway.json`](railway.json).
2. In the same project: **+ New → Database → PostgreSQL**. Put it in the same
   region as the app (Singapore).
3. App service → **Settings**: enable **"Wait for CI"** so only green commits deploy.

## 2. Environment variables (app service → Variables)

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference variable → private network, no egress fees) |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-app>` (start with the `*.up.railway.app` domain) |
| `SV_EMAIL_DOMAINS` | e.g. `fpt.edu.vn,st.fpt.edu.vn,hvtc.edu.vn,vnu.edu.vn` |
| `RESEND_API_KEY` | Resend key (mark as sealed) |
| `EMAIL_FROM` | verified sender, e.g. `RoadMate <no-reply@yourdomain>` |

⚠️ `NEXT_PUBLIC_*` values are inlined at **build** time: changing one needs a redeploy.

## 3. Schema + seed

- **Migrations run automatically** before every deploy (`preDeployCommand` →
  `node scripts/db.mjs migrate`). Applied files are tracked in `schema_migrations`.
- **Seed once** (corridor + 12 pickup points), from your machine with the
  Postgres service's *public* URL (Postgres → Connect → Public Network):

  ```bash
  DATABASE_URL='postgresql://…proxy.rlwy.net:…/railway' pnpm db:seed
  ```

  The seed is idempotent — re-running it is safe.

## 4. Email (SV badge OTP + trip notifications) — Resend

1. https://resend.com → verify your sending domain (SPF/DKIM).
2. Set `RESEND_API_KEY` and `EMAIL_FROM`.
   Without `RESEND_API_KEY` emails are logged to the server console (dev only).

Signup/login send **no** email (email + password, no verification).

## 5. Domain

1. App service → Networking → **Generate Domain** (for testing), then
   **Custom Domain** → add the CNAME it shows at your DNS provider.
2. Set `NEXT_PUBLIC_SITE_URL` to the final domain → redeploy.

## 6. Smoke test in production

- Sign up with email + password → lands on `/board`; log out / log in again.
- Post a trip → appears on board; filters work.
- Second account requests → owner accepts → contact reveal.
- Complete → both rate → `rating_avg` updates.
- Profile: change password (other devices get signed out); SV OTP email arrives.
- `/legal/terms` + `/legal/disclaimer` load (public).
- Install PWA on a phone (Add to Home Screen); offline shell shows.
- `GET /api/health` → `{ ok: true }`; `GET /api/metrics` returns the fill rate.

## Operations

- **Backups:** enable Railway Postgres backups (Postgres service → Backups).
- **Logs:** app service → Deployments → View logs.
- **Rate limiting** of login/signup is in-memory, per instance — fine for one
  replica; move it to Postgres/Redis before scaling out.

## Notes / follow-ups

- **CI**: `.github/workflows/ci.yml` runs migrate + seed on a throwaway
  Postgres, then lint + typecheck + build on push/PR.
- **Forgot password**: not built yet (deliberately out of MVP). An admin can
  reset a user by deleting their row in `users` (cascades) so they re-register,
  or by writing a new hash from `lib/auth/password.ts`.
- **Legal**: `/legal/*` are MVP summaries — have a lawyer review Nghị định
  10/2020 (cost-sharing posture) before wide promotion.
- **OG previews**: the trip page is auth-gated, so external crawlers (FB/Zalo)
  can't unfurl `/trip/:id` yet. For rich share previews, add a public preview
  route (shows route/time/price only, no contact) — deferred.
- **Tests**: no automated test suite yet — add Vitest for `lib/trips/time.ts`,
  `parseTripFilters`, auth, and the request lifecycle as the next hardening step.
- **Zalo login / Mini App**: Phase 2 (see the design doc); the API is already
  client-agnostic for reuse.
