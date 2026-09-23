---
phase: 2
title: "Data Model & RLS"
status: done
priority: P1
dependencies: [1]
---

# Phase 02: Data Model & RLS

## Overview
Schema Postgres cho users/points/trips/requests/reviews/reports/notifications, RLS cho mọi bảng, seed corridor + 5 node điểm nổ, sinh TypeScript types.

## Requirements
- Functional: đủ bảng để phục vụ toàn bộ luồng MVP; seed points sẵn sàng cho bảng tin/đăng chuyến.
- Non-functional: RLS bật mọi bảng; index cho truy vấn lọc bảng tin; migrations có version.

## Architecture
Định danh user theo `zalo_id`. Point phân cấp `zone (HL|HN)` + node, gắn `corridor_id`, `geo` optional (chừa tương lai). Trip tham chiếu point-id (from/to). Direction lưu để tối ưu lọc (suy ra từ zone khi tạo).

### Schema (chính)
- `profiles` (public-safe): `id (uuid, = auth.users.id)`, `zalo_id (text unique, NULLABLE — điền khi liên kết Zalo ở bản sau)`, `name`, `gender`, `sv_verified (bool)`, `school_email (nullable)`, `rating_avg (numeric)`, `women_pref (bool)`, `created_at`. <!-- Updated: Validation S1 — zalo_id nullable · Red Team F1 — phone moved out -->
- `profile_private` (Red Team F1): `user_id (uuid, = profiles.id)`, `phone (nullable)`. **Tách riêng để giấu SĐT** — RLS chỉ chủ đọc/sửa; route `contact` đọc bằng service role. (RLS là row-level, KHÔNG giấu được cột phone nếu để chung `profiles`.)
- `corridors`: `id`, `name` (seed: "Hoà Lạc ↔ Hà Nội").
- `points`: `id`, `name`, `zone ('HL'|'HN')`, `corridor_id`, `geo (nullable)`, `sort`.
- `trips`: `id`, `creator_id`, `type ('offer'|'need')`, `dir ('HL_HN'|'HN_HL')`, `from_point_id`, `to_point_id`, `pickup_note (nullable)`, `depart_at (timestamptz — lưu cả ngày + giờ; Red Team F3 chỉnh)`, `seats_total`, `seats_left`, `price_per_person`, `women_only (bool)`, `status ('open'|'full'|'done'|'cancelled')`, `matching_score (nullable, chừa Phase 2-B)`, `created_at`. <!-- Red Team F3: depart_at timestamptz thay depart_date/time_window; nhãn ngày + bucket giờ (Sáng/Trưa/Chiều/Tối) suy ra từ depart_at -->`
- `trip_requests`: `id`, `trip_id`, `requester_id`, `status ('pending'|'accepted'|'declined'|'withdrawn')`, `created_at`, unique(`trip_id`,`requester_id`). <!-- Red Team F4: thêm 'withdrawn' cho luồng rút -->`
- `reviews`: `id`, `trip_id`, `from_user`, `to_user`, `rating (1..5)`, `comment (nullable)`, `created_at`.
- `reports`: `id`, `trip_id`, `reporter_id`, `reported_id`, `reason`, `detail`, `created_at`.
- `notifications`: `id`, `user_id`, `type`, `payload (jsonb)`, `read (bool)`, `created_at`.

## Related Code Files
- Create: `supabase/migrations/0001_init.sql` (bảng + index + RLS)
- Create: `supabase/seed.sql` (corridor + 12 points; đánh dấu 5 node điểm nổ)
- Create: `lib/db/types.ts` (từ `supabase gen types typescript`)
- Modify: `README.md` (lệnh migrate/seed/gen-types)

## Implementation Steps
1. Viết migration `0001_init.sql`: tạo bảng theo schema + FK + check constraints (rating 1..5, seats_left>=0).
2. Index: `trips(dir, depart_at)`, `trips(from_point_id)`, `trips(to_point_id)`, `trips(status)`, `trips(depart_at)` (lọc quá hạn — Red Team F5), `trip_requests(trip_id)`.
3. RLS bật mọi bảng + policy:
   - `points`, `corridors`: read cho mọi authenticated.
   - `trips`: read chuyến `open/full` cho authenticated; insert/update/delete chỉ `creator_id = auth.uid()`.
   - `trip_requests`: requester đọc request của mình; chủ trip đọc request của trip mình; insert bởi requester; update (accept/decline/withdraw) chỉ đúng vai.
   - `profiles`: đọc field công khai (name, sv, rating, gender) cho authenticated. **KHÔNG chứa phone.**
   - `profile_private` (Red Team F1): chỉ `user_id = auth.uid()` đọc/sửa; SĐT đối phương trả qua route `contact` bằng **service role** sau khi accepted (Phase 05).
   - `notifications`/`reviews`/`reports`: gắn theo `auth.uid()`.
4. Seed corridor + points: KTX ĐHQG, KTX HV Tài chính, KTX ĐH FPT, F-Ville, Viettel Hoà Lạc, Cổng CNC (zone HL); Big C Thăng Long, Cầu Giấy, Mỹ Đình, Kim Mã, Bách Khoa, Hồ Gươm (zone HN).
5. `supabase gen types typescript` → `lib/db/types.ts`.

## Success Criteria
- [x] Migration + seed chạy sạch trên Supabase local (Docker). 9 bảng, 6 enums, 2 hàm helper.
- [x] RLS bật mọi bảng (verified: `relrowsecurity=t` cả 9 bảng); test hành vi: user B KHÔNG sửa được trip của A (0 rows), A sửa được (1 row).
- [x] Types sinh ra dùng được trong code (`lib/db/types.ts`, client gõ kiểu `Database`; typecheck xanh).
- [x] Index cho lọc bảng tin đã tạo (dir+depart_at, from/to point, status, depart_at, requests theo trip/requester). *(EXPLAIN hoãn tới khi có data thật.)*

## Completion Notes (Session 2026-09-23)
- **Bug tự phát hiện & fix:** đệ quy vô hạn giữa policy `trips_read` ↔ `trip_requests_read` → tách 2 hàm `SECURITY DEFINER` (`auth_is_trip_owner`, `auth_has_trip_request`, `search_path` ghim, execute chỉ `authenticated`) để cắt vòng.
- **Code review (subagent) — 3 finding HIGH đã fix** (đều khai thác được qua anon client, test happy-path không lộ):
  - **H1:** `authenticated` mặc định có full column privilege → user tự set `sv_verified`/`rating_avg`/`zalo_id`. Fix: `revoke` rồi `grant` cột — chỉ (name, gender, women_pref) sửa được; (sv_verified, rating_avg, zalo_id) server-only.
  - **H2:** `trip_requests` update thiếu WITH CHECK → requester tự-accept (ép lộ contact). Fix: tách 2 policy hẹp — requester chỉ `pending→withdrawn`, owner chỉ `pending→declined`; accept + hoàn-ghế qua RPC definer (Phase 05).
  - **H3:** `reviews` client insert được, không kiểm thành viên → review giả. Fix: bỏ policy insert (server-only như notifications) + check `from_user <> to_user`.
- **M1:** `school_email` chuyển sang `profile_private` (PII/anchor SV) — không public.
- **M2:** `reports.reported_id` → `on delete set null` (giữ dấu vết abuse khi user bị report xoá tài khoản).
- **L1:** `rating_avg` thêm check 0..5.
- **Ràng buộc cho Phase 05:** accept/decline (nếu cần) + withdraw-accepted chạy server-side (RPC definer / service role) vì client chỉ được các chuyển trạng thái không đụng ghế.

## Risk Assessment
- Lộ `phone` (Red Team F1): RLS row-level KHÔNG giấu được cột → **tách `profile_private`**; phone chỉ trả qua route `contact` (service role) sau khi accepted (Phase 05).
- seats_left đua tranh (race): xử lý atomic khi accept/huỷ (Phase 05) — chuẩn bị bằng check constraint (`seats_left >= 0`) ở đây.
