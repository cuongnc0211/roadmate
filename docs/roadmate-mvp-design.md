# RoadMate — MVP Design Doc

> Brainstorm report. Trạng thái: **đã chốt hướng — build Web PWA trước, backend tái dùng cho Zalo Mini App sau.**
> Ngày: 2026-09-08 (cập nhật platform decision) · Beachhead: sinh viên ghép taxi **Hòa Lạc ↔ Hà Nội**.
> ⚠️ Phần pháp lý trong doc KHÔNG phải tư vấn pháp lý — cần hỏi luật sư VN trước launch.

---

## 1. Problem statement

SV mới lên Hòa Lạc (ĐHQG, HV Tài chính, FPTU…) và nhân viên KCN Cao thường xuyên đi HL↔HN. Hiện các bạn **tự ghép taxi / xin đi nhờ / share xăng trong group Facebook & Zalo** bằng comment thủ công — ma sát cao, khó lọc theo giờ/chiều, không có niềm tin hệ thống.

**Cơ hội:** corridor HL↔HN hội tụ 4 yếu tố hiếm giúp carpooling khả thi:
- Tuyến cố định (~30–40km, một trục).
- Lịch lặp lại (đi–về hàng ngày, cao điểm Thứ 6 ra / Chủ nhật về).
- Nhu cầu đã tồn tại (đang ghép thủ công trên FB/Zalo).
- Proxy niềm tin sẵn có (cùng trường/công ty).

**Vấn đề sống–còn (không phải tính năng):** thanh khoản / cold-start. App trống = vô giá trị. Đối thủ thật = FB/Zalo group (miễn phí, network sẵn) → sản phẩm phải hơn **gấp 10 lần**, không phải hơn chút.

## 2. Mục tiêu & phạm vi

- **Mục tiêu:** thử nghiệm startup nghiêm túc, hướng người dùng thật + có đường mở rộng.
- **Beachhead (chỉ 1):** SV ghép taxi HL↔HN. KHÔNG làm dàn trải.
- **Tầm nhìn:** mở rộng toàn quốc + use case khác — nhưng SAU khi thắng beachhead.

## 3. Quyết định đã chốt (decision log)

| # | Quyết định | Chọn | Lý do ngắn |
|---|---|---|---|
| D1 | Beachhead | SV ghép taxi HL↔HN | Tần suất cao, tệp đồng nhất, hành vi sẵn, ít vướng pháp lý nhất |
| D2 | Cơ chế ghép | **A — Bảng tin có cấu trúc** (con người tự ghép) | Cần ít thanh khoản, gần hành vi hiện tại; tự-động-ghép (B) là bẫy over-engineering giai đoạn đầu |
| D3 | Nền tảng | **Web PWA trước** (Next.js), Zalo Mini App = Phase 2 | Web không có người gác cổng → launch ngay, không cần đăng ký KD/OA xác thực vội. Mini App đòi hỏi giấy tờ → hoãn tới khi đã chứng minh nhu cầu |
| D4 | Auth | Launch: **email magic link (Supabase)**; Zalo OAuth bản sau; badge SV **soft gate**; SĐT tùy chọn tự nhập | (Cập nhật Validation 2026-09-23) Email-first giảm rủi ro launch; soft gate tránh chặn nhầm người thật + tăng thanh khoản; Zalo bind synthetic email+Admin API để hội tụ Mini App |
| D5 | Thanh toán | **Không** (chỉ hiện chia phí/người, settle offline) | Né PCI, tranh chấp, và rủi ro trung gian vận tải/thanh toán |
| D6 | Backend | Supabase (Postgres/Auth/Realtime/Storage), **API-first client-agnostic** | Nhanh cho MVP; logic ở backend để Mini App tái dùng nguyên vẹn |
| D7 | Định danh | Key user theo **`zalo_id`** | Web (Zalo OAuth) + Mini App (`getUserInfo`) → cùng 1 tài khoản, không vỡ dữ liệu |
| D8 | Điểm đi/đến | **Điểm cố định (named points)**, KHÔNG free-text/geo | Thị trường mỏng: buckets thô → nhiều match hơn; né geocoding/Places API/khớp bán kính; tránh over-promise tuyến. Filter = 2 ô Từ/Đến (nhóm HL/HN). "Điểm đón cụ thể" = ghi chú, **không phải khoá match**. Mở rộng = thêm corridor + node; geo là tối ưu thị trường dày về sau |

## 4. Các phương án đã cân nhắc

**Cơ chế ghép (chọn A):**
- **A — Bảng tin có cấu trúc** ✅ đăng chuyến + lọc chiều/giờ/ngày + liên hệ; ghép do người. Ít thanh khoản vẫn có giá trị, dễ chuyển đổi từ FB.
- **B — Tự động ghép** ❌ cần đông người mới chạy; phức tạp; chết yểu khi chưa có thanh khoản → Phase 2.
- **C — Nhóm đi chung định kỳ** ❌ hợp nhân viên CNC, không hợp beachhead SV (chuyến một lần) → Phase 2.

**Nền tảng (chọn Web PWA trước):**
- **Web PWA độc lập (Next.js)** ✅ không người gác cổng, launch ngay, không cần đăng ký KD/OA vội; ⚠️ gánh trọn ma sát phân phối (không có distribution in-Zalo) → phải bù bằng kế hoạch cold-start mạnh (mục 8).
- **Zalo Mini App** → **Phase 2**, khi đã chứng minh nhu cầu và sẵn sàng làm giấy tờ. ✅ distribution in-Zalo + auth/SĐT native; ❌ cần OA xác thực (giấy tờ DN), rủi ro kiểm duyệt ngành vận tải.

## 5. Kiến trúc

- **Frontend (MVP):** Web PWA — Next.js (App Router, TS), mobile-first, có thể "Add to Home Screen".
- **Frontend (Phase 2):** Zalo Mini App — React + `zmp-cli`/`zmp-sdk` + ZaUI, **gọi lại đúng backend cũ**.
- **Backend:** Supabase (Postgres + REST/Realtime + Storage). **API-first, client-agnostic** — toàn bộ business logic ở backend để cả Web lẫn Mini App dùng chung.
- **Auth flow (Web) — LAUNCH:** **email magic link (Supabase native)** → session → verify **email trường** lấy **badge SV** (soft gate — chưa verify vẫn đăng/join được, badge chỉ là dấu tin cậy). SĐT tùy chọn tự nhập, chỉ lộ khi được duyệt vào chuyến.
- **Zalo OAuth (bản sau):** bind synthetic email + Admin API, key `zalo_id` (nullable) → hội tụ Mini App, giữ RLS với `auth.uid()`.
- ⚠️ Zalo OAuth **không phải provider native của Supabase** → phải tự viết luồng OAuth (authorize → callback → verify → mint session qua Supabase Admin API/custom JWT). Là công thêm, tính vào plan.
- **Hội tụ Mini App:** sau này Mini App dùng `getUserInfo`/`getPhoneNumber` native → map cùng `zalo_id` → cùng tài khoản.
- **Thông báo:** in-app + email (MVP). OA follow / ZNS để Phase 2.

## 6. Mô hình dữ liệu (rút gọn)

- **User**: zalo_id, phone (optional, chỉ lộ khi được duyệt), school_email (verified), gender, trust_badges, rating_avg, created_at.
- **Trip**: creator_id, type(`need_join` | `offer_seats`), direction(`HL_HN` | `HN_HL`), from_point, to_point, depart_date, depart_window, seats_total, seats_left, cost_estimate_per_person, women_only(bool), note, status(`open`|`full`|`done`|`cancelled`), `matching_score`(chừa cho Phase 2-B).
- **TripRequest**: trip_id, requester_id, status(`pending`|`accepted`|`declined`), created_at.
- **Review**: trip_id, from_user, to_user, rating(1–5), flags, comment.
- **Report**: trip_id, reporter_id, reported_id, reason, detail (an toàn).
- **Point**: id, name, zone(`HL`|`HN`), corridor_id, `geo`(optional — chừa cho tương lai). Trip tham chiếu point-id (from/to).
- **Filter bảng tin (2 tầng):** mặc định = Từ/Đến **cấp vùng** (Bất kỳ / Hoà Lạc / Hà Nội) — gọn, khớp liquidity. "Bộ lọc nâng cao" (progressive disclosure) = **ngày + khung giờ** (ưu tiên cao nhất vì hợp hành vi tuyến này) → loại chuyến → nữ-với-nữ → **địa chỉ chi tiết (node)** (ưu tiên thấp: volume thấp thường ra kết quả rỗng; node đã hiển thị sẵn trên card). Node ghi đè vùng khi chọn.
- **Trip.pickupNote**: text tuỳ chọn ("điểm đón cụ thể") — chỉ hiển thị, KHÔNG dùng để khớp match.

## 7. Zalo Mini App — gate cho Phase 2 (KHÔNG chặn MVP web)

Quyết định: **build Web PWA trước** → không dính rào cản Zalo, launch ngay. Các việc verify Zalo dưới đây **hoãn tới khi làm Mini App (Phase 2)**, sau khi MVP web đã chứng minh nhu cầu.

**Đã nghiên cứu (để dành cho Phase 2):**
- **Zalo có cho app vận tải/gọi xe:** CÓ (trang chính thức trưng case "be", "Xanh SM") — nhưng vận tải là **ngành có điều kiện**, bắt xác thực + giấy phép. Mô hình **peer chia sẻ chi phí** có thể bị xếp nhầm → phải hỏi.
- **Publish cần:** **OA xác thực chính chủ** (giấy tờ DN, tối thiểu hộ kinh doanh); `getPhoneNumber` cần duyệt ngữ cảnh.

**Việc Phase 2 (trước khi làm Mini App):**
- [ ] Đăng ký dev `miniapp.zaloplatforms.com`, đọc yêu cầu xác thực theo danh mục trong portal.
- [ ] Liên hệ Zalo (`mini@zalo.me` / hotline `0901 888 903`): hỏi (i) phân loại ngành mô hình peer chia sẻ chi phí, (ii) hộ KD có đủ publish không, (iii) hạn mức `getPhoneNumber`.
- [ ] Đăng ký **hộ kinh doanh** nếu cần.

## 8. Kế hoạch phá thế bí thanh khoản (cold-start) — phần sống–còn

- **5 điểm nổ đầu tiên (cùng 1 corridor HL↔HN):**
  - Phía cầu (KTX): **ĐH Quốc Gia**, **Học viện Tài chính**, **ĐH FPT**.
  - Phía cung (văn phòng, nhân viên có ô tô/ghế thừa): **F-Ville (FPT Software)**, **toà nhà Viettel Hoà Lạc**.
  - Insight: KTX = cầu, văn phòng = cung → bootstrap cả 2 phía marketplace trên cùng tuyến. Coi là **1 thị trường corridor, 5 node đón** — không tản messaging.
- **Nén mật độ:** tập trung đúng corridor HL↔HN + giờ cao điểm, không dàn trải toàn "Hòa Lạc".
- **Bám nhịp:** thiết kế quanh cao điểm **Thứ 6 (ra HN) / Chủ nhật (về HL)**.
- **Tự mồi cung:** tuyển tay ~5–10 người đi thường xuyên (gồm chính founder) trước khi mở.
- **Cộng sinh, không đối đầu FB/Zalo group:** thành "công cụ" group dùng; **chia sẻ link chuyến/app thẳng vào group Zalo/FB** (bù cho việc web không có distribution in-Zalo); bắt tay admin. Ưu tiên link preview đẹp + mở nhanh trên mobile.
- **Concierge dự phòng:** giai đoạn đầu founder tự tay ghép để không ai mở thấy bảng trống.

## 9. Pháp lý (tư thế MVP)

Khung **"chia sẻ chi phí"**, KHÔNG kinh doanh vận tải: không hoa hồng chuyến, không giữ tiền, ToS + miễn trừ rõ, danh bạ taxi chuyên nghiệp/sân bay/nhóm định kỳ = OUT. Rà soát Nghị định 10/2020 với luật sư trước launch thật. An toàn: tùy chọn nữ-với-nữ, rating + report, chỉ lộ liên hệ sau khi duyệt.

## 10. Success metrics (KHÔNG dùng DAU)

- **Fill rate** — % chuyến đăng có ≥1 người ghép thành công (chỉ số sức khỏe thanh khoản, quan trọng nhất).
- **Time-to-match** — thời gian từ đăng đến có match.
- **Tỉ lệ chuyến xác nhận hoàn thành.**
- **Matcher giữ chân theo tuần** (weekly retained).

## 11. Phạm vi MVP (in / out)

**IN:** đăng ký + auth Zalo + verify email trường; đăng chuyến 2 loại; lọc chiều+giờ+ngày; request join → duyệt → lộ liên hệ; tùy chọn nữ-với-nữ; rating + report; xác nhận hoàn thành; điểm đón/trả preset.

**OUT (Phase 2+):** **Zalo Mini App (kênh thứ 2, dùng lại backend)**; tự động ghép (B); nhóm định kỳ (C); thanh toán in-app; ghép sân bay; danh bạ taxi chuyên nghiệp; app native; đa tỉnh; ZNS notifications.

## 12. Rủi ro chính

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| **Thanh khoản không đạt (bảng trống)** — nặng hơn vì web thiếu distribution in-Zalo | Cao | Nén mật độ + bám nhịp cuối tuần + concierge + mồi cung + chia sẻ link vào group |
| Không rời được FB/Zalo group | Trung bình–cao | Cộng sinh với group, chia sẻ link chuyến in-context, hơn hẳn comment thủ công |
| Sự cố an toàn (SV nữ) | Cao (ít xảy ra, hậu quả nặng) | Nữ-với-nữ, report, lộ liên hệ sau duyệt, badge SV |
| Zalo xếp ngành vận tải, đòi giấy phép | Trung bình (đã hoãn) | Chỉ liên quan Phase 2 Mini App; MVP web không dính |

## 13. Next steps & dependencies

1. Viết implementation plan (`/ck:plan`) cho **MVP web PWA** — không còn cổng chặn.
2. Dependencies: project Supabase; **Zalo Login OAuth app** (đăng ký app để lấy OAuth, nhẹ hơn nhiều so với OA xác thực để publish Mini App); dịch vụ gửi email (magic link verify email trường); danh sách điểm đón/trả HL↔HN; 5–10 người mồi cung.
3. Kiến trúc bắt buộc giữ: **API-first + key user theo `zalo_id`** để Phase 2 Mini App tái dùng backend.

## 14. Nguồn tham khảo

- Zalo Mini App docs: https://miniapp.zaloplatforms.com/docs/
- getPhoneNumber: https://miniapp.zaloplatforms.com/docs/api/getPhoneNumber/
- Zalo Mini App for Business (case be, Xanh SM): https://miniforbusiness.zalo.me/home
- Xác thực Mini App ngành đặc thù: https://miniapp.zaloplatforms.com/blog/huong-dan-xac-thuc-zalo-mini-app-doi-voi-cac-nhom-nganh-dac-thu/
- Hướng dẫn xác thực OA: https://oa.zalo.me/home/documents/guides/huong-dan-xac-thuc_70
- zmp-cli: https://www.npmjs.com/package/zmp-cli
