---
title: "Chuyển hosting Vercel → Railway"
status: planned
created: 2026-09-24
scope: infra
blockedBy: []
blocks: []
---

# Chuyển hosting RoadMate từ Vercel sang Railway

## Mục tiêu
Chạy Next.js app trên **Railway** (một Node server luôn chạy) thay cho Vercel (serverless).
**Supabase Cloud và Resend giữ nguyên**, không phải migrate dữ liệu. Không đổi behaviour của sản phẩm.

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
3. **Region: `asia-southeast1` (Singapore)**, cùng region với Supabase, giữ độ trễ như `sin1` đang có.
4. **Một instance, luôn chạy.** Không có cold start. Với traffic MVP thì 1 replica là đủ.

## Các bước

### Bước 1: Dọn phần phụ thuộc Vercel (code)
- [ ] `pnpm remove @vercel/analytics`; xoá `import { Analytics }` và `<Analytics />` trong `app/layout.tsx`.
- [ ] Xoá `vercel.json`.
- [ ] Sửa `app/auth/callback/route.ts` để lấy origin từ header proxy:
  ```ts
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const origin = process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`;
  ```
  (Ưu tiên `NEXT_PUBLIC_SITE_URL` để không phải tin header. PR env thì để trống biến này.)

### Bước 2: Cấu hình Railway (config as code)
- [ ] `next.config.mjs`: thêm `output: "standalone"`.
- [ ] Tạo `railway.json`:
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
      "region": "asia-southeast1-eqsg3a",
      "numReplicas": 1
    }
  }
  ```
  Server standalone tự đọc `PORT` do Railway cấp. Phải set `HOSTNAME=0.0.0.0` để proxy của Railway gọi được vào server.
- [ ] Chạy thử local: `pnpm build && node .next/standalone/server.js`. Kiểm tra `/`, `/sw.js`, `/manifest.webmanifest`, `/api/health`.
- [ ] Lưu ý: `/api/health` trả 503 khi không gọi được Supabase, nên **deploy mới sẽ không được promote nếu Supabase đang sự cố**. Chấp nhận được cho MVP. Nếu không muốn vậy thì thêm route liveness riêng (`/api/live`, luôn trả 200) và trỏ healthcheck vào đó.

### Bước 3: Tạo project trên Railway (cần tài khoản của bạn)
- [ ] Railway → New Project → Deploy from GitHub repo `cuongnc0211/roadmate`, branch `main`.
- [ ] Settings → bật **"Wait for CI"** để chỉ deploy khi `.github/workflows/ci.yml` xanh.
- [ ] **Variables** (Railway cũng đưa các biến này vào lúc build, nên `NEXT_PUBLIC_*` được inline như trên Vercel):

  | Key | Ghi chú |
  |-----|---------|
  | `NEXT_PUBLIC_SUPABASE_URL` | như hiện tại |
  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | như hiện tại |
  | `SUPABASE_SERVICE_ROLE_KEY` | secret (chọn "sealed") |
  | `NEXT_PUBLIC_SITE_URL` | lúc đầu là `https://<service>.up.railway.app`, sau đổi sang domain thật |
  | `SV_EMAIL_DOMAINS` | như hiện tại |
  | `RESEND_API_KEY` | secret (sealed) |
  | `EMAIL_FROM` | như hiện tại |

  ⚠️ Đổi bất kỳ biến `NEXT_PUBLIC_*` nào cũng phải **redeploy (build lại)** thì mới có hiệu lực.
- [ ] Networking → Generate Domain để có URL `*.up.railway.app`.

### Bước 4: Supabase Auth
- [ ] Auth → URL Configuration → Redirect URLs: thêm `https://<service>.up.railway.app/auth/callback`
  (nếu dùng PR env thì thêm `https://*.up.railway.app/**`).
- [ ] Giữ URL của Vercel trong danh sách cho đến khi cutover xong, để còn đường rollback.

### Bước 5: Staging smoke test trên domain `*.up.railway.app`
Làm lại checklist trong `DEPLOY.md` §5: magic link → `/board`, đăng chuyến, request/accept/lộ SĐT, rating,
`/legal/*`, cài PWA + offline shell, `GET /api/metrics`, email Resend được gửi (xem Railway logs).
Kiểm tra thêm: sau khi login, redirect **đúng domain public** chứ không phải `localhost:8080` (liên quan bước 1).

### Bước 6: Cutover domain
- [ ] Trước 24h: hạ TTL bản ghi DNS xuống 300s.
- [ ] Railway → Custom Domain → thêm domain, trỏ CNAME theo hướng dẫn, đợi SSL cấp xong.
- [ ] Cập nhật `NEXT_PUBLIC_SITE_URL` = domain thật → redeploy.
- [ ] Supabase: Site URL = domain thật.
- [ ] Theo dõi logs và `/api/health` trong 24–48h.

### Bước 7: Dọn dẹp
- [ ] Viết lại `DEPLOY.md` §4 cho Railway; sửa dòng Stack trong `plans/260923-roadmate-mvp-web/plan.md`.
- [ ] Sau 1 tuần ổn định: xoá project Vercel, gỡ redirect URL Vercel khỏi Supabase, xoá `.vercel` trong `.gitignore`.

## Rollback
Trong giai đoạn chuyển, project Vercel vẫn chạy song song. Nếu Railway có lỗi thì trỏ DNS về lại Vercel.
TTL 300s nên rollback mất vài phút. Supabase dùng chung nên dữ liệu không lệch. Nếu code bước 1 đã merge,
Vercel vẫn chạy được: gỡ analytics không ảnh hưởng gì, còn fix origin cũng đúng trên Vercel.

## Analytics thay cho `@vercel/analytics`
Fill rate đã được đo server-side qua `/api/metrics`, nên MVP không cần thêm gì. Nếu cần pageview thì có thể dùng:
- **Umami** tự host ngay trên Railway (template sẵn, dùng Postgres của Railway), rẻ và tự quản dữ liệu; hoặc
- **PostHog / Plausible Cloud**: chỉ cần gắn một script. Nhớ cập nhật service worker/CSP nếu sau này có thêm CSP.

## Chi phí & vận hành (ước tính)
- Railway Hobby: $5/tháng, đã gồm $5 usage. Một app Next.js dùng khoảng 200–400 MB RAM, luôn chạy, nên thường nằm trong khoảng **$5–10/tháng** ở mức traffic MVP.
- Mất so với Vercel: CDN edge, preview mỗi PR bật sẵn, autoscale serverless.
- Được so với Vercel: không cold start, không giới hạn thời gian chạy mỗi function, chạy được background job/cron trong cùng project nếu sau này cần (ví dụ nhắc chuyến, ZNS).

## Rủi ro
| Rủi ro | Giảm thiểu |
|--------|------------|
| Redirect sau login sai host vì proxy | Fix ở bước 1 và test ở bước 5 |
| Quên redeploy sau khi đổi `NEXT_PUBLIC_*` | Ghi rõ trong DEPLOY.md |
| Healthcheck fail khi Supabase down, chặn deploy | Tách route liveness nếu thấy phiền |
| Static asset chậm hơn vì không có CDN | Cache header của `_next/static` là immutable sẵn; thêm Cloudflare proxy nếu cần |
| Một replica nên lúc deploy có thể gián đoạn ngắn | Healthcheck của Railway đợi bản mới sẵn sàng rồi mới chuyển traffic |

## Tiêu chí hoàn thành
- Production chạy trên Railway (Singapore) với domain thật, SSL hợp lệ.
- Toàn bộ smoke test trong `DEPLOY.md` §5 đều pass.
- Trong code không còn tham chiếu Vercel. CI xanh.
- Đã xoá project Vercel sau 1 tuần ổn định.
