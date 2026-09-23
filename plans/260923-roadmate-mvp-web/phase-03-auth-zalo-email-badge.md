---
phase: 3
title: "Auth (Zalo + Email Badge)"
status: pending
priority: P1
dependencies: [1, 2]
---

# Phase 03: Auth — Zalo OAuth + Email Badge

<!-- Updated: Validation Session 1 — email-first launch, Zalo deferred, badge = soft gate -->

## Overview
**Launch bằng email magic link (Supabase native)** làm auth chính. Verify email trường cấp **badge SV** như **dấu tin cậy (soft gate — chưa verify vẫn dùng được)**. **Zalo OAuth thêm ở bản sau** (custom flow đã thiết kế sẵn, không chặn launch).

## Requirements
- Functional (launch): email magic link → có session Supabase; verify email trường → `sv_verified=true` (badge hiển thị). Không chặn cứng đăng/join theo badge.
- Non-functional: mọi token exchange server-side; whitelist domain email trường (config) khi cấp badge.

## Architecture
### Launch (bắt buộc)
- **Email magic link:** dùng Supabase Auth (magic link/OTP) làm đăng nhập chính. Session qua `@supabase/ssr`.
- **Badge SV (soft):** người dùng có thể verify email trường (magic link tới địa chỉ `.edu.vn`/domain trường trong whitelist) → set `sv_verified=true` + lưu `school_email`. Badge chỉ hiển thị + là dấu tin cậy; **KHÔNG** chặn đăng/join ở MVP (quyết định Validation #3). Chừa cấu hình để bật hard gate sau.
- **Identity:** key theo `auth.users.id`; `zalo_id` nullable, điền khi liên kết Zalo (bản sau).

### Zalo OAuth v4 — DEFERRED (bản sau, không thuộc launch)
> ⚠️ Xác nhận lại params với doc chính thức khi code: https://developers.zalo.me/docs/social-api/tham-khao/user-access-token-v4
- Flow server-side: `start` (PKCE `code_challenge`+`state`) → redirect `https://oauth.zaloapp.com/v4/permission` → `callback` verify `state` → `POST https://oauth.zaloapp.com/v4/access_token` (header `secret_key`, body `code`,`app_id`,`grant_type=authorization_code`,`code_verifier`) → `GET https://graph.zalo.me/v2.0/me?fields=id,name,picture`.
- **Bind (Validation #2): synthetic email `zalo_<id>@<domain>` + Supabase Admin API** tạo/khớp `auth.users`, set `profiles.zalo_id`, mint session → giữ RLS chạy với `auth.uid()`. Khớp user cũ nếu `zalo_id` đã tồn tại.

## Related Code Files
### Launch
- Create: `app/api/auth/verify-email/route.ts` (gửi + xác nhận magic link badge SV)
- Create: `app/(auth)/login/page.tsx` (email magic link), `components/auth/*`
- Create: `lib/auth/guards.ts` (`getUser`, `getSvStatus` — soft; `requireSvVerified` để sẵn cho hard gate tương lai, chưa áp)
- Modify: `middleware.ts` (refresh session), `lib/supabase/server.ts`
### Deferred (Zalo, bản sau)
- Create: `app/api/auth/zalo/start/route.ts`, `app/api/auth/zalo/callback/route.ts`
- Create: `lib/auth/zalo.ts` (PKCE, token exchange, profile), `lib/auth/session.ts` (mint session qua Admin API)

## Implementation Steps
### Launch
1. Cấu hình Supabase email (magic link/OTP); màn `login` bằng email.
2. Route badge: gửi magic link tới email trường, xác nhận → `sv_verified=true` + `school_email`; whitelist domain (config).
3. `lib/auth/guards.ts`: `getUser` + `getSvStatus` (soft). Giữ `requireSvVerified` sẵn nhưng **KHÔNG áp** ở Phase 04/05 (soft gate).
4. UI: màn "Xác minh email trường" trong Hồ sơ; hiển thị badge SV; nudge (không chặn) khi chưa verify.
5. Test end-to-end trên preview.
### Deferred (khi thêm Zalo)
6. Đăng ký Zalo app; `lib/auth/zalo.ts` (start/exchange/profile, PKCE); route start/callback; bind synthetic email + Admin API; khớp `zalo_id`.

## Success Criteria
### Launch
- [ ] Đăng nhập email magic link → có session Supabase.
- [ ] Verify email trường → `sv_verified=true`, badge hiển thị; **chưa verify vẫn đăng/join được** (soft gate).
- [ ] Whitelist domain email trường hoạt động; token/secret chỉ ở server.
### Deferred
- [ ] (Bản sau) Đăng nhập Zalo tạo/khớp user theo `zalo_id` (synthetic email + Admin API), RLS vẫn chạy với `auth.uid()`.

## Risk Assessment
- Launch đơn giản (Supabase email native) → rủi ro thấp. Rủi ro cao dời sang khi thêm Zalo (custom flow) — đã tách khỏi đường tới hạn launch.
- Email trường ít dùng → soft gate tránh chặn nhầm người thật (quyết định Validation #3); theo dõi tỉ lệ verify để quyết siết hard gate sau.
- Khi thêm Zalo: đồng bộ `zalo_id` ↔ `auth.users` theo synthetic-email + Admin API (Validation #2), giữ nhất quán.
