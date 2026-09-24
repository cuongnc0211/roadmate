---
phase: 4
title: "Trip Board & Create"
status: done
priority: P1
dependencies: [2, 3]
---

# Phase 04: Trip Board & Create

## Overview
Cơ chế cốt lõi: API + UI cho bảng tin (lọc 2 tầng) và đăng chuyến (điểm theo node nhóm vùng, chiều tự suy ra, validate khác vùng), cùng màn chi tiết chuyến.

## Requirements
- Functional: list chuyến với lọc; tạo chuyến; xem chi tiết. Khớp hành vi đã chốt ở prototype.
- Non-functional: API client-agnostic (Mini App tái dùng được); lọc chạy server-side; SĐT không trả ở list/detail khi chưa được duyệt.

## Architecture
- **API (Route Handlers):**
  - `GET /api/trips` — query params: `fromZone`, `toZone`, `fromNode`, `toNode`, `type`, `women`, `day`, `timeWindow`. Node override zone khi có. **Mặc định chỉ trả chuyến sắp tới `depart_at >= now()`** (Red Team F5). `day` lọc theo phần NGÀY của `depart_at`; `timeWindow` lọc theo bucket giờ (Sáng 6–11 / Trưa 11–14 / Chiều 14–19 / Tối 19–23) suy ra từ giờ của `depart_at` (Red Team F3). Trả kèm point name + creator public fields (KHÔNG phone).
  - `POST /api/trips` — chỉ cần đăng nhập (**soft gate: KHÔNG bắt badge SV** — Validation #3); body validate (zod): from/to node khác vùng; `dir` suy ra từ zone; seats/price hợp lệ.
  - `GET /api/trips/:id` — chi tiết (KHÔNG phone nếu chưa accepted).
- **UI:** tái dùng bố cục prototype:
  - Bảng tin: filter mặc định vùng (Từ/Đến) + "Bộ lọc nâng cao" (ngày → khung giờ → loại → nữ → node). Card có motif tuyến (dot → nét đứt → dot); badge SV hiển thị nếu có.
  - Đăng chuyến: 2 select node nhóm vùng (Điểm đi/Điểm đến), chiều suy ra, ô "điểm đón cụ thể", **chọn ngày + giờ → gộp thành `depart_at` (timestamptz)**, ghế/giá/ghi chú/nữ-với-nữ.
  - Chi tiết: route, kv info, pickup note, người đăng (badge/rating), CTA "Xin tham gia" (Phase 05).
- **Realtime: HOÃN (Validation #4)** — MVP dùng refresh/polling; thêm Supabase Realtime sau nếu cần.

## Related Code Files
- Create: `app/api/trips/route.ts` (GET list, POST create), `app/api/trips/[id]/route.ts`
- Create: `lib/trips/query.ts` (build filter), `lib/trips/schema.ts` (zod), `lib/points.ts` (zone/node helpers, `sideOf`)
- Create: `app/(app)/board/page.tsx`, `components/board/{FilterBar,AdvancedFilter,TripCard,RouteLine}.tsx`
- Create: `app/(app)/create/page.tsx`, `components/create/CreateTripForm.tsx`
- Create: `app/(app)/trip/[id]/page.tsx`
- Use: `lib/auth/guards.ts` (`getUser` — chỉ cần đăng nhập; KHÔNG áp `requireSvVerified` ở MVP)

## Implementation Steps
1. `lib/points.ts`: nạp points, helper `sideOf(pointId)`, nhóm theo zone.
2. `GET /api/trips` với filter (zone/node/type/women/day/timeWindow); index đã có ở Phase 02.
3. UI bảng tin: FilterBar (vùng) + AdvancedFilter (progressive disclosure) + TripCard + RouteLine; map trạng thái filter → query.
4. `POST /api/trips` + zod validate (khác vùng; dir suy ra); form Đăng chuyến; sau khi tạo → điều hướng "Chuyến của tôi".
5. Chi tiết chuyến (ẩn phone). Nút "Xin tham gia" để state cho Phase 05.
6. Refresh bảng tin sau khi tạo/quay lại (KHÔNG realtime — hoãn).

## Success Criteria
- [x] Tạo chuyến hợp lệ → hiện trên bảng tin; cùng vùng → chặn (test: same_zone 400; quá khứ 400; ghế>8 400 zod).
- [x] Lọc 2 tầng đúng (direction segmented; nâng cao: ngày/giờ/loại/nữ/node; node override vùng qua `parseTripFilters`). day/timeWindow lọc theo `depart_at` (giờ VN).
- [x] Bảng tin mặc định không hiện chuyến quá hạn (`depart_at >= now()`), chỉ `open/full`.
- [x] `/api/trips` không trả `phone` (embed chỉ cột được grant; type suy từ `QueryData` để compiler chặn rò).
- [x] User đăng nhập POST được **không cần badge SV** (soft gate); badge SV hiển thị trên card/detail nếu có.

## Completion Notes (Session 2026-09-23)
- **API-first:** `GET/POST /api/trips`, `GET /api/trips/:id`; UI (board/create/detail) dùng chung `lib/trips/query.ts` (fetchTrips/fetchTripById + `parseTripFilters`) → Mini App tái dùng đúng logic.
- **Trust-sensitive fields set server-side:** `dir` suy từ zone của point (query DB, không tin client), `creator_id=auth.uid()`, `seats_left=seats_total`, `status` mặc định DB. RLS `trips_insert_own` chốt lại.
- **Timezone:** `depart_at` timestamptz; nhập từ datetime-local (giờ VN) → `vnLocalToIso` (+07:00); hiển thị + bucket giờ (Sáng/Trưa/Chiều/Tối) qua `Intl` `Asia/Ho_Chi_Minh`.
- **Code review (subagent) — không Critical/High.** Xác nhận: không rò phone/PII, RLS là backstop thật (dùng anon client), field nhạy cảm set ở server, UTC+7 đúng. Đã fix Medium: (M1) bỏ `as unknown as`, dùng `QueryData<typeof tripSelect>` để **compiler chặn rò phone**; (M2) thêm `.limit(100)` cho board.
- **Hoãn (nợ kỹ thuật, đã ghi):** chưa có test infra (vitest) — nên thêm unit test cho `time.ts` (bucket/midnight) + `parseTripFilters`; `.limit` post-filter có thể under-fill khi volume lớn → chuyển filter ngày/giờ xuống SQL sau.
- Nút "Xin tham gia" ở detail hiện là placeholder → Phase 05.

## Risk Assessment
- Trùng lệch giữa filter UI và query server: viết test cho `lib/trips/query.ts`.
- Soft gate → có thể có chuyến từ người chưa verify: chấp nhận ở MVP để tăng thanh khoản; theo dõi và siết sau nếu lạm dụng.
