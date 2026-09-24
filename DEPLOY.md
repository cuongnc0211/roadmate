# Deploy RoadMate to production

RoadMate = **Next.js on Vercel** + **Supabase Cloud**. Local dev uses the
Supabase CLI (Docker); production uses a hosted Supabase project.

> These steps need **your** accounts and secrets — they can't be run for you.

## 1. Create a Supabase Cloud project

1. https://supabase.com → New project (region: Singapore for VN latency).
2. Project Settings → API — copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**server-only, secret**)

## 2. Push the schema + seed to Cloud

```bash
pnpm dlx supabase link --project-ref <your-project-ref>
pnpm dlx supabase db push        # applies supabase/migrations/*
# seed corridor + 12 points (5 launch nodes):
pnpm dlx supabase db execute --file supabase/seed.sql   # or paste seed.sql in the SQL editor
```

Then, in the Supabase dashboard:
- **Auth → URL Configuration**: set Site URL = your Vercel URL and add
  `https://<your-app>/auth/callback` to Redirect URLs.
- **Auth → Email**: connect a real SMTP or keep Supabase's built-in for magic
  links. Raise the email rate limit if needed (local dev sets it high).

## 3. Email delivery (OTP + notifications) — Resend

1. https://resend.com → verify your sending domain (SPF/DKIM).
2. Set `RESEND_API_KEY` and `EMAIL_FROM` (e.g. `RoadMate <no-reply@yourdomain>`).
   Without `RESEND_API_KEY` the app logs emails to the server console (dev only).

## 4. Deploy to Vercel

1. Import the GitHub repo at https://vercel.com.
2. Framework preset: Next.js (auto). Build: `pnpm build`.
3. **Environment Variables** (Production + Preview):

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key (secret) |
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-app>` |
   | `SV_EMAIL_DOMAINS` | e.g. `fpt.edu.vn,st.fpt.edu.vn,hvtc.edu.vn,vnu.edu.vn` |
   | `RESEND_API_KEY` | Resend key |
   | `EMAIL_FROM` | verified sender |

4. Deploy. Then update the Supabase Auth Site URL / redirect to the live domain.

## 5. Smoke test in production

- Magic-link login → lands on `/board`.
- Post a trip → appears on board; filters work.
- Second account requests → owner accepts → contact reveal.
- Complete → both rate → `rating_avg` updates.
- `/legal/terms` + `/legal/disclaimer` load (public).
- Install PWA on a phone (Add to Home Screen); offline shell shows.
- `GET /api/metrics` returns the fill rate.

## Notes / follow-ups

- **CI**: `.github/workflows/ci.yml` runs lint + typecheck + build on push/PR.
- **Legal**: `/legal/*` are MVP summaries — have a lawyer review Nghị định
  10/2020 (cost-sharing posture) before wide promotion.
- **OG previews**: the trip page is auth-gated, so external crawlers (FB/Zalo)
  can't unfurl `/trip/:id` yet. For rich share previews, add a public preview
  route (shows route/time/price only, no contact) — deferred.
- **Tests**: no automated test suite yet — add Vitest for `lib/trips/time.ts`,
  `parseTripFilters`, and route auth as the next hardening step.
- **Zalo login / Mini App**: Phase 2 (see CLAUDE.md); the API is already
  client-agnostic for reuse.
