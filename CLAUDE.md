# CLAUDE.md — RoadMate

Đây là file hướng dẫn cho Claude Code hiểu context dự án. Đọc toàn bộ file này trước khi làm bất cứ task nào.

---

## Tổng quan dự án

**Tên sản phẩm:** RoadMate
**Tagline:** Bạn đồng hành trên đường
**Loại:** Carpooling marketplace — kết nối người có xe (ô tô + xe máy) với người có nhu cầu di chuyển trên toàn quốc
**Tầm nhìn:** Giảm xe cá nhân trên đường, tiết kiệm chi phí cho người dùng, và góp phần giảm khí thải CO₂ — đi chung xe là hành động nhỏ nhưng có tác động lớn đến môi trường và xã hội
**Target user:** Bất kỳ ai có nhu cầu đi chung xe tại Việt Nam — sinh viên, nhân viên văn phòng, người đi công tác, du lịch nội địa
**Giai đoạn:** MVP — đang validate hypothesis "hai phía (driver + passenger) có match được nhau không"
**Solo founder:** 1 người, nguồn lực hạn chế, ưu tiên velocity

> **Internal note (không hiển thị với user):** Tuyến đầu tiên để seed data và test PMF là Hà Nội ↔ Hoà Lạc (~40km), target ban đầu là sinh viên FPT/ĐHQG tại Hoà Lạc và nhân viên khu CNC Hoà Lạc. Đây là tuyến có mật độ cao, nhu cầu đều đặn, dễ validate. Sản phẩm không bị giới hạn tuyến này — mở rộng toàn quốc khi có traction.

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

### Posts
```ruby
# Một user có thể đăng nhiều post (offer hoặc request)
t.references :user,         null: false, foreign_key: true
t.integer  :post_type       # enum: 0=offer (có xe), 1=request (cần đi)
t.integer  :vehicle_type    # enum: 0=motorbike, 1=car, 2=any
t.string   :origin                      # Điểm xuất phát (text)
t.string   :destination                 # Điểm đến (text)
t.string   :origin_district             # Quận/huyện (để filter)
t.string   :dest_district
t.datetime :depart_at,      null: false # Giờ xuất phát
t.integer  :price_suggestion            # VNĐ, do người đăng tự điền
t.integer  :seats_available             # Số ghế (chỉ với offer)
t.integer  :status          # enum: 0=active, 1=closed, 2=expired
t.boolean  :recurring,      default: false
t.string   :recurring_days              # "1,2,3,4,5" (Mon-Fri)
t.text     :note
t.timestamps
```

### Conversations
```ruby
# Tạo khi user click "Liên hệ" trên một post
t.references :post,         null: false, foreign_key: true
t.references :initiator,    null: false, foreign_key: { to_table: :users }
t.references :recipient,    null: false, foreign_key: { to_table: :users }
t.integer  :status          # enum: 0=active, 1=closed
t.timestamps
```

### Messages
```ruby
t.references :conversation, null: false, foreign_key: true
t.references :sender,       null: false, foreign_key: { to_table: :users }
t.text     :body,           null: false
t.boolean  :read,           default: false
t.timestamps
```

### Ratings
```ruby
# Chỉ tạo được sau khi có conversation (đã click liên hệ)
t.references :conversation, null: false, foreign_key: true
t.references :rater,        null: false, foreign_key: { to_table: :users }
t.references :ratee,        null: false, foreign_key: { to_table: :users }
t.integer  :score,          null: false  # 1-5
t.text     :comment
t.timestamps
# index: [conversation_id, rater_id], unique: true
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

### Post lifecycle
- Post tự động expire sau 24h (Sidekiq job)
- Post recurring: tự động tạo lại post mới mỗi ngày theo `recurring_days`
- Chỉ owner mới close/edit được post của mình
- Không cho phép tạo conversation với post của chính mình

### Conversation & contact reveal
- Khi user A click "Liên hệ" trên post của user B:
  - Tạo Conversation record
  - Redirect sang conversation page
  - Conversation page hiển thị SĐT + Zalo link của cả hai phía
  - Mở chat box để nhắn tin trong app
- Conversation là điều kiện để rating — không có conversation thì không rate được

### Rating rules
- Chỉ rate sau khi có conversation
- Mỗi conversation chỉ rate được 1 lần (unique index)
- Hiển thị avg_rating trên profile chỉ khi rating_count >= 3
- Khi rating_count < 3: hiển thị "Chưa đủ đánh giá"
- Cập nhật avg_rating trên User sau mỗi lần rate (callback hoặc job)

### Chat (polling, không WebSocket)
- Dùng Turbo Frames + meta refresh hoặc Stimulus polling (mỗi 10s)
- KHÔNG dùng Action Cable / WebSocket ở MVP — quá phức tạp
- Mark as read khi user mở conversation

---

## Conventions & coding style

### Rails conventions
- Dùng Rails defaults — không override nếu không có lý do rõ ràng
- Service objects đặt trong `app/services/` khi logic phức tạp hơn 1 model
- Background jobs trong `app/jobs/`
- Enums định nghĩa trong model với hash syntax: `enum status: { active: 0, closed: 1 }`
- Tất cả tiền VNĐ lưu dạng integer (không dùng float/decimal cho tiền)

### Naming
- Model/class: tiếng Anh, singular (User, Post, Conversation)
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
GET  /                          → Feed (danh sách post, filter)
GET  /posts/new                 → Chọn loại post (offer/request)
GET  /posts/new/offer           → Form đăng "Có xe"
GET  /posts/new/request         → Form đăng "Cần đi"
GET  /posts/:id                 → Chi tiết post
POST /posts/:id/contact         → Tạo conversation (click Liên hệ)
GET  /conversations             → Danh sách conversations của user
GET  /conversations/:id         → Chat + thông tin liên hệ
POST /conversations/:id/messages → Gửi tin nhắn
GET  /profile/:id               → Profile người dùng + ratings
GET  /profile/edit              → Chỉnh sửa profile của mình
GET  /my-posts                  → Quản lý các post của mình
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
- Không WebSocket/Action Cable — dùng polling cho chat
- Không mobile app (Expo) — PWA trước
- Không tính năng "nhóm đi chung taxi" — phase 2
- Không email — chỉ SĐT

---

## Giá trị cốt lõi & môi trường

RoadMate không chỉ là công cụ tiết kiệm tiền — đây là nền tảng góp phần giải quyết vấn đề giao thông và môi trường tại Việt Nam:

- **Tiết kiệm chi phí:** Chia sẻ chi phí xăng, cầu đường giữa các thành viên — giảm đáng kể chi phí di chuyển hàng ngày
- **Tiết kiệm năng lượng:** Mỗi chuyến đi chung = ít xe cá nhân hơn trên đường = tiêu thụ nhiên liệu ít hơn
- **Giảm khí thải:** Carpooling giảm trực tiếp lượng CO₂ và khí thải độc hại — đóng góp vào mục tiêu net-zero của Việt Nam
- **Giảm tắc đường:** Ít phương tiện = ít ùn tắc = chất lượng sống đô thị tốt hơn

**Trong UI:** Nên nhắc nhẹ giá trị môi trường ở các điểm phù hợp (onboarding, feed, sau khi hoàn thành chuyến) — không push quá mức nhưng tạo cảm giác user đang làm điều có ý nghĩa.

---

## Context bổ sung

- **Founder:** Senior Rails engineer, quen với Rails conventions, không cần giải thích basics
- **Thị trường:** Việt Nam, tiếng Việt trong UI, format SĐT Việt Nam (+84 hoặc 0xx)
- **Tiền tệ:** VNĐ, hiển thị format "50.000đ" không phải "50,000 VND"
- **Giờ:** UTC+7, lưu UTC trong DB, hiển thị local time
- **Ảnh:** Active Storage + lưu local ở dev, S3/R2 ở production


