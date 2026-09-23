---
phase: 2
title: "Data Model & RLS"
status: pending
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
- [ ] Migration + seed chạy sạch trên Supabase (local hoặc cloud).
- [ ] RLS bật mọi bảng; test nhanh: user A không sửa được trip của user B.
- [ ] Types sinh ra dùng được trong code.
- [ ] Query lọc bảng tin có index phù hợp (EXPLAIN không seq-scan lớn).

## Risk Assessment
- Lộ `phone` (Red Team F1): RLS row-level KHÔNG giấu được cột → **tách `profile_private`**; phone chỉ trả qua route `contact` (service role) sau khi accepted (Phase 05).
- seats_left đua tranh (race): xử lý atomic khi accept/huỷ (Phase 05) — chuẩn bị bằng check constraint (`seats_left >= 0`) ở đây.
