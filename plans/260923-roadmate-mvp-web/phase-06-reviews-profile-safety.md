---
phase: 6
title: "Reviews, Profile & Safety"
status: pending
priority: P2
dependencies: [5]
---

# Phase 06: Reviews, Profile & Safety

## Overview
Đánh giá + báo cáo sau chuyến, xác nhận hoàn thành, màn Hồ sơ (badge SV, SĐT tùy chọn, ưu tiên nữ-với-nữ, rating tổng hợp), và các yếu tố an toàn.

## Requirements
- Functional: rating (1..5) + report sau chuyến; cập nhật `rating_avg`; xác nhận hoàn thành chuyến; chỉnh hồ sơ.
- Non-functional: chỉ người trong chuyến đã hoàn thành mới rate; report lưu kín cho vận hành.

## Architecture
- **API:**
  - `POST /api/trips/:id/complete` — chủ trip đánh dấu `status='done'`.
  - `POST /api/reviews` — chỉ user thuộc chuyến `done`; 1 review / cặp / trip; cập nhật `profiles.rating_avg` (trigger hoặc tính lại).
  - `POST /api/reports` — bất kỳ user trong chuyến; lưu lý do + chi tiết.
  - `GET/PATCH /api/me/profile` — đọc/sửa name, phone (tùy chọn), gender, women_pref.
- **Rating aggregate:** trigger Postgres cập nhật `rating_avg` khi có review mới (hoặc view tính động).
- **UI:** modal rating (sao + nhận xét) + báo cáo (chọn lý do); trang Hồ sơ (badge, stats, phone optional, toggle nữ-với-nữ, xác minh SV nếu chưa).

## Related Code Files
- Create: `app/api/trips/[id]/complete/route.ts`, `app/api/reviews/route.ts`, `app/api/reports/route.ts`, `app/api/me/profile/route.ts`
- Create: `supabase/migrations/0003_rating_aggregate.sql` (trigger cập nhật rating_avg)
- Create: `app/(app)/profile/page.tsx`, `components/{rating/RatingSheet,report/ReportSheet,profile/*}.tsx`
- Modify: `app/(app)/mine/page.tsx` (nút Hoàn thành + Đánh giá)

## Implementation Steps
1. `POST /complete` (chủ trip) → `status='done'`.
2. `POST /reviews` với ràng buộc thành viên + unique cặp/trip; trigger cập nhật `rating_avg` (migration 0003).
3. `POST /reports` lưu report; (tùy chọn) notification cho vận hành.
4. `GET/PATCH /me/profile`; UI Hồ sơ: badge SV (verify nếu chưa — dùng Phase 03), phone optional, toggle women_pref, stats.
5. UI RatingSheet + ReportSheet nối từ "Chuyến của tôi".

## Success Criteria
- [ ] Chỉ thành viên chuyến `done` mới rate được; không rate trùng.
- [ ] `rating_avg` cập nhật đúng sau review.
- [ ] Report lưu và không lộ cho người dùng khác.
- [ ] Hồ sơ sửa được phone/gender/women_pref; badge SV phản ánh đúng.

## Risk Assessment
- Lạm dụng report/rating: MVP chấp nhận, chỉ lưu trữ; kiểm duyệt thủ công. Chống rate-abuse cơ bản (1 review/cặp/trip).
- rating_avg lệch nếu tính sai: ưu tiên trigger + test.
