---
phase: 7
title: "PWA, Deploy & Launch"
status: pending
priority: P2
dependencies: [4, 5, 6]
---

# Phase 07: PWA, Deploy & Launch

## Overview
Hoàn thiện PWA + thông báo (in-app + email), trang pháp lý (ToS/miễn trừ), đo lường fill-rate, deploy production và seed 5 node điểm nổ cho chiến lược nén mật độ.

## Requirements
- Functional: cài PWA mượt trên mobile; email thông báo sự kiện chính; đo được fill rate; production chạy ổn.
- Non-functional: link chuyến có preview đẹp (OG tags) để chia sẻ vào group Zalo/FB; ToS/miễn trừ hiển thị; không lộ dữ liệu nhạy cảm.

## Architecture
- **PWA:** manifest + icons + offline shell tối thiểu; installable; theme-color.
- **Notifications:** in-app (đã có Phase 05) + email (Resend/Supabase) cho: có request mới, được duyệt/từ chối. (Zalo/ZNS để Phase 2 sản phẩm.)
- **Share:** OG meta cho `/trip/:id` (route, giờ, giá) để preview đẹp khi dán link vào group.
- **Metrics (fill rate là chính):** log sự kiện `trip_created`, `request_created`, `request_accepted`, `trip_completed`; tính **fill rate = % trip có ≥1 request accepted**. Dùng bảng events hoặc Supabase + query; (tùy chọn) tích hợp analytics nhẹ.
- **Legal:** trang ToS + miễn trừ ("chia sẻ chi phí", không hoa hồng, không giữ tiền).

## Related Code Files
- Create: `app/trip/[id]/opengraph-image.tsx` hoặc OG meta trong `generateMetadata`
- Create: `lib/email.ts` (Resend), templates thông báo
- Create: `app/legal/terms/page.tsx`, `app/legal/disclaimer/page.tsx`
- Create: `lib/analytics.ts` + `supabase/migrations/0004_events.sql` (bảng events) + query fill-rate
- Modify: `public/manifest.webmanifest`, service worker (offline shell)
- Create: CI (GitHub Actions) chạy lint/typecheck/test; cấu hình Vercel production + env

## Implementation Steps
1. Hoàn thiện PWA (icons đủ kích thước, offline shell, installability check).
2. Email thông báo (Resend): request mới / được duyệt / bị từ chối; opt-out cơ bản.
3. OG meta cho trang chi tiết chuyến → preview đẹp khi share.
4. Bảng `events` + `lib/analytics.ts`; query **fill rate** + vài số phụ (time-to-match, completion).
5. Trang ToS + miễn trừ; link ở footer/hồ sơ.
6. CI + deploy production; chạy migration + seed corridor/points (5 node điểm nổ) trên prod.
7. Smoke test toàn luồng trên production.

## Success Criteria
- [ ] Cài PWA trên mobile, mở standalone; offline shell không vỡ.
- [ ] Email gửi đúng cho 3 sự kiện chính.
- [ ] Dán link chuyến vào chat hiện preview (OG) đúng.
- [ ] Query fill rate chạy ra số; các event được ghi.
- [ ] Production deploy xanh; seed 5 node + corridor có mặt; smoke test luồng chính pass.

## Risk Assessment
- Email vào spam: cấu hình domain/SPF/DKIM cho Resend; MVP có thể chấp nhận in-app trước.
- Đo lường phình to: giữ tối giản (fill rate + vài số), không dựng data pipeline nặng.
- Pháp lý: ToS/miễn trừ là tối thiểu — cần luật sư rà trước khi truyền thông rộng (ngoài phạm vi code).
