# RoadMate

Web PWA ghép chuyến **Hoà Lạc ↔ Hà Nội** (ghép taxi / đi chung xe, chia chi phí).
Beachhead: sinh viên. Spec đầy đủ: [`docs/roadmate-mvp-design.md`](docs/roadmate-mvp-design.md).
Kế hoạch triển khai: [`plans/260923-roadmate-mvp-web/plan.md`](plans/260923-roadmate-mvp-web/plan.md).

## Tech stack

- **Next.js 15** (App Router, TypeScript) — UI + API layer (Route Handlers)
- **Supabase** (Postgres + Auth + RLS + Realtime + Storage)
- **Tailwind CSS v4** + shadcn/ui-style components
- **PWA** (`@ducanh2912/next-pwa`), mobile-first
- **pnpm** (bắt buộc — không dùng npm/yarn/bun)

## Yêu cầu môi trường

- Node ≥ 20 (repo test trên v22)
- pnpm ≥ 10
- Docker (cho Supabase local)

## Chạy local

```bash
pnpm install

# 1) Supabase local (Docker). In ra URL + anon/service keys.
pnpm db:start
pnpm db:status        # copy URL + keys vào .env.local

# 2) App
cp .env.example .env.local   # điền các biến từ db:status
pnpm dev                     # http://localhost:3000
```

Health check: [`/api/health`](http://localhost:3000/api/health) — trả `{ ok: true }` khi kết nối được Supabase.

## Biến môi trường

Xem [`.env.example`](.env.example). Tóm tắt:

| Biến | Vị trí | Ghi chú |
|------|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | URL project (local hoặc cloud) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Anon key (RLS áp dụng) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-only** | Bypass RLS — chỉ dùng trong Route Handlers. KHÔNG để lộ ra client. |
| `NEXT_PUBLIC_SITE_URL` | client + server | Base URL của app |

> ⚠️ Không commit `.env.local` hay bất kỳ secret nào.

## Scripts

| Lệnh | Việc |
|------|------|
| `pnpm dev` | Chạy dev server |
| `pnpm build` / `pnpm start` | Build + chạy production |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:start` / `db:stop` / `db:status` | Supabase local (Docker) |
| `pnpm db:reset` | Reset DB + chạy lại migrations/seed |
| `pnpm db:types` | Gen TypeScript types từ schema → `lib/db/types.ts` |

## Cấu trúc

```
app/
  (app)/            # shell mobile-first: TopBar + 5 tab + TabBar
    board/ create/ mine/ notifs/ profile/
  api/health/       # health check kết nối Supabase
  layout.tsx        # root: fonts, theme, toaster
  manifest.ts       # PWA manifest
components/
  shell/            # TopBar, TabBar, ThemeToggle, PageStub
  ui/               # button, switch, sonner (shadcn-style)
  theme-provider.tsx
lib/
  supabase/         # client (browser) + server/admin
  utils.ts          # cn()
supabase/           # config, migrations, seed (từ Phase 02)
```

## Nguyên tắc kiến trúc

- **API-first, client-agnostic:** business logic ở Route Handlers → Zalo Mini App (Phase 2) tái dùng nguyên API.
- **Định danh key theo `zalo_id`** (nullable tới khi liên kết Zalo).
- **RLS bật cho mọi bảng** (defense-in-depth).
- **Không thanh toán in-app**; SĐT tự nhập, chỉ lộ sau khi được duyệt.
