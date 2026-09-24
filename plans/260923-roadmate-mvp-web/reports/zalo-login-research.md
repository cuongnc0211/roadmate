# Research: Login with Zalo (Web) — 2026-09-24

> Phạm vi: Zalo Social Login (OAuth v4) cho Web PWA — bản sau launch (launch dùng email magic link, xem CLAUDE.md § Auth).
> Hạn chế nguồn: trang doc developers.zalo.me là SPA, không render được nội dung (kể cả qua browser). Endpoint lấy từ **SDK PHP chính thức** (`zaloplatform/zalo-php-sdk`); các điều kiện pháp lý/kích hoạt lấy từ oa.zalo.me + nguồn phụ. Mỗi kết luận có ghi độ tin cậy.

## 1. Luồng OAuth v4 (tin cậy: cao — khớp SDK chính thức)

| Bước | Gọi |
|---|---|
| Authorize | `GET https://oauth.zaloapp.com/v4/permission?app_id&redirect_uri&code_challenge&state` |
| Token | `POST https://oauth.zaloapp.com/v4/access_token` — header `secret_key: <app_secret>`; form body `code, app_id, grant_type=authorization_code, code_verifier` |
| Refresh | cùng endpoint, `grant_type=refresh_token, refresh_token, app_id` |
| Profile | `GET https://graph.zalo.me/v2.0/me?fields=id,name,picture` — header `access_token` |

- PKCE S256: `code_challenge = base64url(sha256(code_verifier))`.
- **Không trả email**; Zalo **không phải OIDC** (không `id_token`/discovery) → không dùng được OIDC provider chung của Supabase → cần synthetic email (đúng với design).
- Lifetime token (nguồn phụ, có thể là số của OA): access ~1h, refresh 3 tháng, dùng 1 lần. Không quan trọng vì đề xuất **không lưu token Zalo**.
- Portal có "DPoP debugger" → **cần xác nhận** Social API có bắt DPoP không.

## 2. Tạo phiên Supabase — đề xuất: synthetic email + `generateLink` server-side

1. `/api/auth/zalo/start`: sinh `state` + `code_verifier` → cookie httpOnly/Secure/SameSite=Lax (~10 phút) → redirect permission.
2. `/api/auth/zalo/callback`: check `state` → đổi token → `/me` lấy `zalo_id` →
   - tìm `profiles.zalo_id`; chưa có → `admin.createUser({ email: 'zalo_<id>@users.roadmate.invalid', email_confirm: true })` + set `zalo_id` (service role);
   - `admin.generateLink({ type: 'magiclink', email })` → `hashed_token` → `supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })` bằng SSR client để set cookie.
   - Kết quả: session Supabase chuẩn (có refresh), RLS `auth.uid()` giữ nguyên, trigger `handle_new_user` vẫn chạy.
- Loại: tự ký JWT (không refresh token, vướng asymmetric signing keys).
- Schema hiện tại đã sẵn: `zalo_id text unique`, nullable, server-only (`0001_init.sql`). Không cần migration.

## 3. Liên kết tài khoản

- Đang có session email → "Liên kết Zalo" (Settings): set `zalo_id` cho `auth.uid()`; nếu `zalo_id` đã thuộc user khác → báo lỗi, **không auto-merge**.
- Không session → login/tạo user synthetic.
- Rủi ro trùng tài khoản (email + Zalo riêng) → giảm bằng copy nút rõ + chỉ link trong Settings.

## 4. Điều kiện publish: có cần OA / đăng ký kinh doanh không?

Phải tách 2 thứ khác nhau:

| | Zalo **Social Login** (Web — việc này) | Zalo **Mini App** (Phase 2) |
|---|---|---|
| Tạo App ID | Tài khoản Zalo **cá nhân**, miễn phí (tin cậy: cao) | — |
| Kích hoạt để mọi user login được | Bật toggle "Kích hoạt" + SĐT, email, icon; xác thực domain + khai báo Callback URL (tin cậy: trung bình — nguồn phụ, không thấy yêu cầu giấy tờ) | Cần **OA đã xác thực** (giấy tờ ĐKKD) |
| Cần OA? | **Không** thấy yêu cầu (tin cậy: trung bình). OA/ZCA chỉ cần cho OA API, ZNS | Có |
| Cần ĐKKD? | **Không** thấy yêu cầu (tin cậy: trung bình) | Có |

- Trước khi kích hoạt, theo doc Zalo ("cần kích hoạt ứng dụng để thực hiện API với toàn bộ người dùng") app chỉ chạy với admin/tester → dev được ngay, không chặn.
- **ZCA** (Zalo Cloud Account): chỉ cần cho tính năng trả phí (ZNS, OA API); ZCA yêu cầu OA đã xác thực + MST. Social Login không cần.

### Hộ kinh doanh có dùng được không? (cho OA — cần khi làm Mini App / ZNS)

- **Có.** Hướng dẫn xác thực OA của Zalo ghi rõ "doanh nghiệp/HKD"; Cách 1 chấp nhận **Giấy chứng nhận đăng ký hộ kinh doanh**, tên OA phải trùng tên HKD trên giấy (tên chung chung thì thêm tiền tố "HKD"/"Cửa hàng"…). (tin cậy: cao — oa.zalo.me)
- **Lưu ý:** nếu Zalo xếp RoadMate vào **ngành kinh doanh có điều kiện** (vận tải) → Cách 3 đòi thêm **giấy phép hoạt động ngành có điều kiện**, HKD thường không có giấy phép vận tải. Doc không liệt kê rõ vận tải; hỏi `oa@zalo.me` / `mini@zalo.me` với mô tả "peer chia sẻ chi phí, không vận tải, không thu hộ".

## 5. Rủi ro / việc cần verify trước khi code

1. **`zalo_id` có app-scoped không** (quan trọng nhất). `getUserInfo` của Mini App có cả `id` và `idByOA` → gợi ý ID theo app. Nếu Social Login app ≠ app Mini App → cùng người ra 2 `zalo_id` → vỡ D7 (key theo `zalo_id`). Hỏi Zalo: dùng chung 1 App ID cho web login + Mini App được không; hoặc dùng `idByOA` làm khoá hội tụ (khi đó cần OA → cần HKD/DN).
2. Xác nhận kích hoạt Social Login không đòi giấy tờ: tự tạo app trên developers.zalo.me (~10 phút), bật kích hoạt, login bằng 1 tài khoản không phải admin.
3. DPoP có bắt buộc với Social API không.
4. iOS PWA standalone: redirect OAuth có thể mở ngữ cảnh Safari khác → mất cookie (magic link cũng dính — test chung).

## 6. Ước lượng

2 route handler + `lib/auth/zalo.ts` (PKCE + API) + nút Zalo ở `app/(auth)/login` + mục liên kết trong Settings + env `ZALO_APP_ID`, `ZALO_APP_SECRET`, `ZALO_REDIRECT_URI`. ~1–1.5 ngày, chưa tính verify mục 5.

## Nguồn

- SDK PHP chính thức: https://github.com/zaloplatform/zalo-php-sdk/blob/master/src/Authentication/OAuth2Client.php
- Logto – Zalo OAuth endpoints: https://logto.io/oauth-providers-explorer/zalo
- User Access Token V4: https://developers.zalo.me/docs/social-api/tham-khao/user-access-token-v4
- Xác thực & ủy quyền cho ứng dụng: https://developers.zalo.me/docs/official-account/bat-dau/xac-thuc-va-uy-quyen-cho-ung-dung-new
- Tạo App ID & liên kết OA (ZCA): https://zalo.solutions/blog/huong-dan-tao-ung-dung-app-id-va-lien-ket-voi-zalo-oa-/qvzvew3ucioojluzbqfmkf0r
- Mageplaza – cấu hình Zalo social login: https://docs.mageplaza.com/magento/social-login/how-to-configure-zalo-api/
- Zalo Developer (tạo app bằng TK cá nhân): https://www.oazns.vn/zalo-developer/
- Hướng dẫn xác thực OA: https://oa.zalo.me/home/documents/guides/huong-dan-xac-thuc_70
- Xác thực theo tên DN/HKD: https://oa.zalo.me/home/documents/guides/theo-ten-doanh-nghiep-ho-kinh-doanh_9222610034490819179
- Xác thực ngành có điều kiện: https://oa.zalo.me/home/documents/guides/xac-thuc-cach-3
- ZCA là gì: https://mona.media/zalo-cloud/
