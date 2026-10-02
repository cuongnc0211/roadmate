# RoadMate

Web PWA ghép chuyến **Hoà Lạc ↔ Hà Nội** (ghép taxi / đi chung xe, chia chi phí).
Beachhead: sinh viên. Spec đầy đủ: [`docs/roadmate-mvp-design.md`](docs/roadmate-mvp-design.md).
Kế hoạch triển khai: [`plans/260923-roadmate-mvp-web/plan.md`](plans/260923-roadmate-mvp-web/plan.md).

## Tech stack

- **Next.js 15** (App Router, TypeScript) — UI + API layer (Route Handlers)
- **PostgreSQL** (Railway in prod, Docker local) qua `pg` — SQL thuần, không ORM
- **Auth tự viết:** email + mật khẩu (scrypt), session lưu trong Postgres, cookie httpOnly
- **Tailwind CSS v4** + shadcn/ui-style components
- **PWA** (`@ducanh2912/next-pwa`), mobile-first
- **pnpm** (bắt buộc — không dùng npm/yarn/bun)

## Yêu cầu môi trường

- Node ≥ 20 (repo test trên v22)
- pnpm ≥ 10
- Docker (cho Postgres local)

## Chạy local

```bash
pnpm install

# 1) Postgres local (Docker) + schema + dữ liệu điểm đón
cp .env.example .env.local   # DATABASE_URL mặc định trỏ vào Docker
pnpm db:start
pnpm db:migrate && pnpm db:seed

# 2) App
pnpm dev                     # http://localhost:3000 → Đăng ký bằng email + mật khẩu
```

Health check: [`/api/health`](http://localhost:3000/api/health) — trả `{ ok: true }` khi kết nối được Postgres.

## Biến môi trường

Xem [`.env.example`](.env.example). Tóm tắt:

| Biến | Vị trí | Ghi chú |
|------|--------|---------|
| `DATABASE_URL` | **server-only** | Connection string Postgres. KHÔNG để lộ ra client. |
| `NEXT_PUBLIC_SITE_URL` | client + server | Base URL của app (inline lúc build) |
| `SV_EMAIL_DOMAINS` | server | Domain email trường cho badge SV |
| `RESEND_API_KEY` / `EMAIL_FROM` | server | Gửi OTP badge SV + email thông báo (trống = log ra console) |

> ⚠️ Không commit `.env.local` hay bất kỳ secret nào.

## Scripts

| Lệnh | Việc |
|------|------|
| `pnpm dev` | Chạy dev server |
| `pnpm build` / `pnpm start` | Build + chạy production |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:start` / `db:stop` | Postgres local (Docker, xem `docker-compose.yml`) |
| `pnpm db:migrate` | Áp các file mới trong `db/migrations/` (Railway chạy tự động trước mỗi deploy) |
| `pnpm db:seed` | Seed corridor + 12 điểm đón (idempotent) |
| `pnpm db:reset` | Xoá sạch DB local + migrate + seed lại |

## Cấu trúc

```
app/
  (app)/            # shell mobile-first: TopBar + 5 tab + TabBar
    board/ create/ mine/ notifs/ profile/
  api/              # Route Handlers (auth, trips, requests, …)
  api/health/       # health check kết nối Postgres
  layout.tsx        # root: fonts, theme, toaster
  manifest.ts       # PWA manifest
components/
  shell/            # TopBar, TabBar, ThemeToggle, PageStub
  ui/               # button, switch, sonner (shadcn-style)
  theme-provider.tsx
lib/
  db/               # pool `pg` (query/transaction) + row types
  auth/             # password (scrypt), session, guards, rate limit
  utils.ts          # cn()
db/                 # migrations/*.sql + seed.sql
scripts/db.mjs      # CLI migrate/seed
```

## Nguyên tắc kiến trúc

- **API-first, client-agnostic:** business logic ở Route Handlers → Zalo Mini App (Phase 2) tái dùng nguyên API.
- **Định danh key theo `zalo_id`** (nullable tới khi liên kết Zalo).
- **Không còn RLS:** mọi truy vấn chạy server-side; phân quyền nằm trong Route Handlers và các hàm SQL (`accept_request`, … nhận `p_uid` từ session). Thông tin nhạy cảm (SĐT, email trường) tách riêng ở `profile_private`.
- **Không thanh toán in-app**; SĐT tự nhập, chỉ lộ sau khi được duyệt.
