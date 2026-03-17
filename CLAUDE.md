# CLAUDE.md — RoadMate

Đây là file hướng dẫn cho Claude Code hiểu context dự án. Đọc toàn bộ file này trước khi làm bất cứ task nào.

---

## Tổng quan dự án

**Tên sản phẩm:** RoadMate
**Tagline:** Bạn đồng hành trên đường
**Loại:** Carpooling marketplace — kết nối người có xe (ô tô + xe máy) với người có nhu cầu di chuyển
**Tuyến trọng tâm:** Trung tâm Hà Nội ↔ Khu Công nghệ cao Hoà Lạc (~40km)
**Target user:** Sinh viên FPT University, ĐHQG Hà Nội (năm nhất tại Hoà Lạc), nhân viên khu CNC Hoà Lạc
**Giai đoạn:** MVP — đang validate hypothesis "hai phía (driver + passenger) có match được nhau không"
**Solo founder:** 1 người, nguồn lực hạn chế, ưu tiên velocity

---

## Tech stack

```
Backend:   Rails 8 (full-stack, KHÔNG dùng API mode ở MVP)
View layer: ERB + Hotwire (Turbo + Stimulus) + Tailwind CSS
Database:  PostgreSQL
Cache/Jobs: Redis + Sidekiq
Deploy:    Render.com hoặc Railway
PWA:       Service worker đơn giản + web app manifest
Mobile:    Expo (React Native) — phase 2, chưa làm
```

**Lý do chọn Rails full-stack (không phải API + SPA):**
- Founder có 8+ năm kinh nghiệm Rails
- Velocity quan trọng hơn scalability ở MVP
- Hotwire đủ cho các interaction cần thiết
- PWA thay thế mobile app trong giai đoạn đầu
- Khi có traction mới tách API cho Expo

---

## Database schema hiện tại

### Users
```ruby
# Đăng nhập bằng SĐT + password. has_secure_password (bcrypt)
# Không dùng email. OTP chỉ dùng cho reset password.
t.string   :phone,            null: false  # +84xxxxxxxxx, unique
t.string   :password_digest,  null: false  # has_secure_password
t.string   :name,             null: false
t.string   :avatar_url
t.string   :zalo_link                      # https://zalo.me/...
t.integer  :vehicle_type      # enum: 0=none, 1=motorbike, 2=car
t.string   :vehicle_plate                  # Biển số xe
t.integer  :available_seats               # Số ghế trống (chỉ khi có xe)
t.float    :avg_rating,       default: 0
t.integer  :rating_count,     default: 0
t.timestamps
```

### Rides (chuyến xe)
```ruby
# Tên model: Ride (không phải Post)
# ride_type: driver tạo "offer" (có xe), passenger tạo "request" (cần đi)
t.references :user,           null: false, foreign_key: true
t.integer  :ride_type         # enum: 0=offer (driver), 1=request (passenger)
t.integer  :vehicle_type      # enum: 0=motorbike, 1=car, 2=any
t.string   :origin,           null: false  # Điểm xuất phát (text)
t.string   :destination,      null: false  # Điểm đến (text)
t.string   :origin_district                # Quận/huyện (để filter)
t.string   :dest_district
t.datetime :depart_at,        null: false  # Giờ xuất phát
t.integer  :price_suggestion               # VNĐ, do người đăng tự điền
t.integer  :seats_available                # Số ghế trống (chỉ với offer)
t.integer  :status            # enum: 0=active, 1=matched, 2=full, 3=expired, 4=cancelled
t.boolean  :recurring,        default: false
t.string   :recurring_days                 # "1,2,3,4,5" (Mon-Fri)
t.text     :note
t.timestamps
```

### RideRequests (booking hoặc offer)
```ruby
# Gộp cả Booking (passenger → driver ride) và Offer (driver → passenger ride)
# direction phân biệt chiều: ai là người chủ động tiếp cận
t.references :ride,           null: false, foreign_key: true
t.references :requester,      null: false, foreign_key: { to_table: :users }
t.integer  :direction         # enum: 0=booking (passenger→driver), 1=offer (driver→passenger)
t.integer  :status            # enum: 0=pending, 1=accepted, 2=declined, 3=cancelled
t.integer  :seats,            default: 1  # Số ghế muốn đặt (với booking)
t.integer  :price             # VNĐ, giá thỏa thuận
t.text     :note
t.timestamps
# index: [ride_id, requester_id], unique: true — không request 2 lần cùng ride
```

### RideRequestMessages
```ruby
# Thread nhắn tin gắn trực tiếp vào RideRequest
# Visible chỉ cho owner của Ride và người tạo RideRequest đó
# Dùng trước và sau khi accept — không cần Conversation riêng
t.references :ride_request,   null: false, foreign_key: true
t.references :sender,         null: false, foreign_key: { to_table: :users }
t.text     :body,             null: false
t.boolean  :read,             default: false
t.timestamps
```

### Ratings
```ruby
# Chỉ tạo được khi RideRequest status = accepted VÀ ride đã expired
# Form rating hiển thị inline trong thread của RideRequest
# Cả driver và passenger đều rate nhau
t.references :ride_request,   null: false, foreign_key: true
t.references :rater,          null: false, foreign_key: { to_table: :users }
t.references :ratee,          null: false, foreign_key: { to_table: :users }
t.integer  :score,            null: false  # 1-5
t.text     :comment
t.timestamps
# index: [ride_request_id, rater_id], unique: true — mỗi người rate 1 lần/ride_request
```

### OtpCodes (chỉ dùng cho reset password)
```ruby
t.string   :phone,          null: false
t.string   :code,           null: false  # 6 chữ số, lưu plain (short-lived)
t.datetime :expires_at,     null: false  # 10 phút
t.boolean  :used,           default: false
t.timestamps
# Xoá record sau khi dùng hoặc expired — Sidekiq cleanup job hàng giờ
```

---

## Business logic quan trọng

### Auth flow (SĐT + password)

**Đăng ký:**
1. User nhập SĐT + password + tên → tạo User với `has_secure_password`
2. Normalize SĐT về dạng `+84xxxxxxxxx` trước khi lưu
3. Redirect sang trang hoàn thiện profile (thêm ảnh, xe, Zalo link)

**Đăng nhập:**
1. User nhập SĐT + password → `user.authenticate(password)`
2. Nếu đúng → lưu `session[:user_id]`, redirect về feed
3. Session kéo dài 60 ngày (`cookies.permanent` hoặc config session store)

**Quên mật khẩu (SMS OTP — dùng hạn chế):**
1. User nhập SĐT → tạo OtpCode (hết hạn 10 phút) → gửi SMS qua ESMS
2. User nhập OTP → verify → cho phép đặt password mới
3. Rate limit: tối đa 3 request OTP/SĐT/giờ để tránh lạm dụng
4. Chi phí thấp vì chỉ dùng khi quên mật khẩu, không phải mỗi lần login

### Ride lifecycle

**Naming:** Model là `Ride` (không phải Post). Trong UI tiếng Việt gọi là "chuyến".

**Hai loại Ride:**
- `offer` — Driver đăng: có xe, còn ghế, muốn tìm passenger
- `request` — Passenger đăng: cần đi, muốn tìm driver

**Ride status transitions:**
- `active` → `matched` : khi ≥1 RideRequest được accepted
- `active` → `full`    : khi seats_available = 0 (chỉ offer)
- `active/matched` → `expired`   : depart_at + 1h (Sidekiq job, chạy mỗi 15 phút)
- `active/matched` → `cancelled` : owner tự cancel
- `matched` → `active` : khi accepted RideRequest bị cancelled (driver/passenger đổi ý)

**Expire logic (Sidekiq job):**
```ruby
class ExpireRidesJob < ApplicationJob
  def perform
    Ride.where(status: [:active, :matched])
        .where("depart_at < ?", 1.hour.ago)
        .update_all(status: :expired)
    Ride.active.where(seats_available: 0)
        .update_all(status: :full)
  end
end
```

**Recurring rides:**
- Sau khi ride expire, nếu `recurring: true` → Sidekiq tạo ride mới cho ngày tiếp theo trong `recurring_days`
- Chỉ owner mới edit/cancel được ride của mình

### Hai flow match — Flow A và Flow B

**Flow A — Driver đăng ride, Passenger book:**
1. Driver tạo ride (offer) → ride active trên feed
2. Passenger filter feed → tìm thấy ride phù hợp
3. Passenger tạo RideRequest (`direction: :booking`, seats, giá, note)
4. Driver nhận notification → xem danh sách bookings
5. Driver accept 1 booking:
   - `seats_available` giảm theo số ghế
   - Nếu `seats_available = 0` → ride chuyển sang `full`, auto-decline toàn bộ pending bookings còn lại
   - Nếu còn ghế → ride vẫn `active`, nhận booking mới
   - Reveal SĐT + Zalo trong thread, tiếp tục nhắn tin

**Flow B — Passenger đăng ride, Driver offer:**
1. Passenger tạo ride (request) → ride active trên feed
2. Driver filter feed → tìm thấy ride phù hợp
3. Driver tạo RideRequest (`direction: :offer`, giờ đón, giá, note)
4. Passenger nhận notification → xem danh sách offers
5. Passenger accept 1 offer:
   - Ride chuyển sang `matched`
   - Auto-decline toàn bộ pending offers còn lại
   - Reveal SĐT + Zalo trong thread, tiếp tục nhắn tin

**Điểm khác biệt giữa 2 flow:**

| | Flow A (Driver đăng) | Flow B (Passenger đăng) |
|---|---|---|
| Ai tạo RideRequest | Passenger (booking) | Driver (offer) |
| Ai accept | Driver | Passenger |
| Trigger auto-decline | seats_available = 0 | Passenger accept 1 offer |
| Ride sau match | Active nếu còn ghế | Closed (matched) |

### Thread & contact reveal

**Không có Conversation hay Message model** — kênh giao tiếp duy nhất là `RideRequestMessage` thread gắn vào từng RideRequest.

**Visibility rules:**
- Thread chỉ visible cho 2 người: owner của Ride + người tạo RideRequest đó
- Passenger A không thấy thread của Passenger B dù cùng book 1 Ride

**Trước khi accept:**
- Cả hai có thể nhắn tin trong thread để hỏi thêm thông tin
- SĐT + Zalo **ẩn** — chưa reveal

**Khi accept:**
- SĐT + Zalo của cả hai **tự động hiển thị** trong thread
- Các RideRequest bị declined → thread ẩn khỏi ride detail page
- Thread của accepted RideRequest tiếp tục dùng bình thường

**Khi ride expire:**
- Form rating xuất hiện **inline** trong thread
- Cả driver và passenger đều rate nhau (mỗi người 1 lần)
- Rating là điều kiện: RideRequest phải `accepted` + Ride phải `expired/cancelled`

**Khi accepted RideRequest bị cancel:**
- Thread vẫn còn nhưng đánh dấu cancelled
- Ride quay về `active`, không mở rating

### Rating rules
- Điều kiện: RideRequest phải `accepted` + Ride phải `expired` hoặc `cancelled`
- Form rating hiển thị inline trong RideRequest thread sau khi ride kết thúc
- Mỗi RideRequest chỉ rate được 1 lần / người (unique index: ride_request_id + rater_id)
- Hiển thị avg_rating trên profile chỉ khi rating_count >= 3
- Khi rating_count < 3: hiển thị "Chưa đủ đánh giá"
- Cập nhật avg_rating trên User sau mỗi lần rate (after_create callback trên Rating)

### Thread messaging (polling, không WebSocket)
- Dùng Turbo Frames + Stimulus polling (mỗi 10s) để load tin nhắn mới
- KHÔNG dùng Action Cable / WebSocket ở MVP — quá phức tạp
- Mark as read khi user mở thread (update read: true cho các messages của mình)
- Unread badge hiển thị trên ride detail page và danh sách ride_requests của user

---

## Conventions & coding style

### Rails conventions
- Dùng Rails defaults — không override nếu không có lý do rõ ràng
- Service objects đặt trong `app/services/` khi logic phức tạp hơn 1 model
- Background jobs trong `app/jobs/`
- Enums định nghĩa trong model với hash syntax: `enum status: { active: 0, closed: 1 }`
- Tất cả tiền VNĐ lưu dạng integer (không dùng float/decimal cho tiền)

### Naming
- Model/class: tiếng Anh, singular (User, Ride, RideRequest, RideRequestMessage)
- Routes/controllers: tiếng Anh, RESTful
- Comment trong code: tiếng Việt được phép nếu giải thích business logic phức tạp
- Biến/method: snake_case tiếng Anh

### Views
- Dùng ERB, không dùng Slim/Haml
- Tailwind CSS — không viết custom CSS nếu Tailwind đủ dùng
- Turbo Frames cho các interaction cần update một phần trang
- Stimulus cho JavaScript nhỏ (toggle, validation client-side)
- Mobile-first — target chính là PWA trên điện thoại

### Testing
- Không viết test ở MVP trừ khi được yêu cầu cụ thể
- Ưu tiên manual testing và nhanh ra feature
- Khi viết test: dùng RSpec + FactoryBot

---

## Các màn hình chính (routing)

```
GET  /                          → Feed (danh sách rides, filter)
GET  /rides/new                 → Chọn loại chuyến (offer/request)
GET  /rides/new/offer           → Form đăng "Có xe"
GET  /rides/new/request         → Form đăng "Cần đi"
GET  /rides/:id                 → Chi tiết chuyến
POST /rides/:id/ride_requests   → Tạo booking hoặc offer (RideRequest)
GET  /rides/:id/ride_requests        → Danh sách booking/offer của chuyến (owner only)
PATCH /ride_requests/:id/accept      → Accept → reveal SĐT/Zalo, auto-decline others
PATCH /ride_requests/:id/decline     → Decline một RideRequest
GET  /ride_requests/:id/messages     → Thread messages (Turbo Frame polling)
POST /ride_requests/:id/messages     → Gửi tin nhắn trong thread
GET  /inbox                          → Danh sách ride_requests có activity (inbox)
GET  /profile/:id               → Profile người dùng + ratings
GET  /profile/edit              → Chỉnh sửa profile của mình
GET  /my-rides                  → Quản lý các chuyến của mình
```

---

## Thứ tự implement (ưu tiên)

Làm theo thứ tự này, không nhảy cóc:

1. **Auth** — SĐT + password + session (has_secure_password)
2. **Forgot password** — SMS OTP chỉ cho reset (ESMS)
2. **Profile** — tạo/edit profile cơ bản
3. **Post CRUD** — tạo offer/request, feed, filter
4. **Contact reveal** — tạo conversation, hiển thị SĐT/Zalo
5. **Chat** — nhắn tin trong conversation (polling)
6. **Rating** — sau khi có conversation
7. **PWA** — manifest + service worker
8. **Post recurring** — Sidekiq job
9. **Push notification** — nice to have

---

## Pricing plan

### Chiến lược tổng quan
- **Giai đoạn MVP:** Miễn phí hoàn toàn cho tất cả — không charge cho đến khi có 200+ user active
- **Lý do:** Charge quá sớm sẽ kill traction trước khi network effect hình thành
- **Tuy nhiên:** Hiển thị pricing page ngay từ đầu để collect signal và tạo tâm lý "đang dùng free" thay vì "free mãi"

### Các tier

| Nhóm | Free tier | Paid tier | Giá |
|---|---|---|---|
| **Passenger** (người đi nhờ) | Toàn bộ tính năng | Không có paid tier | Miễn phí mãi |
| **Người có xe** (sinh viên, nhân viên) | 3 post/tháng, xem liên hệ không giới hạn | Post không giới hạn, post định kỳ, hiển thị ưu tiên | 49.000đ/tháng |
| **Tài xế chuyên nghiệp** (taxi tiện chuyến) | 3 post/tháng, badge "Tài xế" cơ bản | Post không giới hạn, badge "Verified Pro", hiển thị đầu feed, stats chuyến đi | 149.000đ/tháng |

### Lý do chọn mức giá
- **49k** — thấp hơn một tách cà phê, không phải quyết định tài chính. ROI rõ nếu tiết kiệm 200-300k tiền xăng/tháng
- **149k** — tài xế chuyên kiếm vài triệu/tháng từ nghề, đây là chi phí marketing rẻ nhất họ có. Thấp hơn nhiều so với Facebook Ads
- **Passenger free mãi** — demand side phải luôn free trong marketplace. Charge passenger = giết supply vì driver không có khách

### Ước tính doanh thu khi có 500 user active
- 50 người có xe paid × 49k = 2.450.000đ
- 30 tài xế chuyên paid × 149k = 4.470.000đ
- **Tổng ~7tr/tháng** — đủ cover server + ESMS + chi phí vận hành cơ bản

---

## Pricing page (hiển thị trong giai đoạn free)

### Mục tiêu
- Transparency: user biết trước app sẽ có phí, không bị surprise khi launch paid
- Collect signal: track click vào "Xem gói" để biết nhóm nào có intent trả tiền cao
- Collect waitlist: nút "Thông báo khi mở bán" → lưu SĐT vào bảng `pricing_interests`

### Cách hiển thị
- **Không** làm popup intrusive hay màn hình chặn
- Banner nhỏ ở trang tạo post và trang profile:
  > *"RoadMate hiện đang miễn phí hoàn toàn. Xem các tính năng sắp ra mắt →"*
- Dẫn sang `/pricing` — trang tĩnh hiển thị 3 tier với badge **"Đang miễn phí"** thay vì nút thanh toán
- Nút **"Thông báo khi mở bán"** trên mỗi paid tier → lưu `{ phone, tier }` vào DB

### Schema bổ sung
```ruby
# PricingInterests — waitlist cho paid plan
t.string  :phone,     null: false
t.integer :tier       # enum: 0=casual_driver, 1=pro_driver
t.timestamps
# index: [phone, tier], unique: true
```

### Route
```
GET  /pricing            → Trang pricing tĩnh, không cần login
POST /pricing/interests  → Lưu waitlist (cần login để có SĐT)
```

## Môi trường & deploy

```bash
# Development
bundle exec rails s
bundle exec sidekiq

# Env vars cần thiết
DATABASE_URL=
REDIS_URL=
SMS_PROVIDER=esms          # ESMS.vn cho SMS OTP ở Việt Nam
ESMS_API_KEY=
ESMS_SECRET_KEY=
SECRET_KEY_BASE=
```

**ESMS thay vì Twilio** vì: rẻ hơn nhiều cho SMS Việt Nam, không cần thẻ quốc tế, latency thấp hơn.

---

## Những gì KHÔNG làm ở MVP

- Không tích hợp map (Google Maps, Mapbox) — dùng text cho địa điểm
- Không payment trong app — user tự deal tiền mặt/chuyển khoản
- Không WebSocket/Action Cable — dùng polling cho thread messaging
- Không Conversation / Message model — dùng RideRequestMessage thread thay thế
- Không mobile app (Expo) — PWA trước
- Không tính năng "nhóm đi chung taxi" — phase 2
- Không email — chỉ SĐT

---

## Context bổ sung

- **Founder:** Senior Rails engineer, quen với Rails conventions, không cần giải thích basics
- **Thị trường:** Việt Nam, tiếng Việt trong UI, format SĐT Việt Nam (+84 hoặc 0xx)
- **Tiền tệ:** VNĐ, hiển thị format "50.000đ" không phải "50,000 VND"
- **Giờ:** UTC+7, lưu UTC trong DB, hiển thị local time
- **Ảnh:** Active Storage + lưu local ở dev, S3/R2 ở production