---
title: "RoadMate MVP Web"
status: in-progress
created: 2026-09-23
scope: project
blockedBy: []
blocks: []
---

# RoadMate MVP Web — Implementation Plan

Web PWA ghép chuyến Hoà Lạc ↔ Hà Nội (beachhead SV). Nguồn spec: [design doc](../../docs/roadmate-mvp-design.md) + [prototype đã chốt](../../prototype/roadmate-prototype.html).

## Nguyên tắc bất biến (áp dụng mọi phase)
- **API-first, client-agnostic:** business logic ở backend (Next.js Route Handlers) → Zalo Mini App (Phase 2 sản phẩm) tái dùng nguyên API.
- **Định danh key theo `zalo_id`** để web + Mini App sau hội tụ cùng tài khoản.
- **RLS bật cho mọi bảng** (defense-in-depth).
- **Không thanh toán in-app**; SĐT tự nhập, chỉ lộ sau khi được duyệt.
- `pnpm` bắt buộc. Không commit thẳng `main`.

## Stack
Next.js (App Router, TS) · Supabase (Postgres/Auth/RLS/Realtime/Storage) · Tailwind + shadcn/ui · PWA · Deploy Vercel + Supabase cloud.

## Phases

| # | Phase | Ưu tiên | Phụ thuộc | Trạng thái |
|---|-------|---------|-----------|-----------|
| 01 | [Setup & Foundations](phase-01-setup-foundations.md) | P1 | — | ✅ done (2026-09-23) |
| 02 | [Data Model & RLS](phase-02-data-model-rls.md) | P1 | 01 | ✅ done (2026-09-23) |
| 03 | [Auth (Zalo + Email Badge)](phase-03-auth-zalo-email-badge.md) | P1 | 01, 02 | ✅ done (2026-09-23, Zalo deferred) |
| 04 | [Trip Board & Create](phase-04-trip-board-create.md) | P1 | 02, 03 | ✅ done (2026-09-23) |
| 05 | [Requests & Notifications](phase-05-requests-notifications.md) | P1 | 04 | ✅ done (2026-09-24) |
| 06 | [Reviews, Profile & Safety](phase-06-reviews-profile-safety.md) | P2 | 05 | ✅ done (2026-09-24) |
| 07 | [PWA, Deploy & Launch](phase-07-pwa-deploy-launch.md) | P2 | 04, 05, 06 | pending (next) |

## Acceptance criteria (MVP)
- Người dùng đăng nhập bằng **email magic link** (Supabase native); Zalo OAuth thêm ở bản sau.
- Verify email trường để nhận **badge SV** — badge là **dấu tin cậy (soft gate)**: chưa verify vẫn đăng/join được, badge tăng độ tin.
- Đăng chuyến (điểm đi/đến theo node nhóm vùng, chiều tự suy ra, validate khác vùng), hiện trên bảng tin.
- Bảng tin lọc 2 tầng (vùng mặc định + nâng cao: ngày/giờ/loại/nữ/node).
- Xin tham gia → chủ duyệt/từ chối → duyệt thì trừ ghế + lộ SĐT hai phía (đọc `profile_private` qua service role).
- Huỷ chuyến / rút yêu cầu / huỷ chỗ đã duyệt → hoàn ghế atomic đúng.
- Rating + report sau chuyến; tùy chọn nữ-với-nữ hoạt động.
- Đo được **fill rate** (chỉ số thanh khoản chính).
- Deploy production; seed 5 node điểm nổ + corridor HL↔HN.

## Rủi ro xuyên suốt
- **Zalo OAuth không phải provider native Supabase** → custom flow (Phase 03), có fallback email magic link nếu vướng duyệt app.
- **Thanh khoản** là rủi ro sản phẩm (ngoài phạm vi code) — plan đảm bảo đo fill rate + seed đúng 5 node để hỗ trợ chiến lược nén mật độ.

## Out of scope (Phase 2 sản phẩm)
Zalo Mini App · tự-động-ghép · nhóm định kỳ · thanh toán in-app · ghép sân bay · danh bạ taxi · đa tỉnh · ZNS.

## Validation Log

### Session 1 — 2026-09-23
Verification: greenfield — nguồn spec (design doc, prototype) tồn tại; mọi path khác là "sẽ tạo". Failed: 0.

Quyết định chốt (4 câu tới hạn):
1. **Auth khi launch = email magic link (Supabase native) trước; Zalo OAuth thêm ở bản sau.** → giảm rủi ro Phase 03; Zalo không chặn launch.
2. **Bind Zalo↔Supabase = synthetic email (`zalo_<id>@…`) + Admin API**, giữ RLS chạy với `auth.uid()`. Áp dụng khi thêm Zalo.
3. **Badge SV = soft gate lúc đầu:** chưa verify vẫn đăng/join được; badge chỉ là dấu tin cậy. Siết thành hard gate sau nếu cần (khi thanh khoản đủ / xuất hiện lạm dụng).
4. **Realtime = hoãn.** MVP dùng refresh/polling; thêm Supabase Realtime sau nếu cần.

Propagation: Phase 02 (`zalo_id` nullable), Phase 03 (email-first, Zalo deferred, soft badge), Phase 04 (bỏ hard gate POST, hoãn realtime), Phase 05 (join không cần badge). Đồng bộ CLAUDE.md + design doc (D4).

### Whole-Plan Consistency Sweep — Session 1
Đã rà toàn bộ plan + phase files: gỡ mọi chỗ nói "bắt buộc badge mới đăng/join" (đổi thành soft), "Zalo là auth chính khi launch" (đổi thành email-first, Zalo sau), và "realtime ở MVP" (đổi thành hoãn). Không còn mâu thuẫn tồn đọng.

## Red Team Review

### Session 1 — 2026-09-23 (review nội bộ trên tài liệu plan, greenfield)
Findings sau lọc trùng, xếp severity. Áp dụng: user duyệt từng cái.

| ID | Sev | Vấn đề | Disposition |
|----|-----|--------|-------------|
| F1 | HIGH | RLS row-level KHÔNG giấu được cột `phone` | **Accept** — tách `profile_private`; đọc phone qua route service role (Phase 02, 05) |
| F2 | HIGH | Soft gate + reveal phone → nguy cơ harvest SĐT/mất an toàn nữ | **Reject (risk accepted)** — user chọn giữ hoàn toàn soft để tối đa thanh khoản giai đoạn đầu; theo dõi lạm dụng, cân nhắc siết sau |
| F3 | MED | `depart_date` mâu thuẫn (DATE vs chuỗi) | **Accept (modified)** — dùng `depart_at` timestamptz (cả ngày+giờ); nhãn ngày + bucket giờ suy ra (Phase 02, 04) |
| F4 | MED/HIGH | Thiếu luồng huỷ chuyến/rút yêu cầu/huỷ chỗ (hoàn ghế) | **Accept** — thêm API + RPC atomic + notification (Phase 05); `trip_requests` thêm `withdrawn` (Phase 02) |
| F5 | MED | Chuyến quá hạn vẫn hiện | **Accept** — mặc định lọc `depart_at >= now()` (Phase 04) |
| F6 | MED | Scope Phase 06 (rating/aggregate) có thể hoãn | **Reject** — user giữ Phase 06 đầy đủ |

Rejected khác (không đủ trọng số / đã ngầm xử lý): IDOR contact endpoint (ghi rõ kiểm session khi apply F1), whitelist domain email (đã soft), pagination (volume thấp).

### Whole-Plan Consistency Sweep — Red Team Session 1
Đã rà toàn bộ sau khi áp F1/F3/F4/F5: `phone` không còn nằm trong `profiles` (chuyển `profile_private`) — đồng bộ Phase 02/04/05; `depart_date`+`time_window` → `depart_at` đồng bộ Phase 02/04 (index, filter, form); `trip_requests` có `withdrawn`; acceptance criteria + governing docs khớp. F2/F6 giữ nguyên theo quyết định user (đã ghi rõ là risk-accepted). Không còn mâu thuẫn tồn đọng.

