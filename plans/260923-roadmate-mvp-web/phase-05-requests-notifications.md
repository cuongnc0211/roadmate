---
phase: 5
title: "Requests & Notifications"
status: pending
priority: P1
dependencies: [4]
---

# Phase 05: Requests & Notifications

## Overview
Vòng đời ghép: xin tham gia → chủ duyệt/từ chối → duyệt thì trừ ghế atomic + lộ SĐT hai phía; màn "Chuyến của tôi"; thông báo in-app.

## Requirements
- Functional: request/accept/decline; contact reveal chỉ khi accepted; seats_left cập nhật đúng; thông báo cho các sự kiện.
- Non-functional: accept phải atomic (không âm ghế / không double-accept vượt số ghế); phone chỉ trả cho hai bên đã accepted.

## Architecture
- **API:**
  - `POST /api/trips/:id/requests` — chỉ cần đăng nhập (**soft gate: KHÔNG bắt badge SV** — Validation #3); tạo request `pending`; chặn tự-join trip của mình; tạo notification cho chủ trip.
  - `POST /api/requests/:id/accept` — chỉ chủ trip; **atomic**: trong transaction/RPC, kiểm `seats_left>0` rồi `seats_left--`, set `accepted`, set `status='full'` nếu hết ghế; tạo notification cho requester.
  - `POST /api/requests/:id/decline` — chỉ chủ trip; set `declined` + notification.
  - `POST /api/trips/:id/cancel` — chỉ chủ trip; set trip `cancelled`; notify passenger đã accepted (Red Team F4).
  - `POST /api/requests/:id/withdraw` — requester tự rút: `pending` → `withdrawn`; nếu đã `accepted` → **hoàn ghế atomic** (`seats_left++`; nếu trip đang `full` → về `open`) + notify chủ trip (Red Team F4).
  - `GET /api/me/trips` — trip tôi tạo (kèm requests) + trip tôi tham gia (kèm trạng thái).
  - `GET /api/trips/:id/contact` — trả `phone` của đối phương (đọc từ `profile_private` bằng **service role**, Red Team F1) **chỉ khi** giữa 2 user có request `accepted` còn hiệu lực cho trip đó. Kiểm định danh từ session, không tin param (chống IDOR).
- **Contact reveal:** phone lấy qua route `contact` (kiểm quyền, service role), đọc từ `profile_private` — không expose ở `profiles`.
- **Notifications:** ghi `notifications` + hiển thị badge số chưa đọc; đánh dấu đã đọc.

## Related Code Files
- Create: `app/api/trips/[id]/requests/route.ts`, `app/api/requests/[id]/accept/route.ts`, `app/api/requests/[id]/decline/route.ts`
- Create: `app/api/me/trips/route.ts`, `app/api/trips/[id]/contact/route.ts`
- Create: `supabase/migrations/0002_request_rpcs.sql` (RPC atomic: accept + withdraw/cancel hoàn ghế — Red Team F4)
- Create: `app/(app)/mine/page.tsx`, `components/mine/{OwnedTripCard,JoinedTripCard,RequestRow}.tsx`
- Create: `app/(app)/notifs/page.tsx`, `lib/notifications.ts`
- Modify: `app/(app)/trip/[id]/page.tsx` (nút join → trạng thái; hiện contact khi accepted)

## Implementation Steps
1. RPC atomic (migration 0002): `accept_request` (check + decrement + set status), `withdraw_request`/`cancel_trip` (hoàn ghế + set status) — tất cả trong transaction.
2. API request/accept/decline/**cancel/withdraw** + tạo notification tương ứng.
3. `GET /api/me/trips` gộp 2 nhóm; `GET /api/trips/:id/contact` đọc `profile_private` (service role) khi accepted.
4. UI "Chuyến của tôi": chủ trip duyệt/từ chối/**huỷ chuyến** (hiện contact sau duyệt); nhóm "tôi tham gia" xem trạng thái + **rút yêu cầu/huỷ chỗ** + contact khi accepted.
5. Thông báo: trang list + badge số chưa đọc + đánh dấu đã đọc (gồm sự kiện huỷ/rút).
6. Enforce women-only: chặn join nếu trip `women_only` và requester không phải nữ.

## Success Criteria
- [ ] Accept trừ đúng 1 ghế, không bao giờ âm; hết ghế → `status='full'`, không accept thêm được.
- [ ] **Rút chỗ đã accepted / chủ huỷ chuyến hoàn ghế atomic đúng** (full → open); rút pending không đụng ghế (Red Team F4).
- [ ] `phone` đọc từ `profile_private` (service role), chỉ trả cho hai bên đã accepted (test: bên thứ ba/pending/đã rút không lấy được).
- [ ] Thông báo tạo đúng cho request/accept/decline/**cancel/withdraw**; badge chưa đọc chính xác.
- [ ] women-only chặn đúng.

## Risk Assessment
- **Race khi accept nhiều request cùng lúc:** bắt buộc RPC atomic/transaction, không xử lý ở app layer.
- Rò phone: chỉ qua route `contact` có kiểm quyền; viết test phủ trường hợp pending/declined/không liên quan.
