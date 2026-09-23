---
phase: 3
title: "Auth (Zalo + Email Badge)"
status: done
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
- [x] Đăng nhập email magic link → có session Supabase. (E2E test qua Mailpit: login → callback PKCE → session; middleware redirect unauth→/login, authed khỏi /login.)
- [x] Verify email trường → `sv_verified=true`, badge hiển thị; **chưa verify vẫn đăng/join được** (soft gate). (E2E: OTP → badge SV; sv_verified/school_email set qua service role.)
- [x] Whitelist domain email trường hoạt động; token/secret chỉ ở server. (Test: gmail.com → domain_not_allowed; `x@edu.vn@evil.com` → invalid_email.)
### Deferred
- [ ] (Bản sau) Đăng nhập Zalo tạo/khớp user theo `zalo_id` (synthetic email + Admin API), RLS vẫn chạy với `auth.uid()`. — **CHƯA làm (đúng kế hoạch).**

## Completion Notes (Session 2026-09-23)
- **Auth launch:** email magic link (Supabase native, PKCE) + `middleware.ts` refresh session & bảo vệ route (API tự enforce 401, không redirect). Trigger `handle_new_user` (migration 0002) tự tạo `profiles`+`profile_private` khi signup.
- **SV badge (soft):** OTP tự sinh (6 số, hash sha-256, TTL 15', hạn 5 lần), gửi email qua `lib/email.ts` (Resend nếu có key, không thì log console ở dev). Xác nhận → set `sv_verified` + `school_email` qua **service role** (client không ghi được). Bảng `sv_verifications` server-only.
- **Naming lệch nhẹ so với plan:** routes là `app/api/auth/verify-email/{start,confirm}` (tách 2 bước) thay vì 1 route; guards ở `lib/auth/guards.ts` + helper `lib/auth/sv.ts`.
- **Code review (subagent) — findings đã fix + verify hành vi:**
  - **H1 (HIGH):** OTP brute-force/email-bomb (không rate limit + cap theo từng row). Fix: rate limit 3 lần/15' theo user, invalidate OTP cũ mỗi lần start, cap tích luỹ. Test: gửi lần 4 → 429.
  - **M1:** tăng `attempts` không atomic. Fix: update có điều kiện `attempts < MAX`. Test: 5 sai → 400, lần 6 → 429.
  - **M2:** email lỏng (`includes('@')`, lấy segment [1]). Fix: regex 1 `@`, lấy domain sau `@` cuối. Test: `x@edu.vn@evil.com` → invalid.
  - **L1:** `safeNext` chặn `//`, `/\`. **L2:** xoá row OTP nếu gửi email lỗi.
- **Bug tự fix:** hydration mismatch ở `ThemeToggle` (aria-label phụ thuộc theme) → nhãn ổn định tới khi mounted.
- **Nâng cấp phụ thuộc:** `@supabase/ssr` 0.5.2 → 0.12.7 để type `Database` (generated) flow đúng vào query (trước đó bị `never`).
- **Còn lại cho prod (Phase 07):** cắm `RESEND_API_KEY` để gửi OTP thật; cân nhắc rate-limit theo IP/email nếu lạm dụng.

## Risk Assessment
- Launch đơn giản (Supabase email native) → rủi ro thấp. Rủi ro cao dời sang khi thêm Zalo (custom flow) — đã tách khỏi đường tới hạn launch.
- Email trường ít dùng → soft gate tránh chặn nhầm người thật (quyết định Validation #3); theo dõi tỉ lệ verify để quyết siết hard gate sau.
- Khi thêm Zalo: đồng bộ `zalo_id` ↔ `auth.users` theo synthetic-email + Admin API (Validation #2), giữ nhất quán.
