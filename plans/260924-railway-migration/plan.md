---
title: "Chuyển Vercel + Supabase → Railway (app + Postgres)"
status: in-progress
created: 2026-09-24
scope: infra
blockedBy: []
blocks: []
---

# Chuyển RoadMate từ Vercel + Supabase sang Railway

## Mục tiêu
Chạy Next.js app trên **Railway** (một Node server luôn chạy) thay cho Vercel (serverless).
~~Supabase Cloud giữ nguyên~~ → **Cập nhật 2026-10:** bỏ luôn Supabase, dùng **Postgres trên Railway**
và auth **email + mật khẩu** tự viết (xem [Giai đoạn 2](#giai-đoạn-2-bỏ-supabase-postgres-trên-railway--email--mật-khẩu)).
Resend giữ nguyên (OTP badge SV + email thông báo).

## Hiện trạng: những chỗ đang phụ thuộc Vercel

| Chỗ | Hiện tại | Việc cần làm |
|-----|----------|--------------|
| `vercel.json` | `regions: ["sin1"]` | Xoá. Region chuyển sang `railway.json` |
| `app/layout.tsx:3,…` + `package.json` | `@vercel/analytics` | Gỡ bỏ (chỉ chạy được trên Vercel). Xem phần Analytics |
| `app/auth/callback/route.ts:10` | Lấy `origin` từ `request.url` | Sau proxy của Railway, `request.url` có thể mang host nội bộ (`localhost:8080`) → redirect hỏng. Tạo origin từ `x-forwarded-host`/`x-forwarded-proto`, fallback `NEXT_PUBLIC_SITE_URL` |
| `.gitignore:38` | `.vercel` | Xoá dòng này (không bắt buộc) |
| `DEPLOY.md`, `plan.md` (stack) | Hướng dẫn cho Vercel | Viết lại mục 4 cho Railway |
| Preview deploy mỗi PR | Có sẵn trên Vercel | Bật **PR Environments** trên Railway (tuỳ chọn) |
| CDN edge cho static | Có sẵn trên Vercel | Railway không có CDN. Nên đặt Cloudflare phía trước (tuỳ chọn) |

Không bị ảnh hưởng: Route Handlers, middleware (`@supabase/ssr` chạy tốt trên Node), PWA (`sw.js` được build vào `public/`),
`next/font` (tải lúc build). App không dùng `next/image`, ISR, cron, hay `export const runtime = "edge"`.

## Các quyết định chính
1. **Builder: Railpack (mặc định của Railway), không viết Dockerfile.** Railpack đọc `packageManager: pnpm@10.25.0` trong `package.json` và tự chạy `pnpm install` + `pnpm build`. Chỉ viết Dockerfile khi thật sự cần kiểm soát image.
2. **Bật `output: "standalone"` trong `next.config.mjs`.** Image nhỏ hơn, khởi động nhanh hơn. Đổi lại, start command phải copy `public/` và `.next/static` vào thư mục standalone (xem bước 2). Nếu chưa muốn làm việc này thì giữ `next start`, vẫn chạy được.
3. **Region: `asia-southeast1` (Singapore)** cho cả app và Postgres, gần người dùng VN.
4. **Một instance, luôn chạy.** Không có cold start. Với traffic MVP thì 1 replica là đủ.

## Các bước

### Bước 1: Dọn phần phụ thuộc Vercel (code)
- [x] `pnpm remove @vercel/analytics`; xoá `import { Analytics }` và `<Analytics />` trong `app/layout.tsx`.
- [x] Xoá `vercel.json`.
- [x] Sửa `app/auth/callback/route.ts` để lấy origin từ header proxy:
  ```ts
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const origin = process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`;
  ```
  (Ưu tiên `NEXT_PUBLIC_SITE_URL` để không phải tin header. PR env thì để trống biến này.)

### Bước 2: Cấu hình Railway (config as code)
- [x] `next.config.mjs`: thêm `output: "standalone"`.
- [x] Tạo `railway.json`:
  ```json
  {
    "$schema": "https://railway.com/railway.schema.json",
    "build": {
      "builder": "RAILPACK",
      "buildCommand": "pnpm build && cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/"
    },
    "deploy": {
      "startCommand": "HOSTNAME=0.0.0.0 node .next/standalone/server.js",
      "healthcheckPath": "/api/health",
      "healthcheckTimeout": 60,
      "restartPolicyType": "ON_FAILURE",
      "multiRegionConfig": {
        "asia-southeast1-eqsg3a": { "numReplicas": 1 }
      }
    }
  }
  ```
  Server standalone tự đọc `PORT` do Railway cấp. Phải set `HOSTNAME=0.0.0.0` để proxy của Railway gọi được vào server.
- [x] Chạy thử local: `pnpm build && node .next/standalone/server.js`. Kiểm tra `/`, `/sw.js`, `/manifest.webmanifest`, `/api/health`.
- [ ] Lưu ý: `/api/health` trả 503 khi không gọi được DB (nay là Postgres), nên **deploy mới sẽ không được promote nếu Supabase đang sự cố**. Chấp nhận được cho MVP. Nếu không muốn vậy thì thêm route liveness riêng (`/api/live`, luôn trả 200) và trỏ healthcheck vào đó.

> ✅ Bước 1–2 xong (2026-10-02): lint, typecheck, build xanh. Đã chạy thử standalone server ở local: `/`, `/sw.js`,
> `/manifest.webmanifest`, `/_next/static/*`, `/legal/terms` đều trả 200. Callback redirect theo `x-forwarded-host/proto`.
> Field `multiRegionConfig` lấy theo schema Railway nhưng chưa kiểm chứng được (sandbox không truy cập được railway.com).
> Nếu Railway báo lỗi config, chọn region trong Settings → Deploy → Regions.

## Giai đoạn 2: bỏ Supabase (Postgres trên Railway + email/mật khẩu)

Quyết định (2026-10-02): chưa có dữ liệu production → làm DB mới, không migrate; giữ badge SV (OTP qua Resend);
chưa làm quên mật khẩu; giữ email thông báo.

- [x] **Schema:** gộp 6 migration Supabase thành `db/migrations/0001_init.sql`. Bỏ RLS, `auth.users`, trigger
  `handle_new_user`; thêm bảng `users` (email + `password_hash`) và `sessions`. 4 hàm vòng đời request
  (`accept_request`, …) giữ nguyên logic khoá dòng `FOR UPDATE`, nhận thêm `p_uid` thay cho `auth.uid()`.
- [x] **Migrate/seed:** `scripts/db.mjs` (bảng `schema_migrations`, advisory lock). Railway chạy
  `migrate` qua `preDeployCommand`. Seed idempotent.
- [x] **Truy cập DB:** `pg` + SQL thuần (`lib/db`). Nested JSON (`from_point`, `creator`, `requests`…) dựng bằng
  `json_build_object` nên shape dữ liệu cho component không đổi.
- [x] **Auth:** scrypt (`lib/auth/password.ts`), session token ngẫu nhiên trong cookie httpOnly, DB chỉ lưu sha-256
  (`lib/auth/session.ts`), hết hạn sau 30 ngày. Route: `signup`, `login`, `logout`, `me/password` (đổi mật khẩu,
  đăng xuất các thiết bị khác). Rate limit in-memory cho login/signup. Không gửi email khi đăng ký.
- [x] **Phân quyền thay RLS:** middleware chỉ kiểm tra có cookie; mọi page/route xác thực session với DB.
  Quy tắc đọc chuyến của `trips_read` chuyển vào `fetchTripById`; các cột server-managed
  (`sv_verified`, `rating_avg`) không thể sửa qua `PATCH /api/me/profile`.
- [x] **Kiểm thử:** E2E 76/76 case trên Postgres 16 + server standalone (đăng ký/đăng nhập, cookie giả mạo,
  chuyến, request/accept/withdraw, lộ SĐT, review, report, cancel, OTP SV, đổi mật khẩu, logout).
  CI chạy migrate + seed trên service Postgres.

### Bước 3: Tạo project trên Railway (cần tài khoản của bạn)
- [ ] Railway → New Project → Deploy from GitHub repo `cuongnc0211/roadmate`, branch `main`.
- [ ] **+ New → Database → PostgreSQL** (cùng region Singapore).
- [ ] Settings → bật **"Wait for CI"** để chỉ deploy khi `.github/workflows/ci.yml` xanh.
- [ ] **Variables** (Railway cũng đưa các biến này vào lúc build, nên `NEXT_PUBLIC_*` được inline như trên Vercel):

  | Key | Ghi chú |
  |-----|---------|
  | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (biến tham chiếu, đi qua private network) |
  | `NEXT_PUBLIC_SITE_URL` | lúc đầu là `https://<service>.up.railway.app`, sau đổi sang domain thật |
  | `SV_EMAIL_DOMAINS` | như hiện tại |
  | `RESEND_API_KEY` | secret (sealed) |
  | `EMAIL_FROM` | như hiện tại |

  ⚠️ Đổi bất kỳ biến `NEXT_PUBLIC_*` nào cũng phải **redeploy (build lại)** thì mới có hiệu lực.
- [ ] Networking → Generate Domain để có URL `*.up.railway.app`.

### Bước 4: Seed dữ liệu điểm đón
- [ ] Migration tự chạy khi deploy. Seed một lần từ máy bạn bằng public URL của Postgres:
  `DATABASE_URL='postgresql://…proxy.rlwy.net:…/railway' pnpm db:seed` (xem `DEPLOY.md` §3).

### Bước 5: Staging smoke test trên domain `*.up.railway.app`
Làm lại checklist trong `DEPLOY.md` §6: đăng ký email + mật khẩu → `/board`, đăng chuyến, request/accept/lộ SĐT,
rating, đổi mật khẩu, OTP badge SV, `/legal/*`, cài PWA + offline shell, `GET /api/metrics`, email Resend được gửi
(xem Railway logs).

### Bước 6: Cutover domain
- [ ] Trước 24h: hạ TTL bản ghi DNS xuống 300s.
- [ ] Railway → Custom Domain → thêm domain, trỏ CNAME theo hướng dẫn, đợi SSL cấp xong.
- [ ] Cập nhật `NEXT_PUBLIC_SITE_URL` = domain thật → redeploy.
- [ ] Theo dõi logs và `/api/health` trong 24–48h.

### Bước 7: Dọn dẹp
- [x] Viết lại `DEPLOY.md` cho Railway + Postgres; sửa dòng Stack trong `plans/260923-roadmate-mvp-web/plan.md`.
- [ ] Sau 1 tuần ổn định: xoá project Vercel và project Supabase, xoá `.vercel` trong `.gitignore`.

## Rollback
Chưa có dữ liệu production nên chưa có gì để mất. Sau khi Giai đoạn 2 merge, code **không còn chạy được trên
Vercel + Supabase** (đã bỏ hẳn Supabase), nên rollback = revert commit của Giai đoạn 2 rồi deploy lại Vercel.
Khi đã có người dùng thật trên Railway, rollback chỉ còn là deploy lại bản trước trên Railway (Deployments → Redeploy).

## Analytics thay cho `@vercel/analytics`
Fill rate đã được đo server-side qua `/api/metrics`, nên MVP không cần thêm gì. Nếu cần pageview thì có thể dùng:
- **Umami** tự host ngay trên Railway (template sẵn, dùng Postgres của Railway), rẻ và tự quản dữ liệu; hoặc
- **PostHog / Plausible Cloud**: chỉ cần gắn một script. Nhớ cập nhật service worker/CSP nếu sau này có thêm CSP.

## Chi phí & vận hành (ước tính)
- Railway Hobby: $5/tháng, đã gồm $5 usage. App Next.js (~200–400 MB RAM) + Postgres nhỏ, luôn chạy, ước tính **$5–15/tháng** ở mức traffic MVP. Bù lại không còn trả Supabase.
- Mất so với Vercel: CDN edge, preview mỗi PR bật sẵn, autoscale serverless.
- Được so với Vercel: không cold start, không giới hạn thời gian chạy mỗi function, chạy được background job/cron trong cùng project nếu sau này cần (ví dụ nhắc chuyến, ZNS).

## Rủi ro
| Rủi ro | Giảm thiểu |
|--------|------------|
| Redirect sau login sai host vì proxy | Fix ở bước 1 và test ở bước 5 |
| Quên redeploy sau khi đổi `NEXT_PUBLIC_*` | Ghi rõ trong DEPLOY.md |
| Healthcheck fail khi Postgres down, chặn deploy | Tách route liveness nếu thấy phiền |
| User quên mật khẩu (chưa có reset) | Admin xoá user để đăng ký lại; làm reset qua email ở bản sau |
| Rate limit in-memory mất khi restart / không chia sẻ giữa replica | Đủ cho 1 replica; chuyển sang Postgres nếu scale |
| Mất dữ liệu Postgres | Bật Backups của Railway Postgres |
| Static asset chậm hơn vì không có CDN | Cache header của `_next/static` là immutable sẵn; thêm Cloudflare proxy nếu cần |
| Một replica nên lúc deploy có thể gián đoạn ngắn | Healthcheck của Railway đợi bản mới sẵn sàng rồi mới chuyển traffic |

## Tiêu chí hoàn thành
- Production chạy trên Railway (Singapore) với domain thật, SSL hợp lệ.
- Toàn bộ smoke test trong `DEPLOY.md` §6 đều pass.
- Trong code không còn tham chiếu Vercel hay Supabase. CI xanh.
- Đã xoá project Vercel và Supabase sau 1 tuần ổn định.
