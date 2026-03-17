# RoadMate — System Architecture

## High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                       User (Browser/Mobile)                    │
└────────────────┬─────────────────────────────────┬─────────────┘
                 │                                 │
         HTTP/HTTPS                        PWA (Service Worker)
                 │                                 │
┌────────────────▼─────────────────────────────────▼─────────────┐
│                     Thruster / Puma Server                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Rails 8 Application (Full-Stack)              │  │
│  │  ┌─────────┐  ┌──────────────┐  ┌────────────────────┐ │  │
│  │  │ Routing │  │  Controllers │  │    Views (ERB)     │ │  │
│  │  │  (REST) │  │ (thin layer) │  │  + Hotwire/Turbo  │ │  │
│  │  └─────────┘  └──────────────┘  │  + Tailwind CSS    │ │  │
│  │                                  │  + Stimulus JS     │ │  │
│  │  ┌──────────────────────────────────────────────────┐ │  │
│  │  │           Models (ActiveRecord)                 │ │  │
│  │  │  User, Ride, RideRequest, RideRequestMessage,  │ │  │
│  │  │  Rating with validations, associations, enums  │ │  │
│  │  └──────────────────────────────────────────────────┘ │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────────┐ │  │
│  │  │   Background Jobs (Sidekiq + Redis)             │ │  │
│  │  │  - ExpireRidesJob (every 15 min)                 │ │  │
│  │  │  - RecurringRideJob (after expire)               │ │  │
│  │  │  - OtpCleanupJob (hourly)                        │ │  │
│  │  └──────────────────────────────────────────────────┘ │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────────┐ │  │
│  │  │         Services (Business Logic)                │ │  │
│  │  │  - ConversationInitiator                         │ │  │
│  │  │  - RatingCalculator                              │ │  │
│  │  └──────────────────────────────────────────────────┘ │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────────┐ │  │
│  │  │          Asset Pipeline (Propshaft)             │ │  │
│  │  │  - Tailwind CSS (app/assets/stylesheets/)       │ │  │
│  │  │  - Importmap JS (app/javascript/)                │ │  │
│  │  │  - Images (app/assets/images/)                   │ │  │
│  │  └──────────────────────────────────────────────────┘ │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────────┐ │  │
│  │  │       Active Storage (File Uploads)              │ │  │
│  │  │  - User avatars (local dev, S3/R2 prod)          │ │  │
│  │  │  - Image processing (thumbnails)                 │ │  │
│  │  └──────────────────────────────────────────────────┘ │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────────┐ │  │
│  │  │    Cache Layer (Redis)                           │ │  │
│  │  │  - Session store (60-day cookie)                │ │  │
│  │  │  - Query caching (ratings, user data)           │ │  │
│  │  │  - Rate limiting buckets (OTP requests)         │ │  │
│  │  └──────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         External Integrations (On-Demand)             │ │
│  │  - ESMS (SMS provider for password reset OTP)         │ │
│  │  - Active Storage backends (S3 / Cloudflare R2)       │ │
│  └────────────────────────────────────────────────────────┘ │
└───────────────┬─────────────────────────────┬────────────────┘
                │                             │
        ┌───────▼──────────┐        ┌────────▼────────┐
        │   PostgreSQL     │        │   Redis         │
        │   (Primary DB)   │        │  (Cache/Queue)  │
        └──────────────────┘        └─────────────────┘
```

---

## Technology Stack Rationale

### Backend: Rails 8 Full-Stack (Not API Mode)
**Why Full-Stack?**
- Solo founder with 8+ years Rails experience
- Velocity over scalability at MVP stage
- Hotwire + ERB provides real-time UX without separate frontend repo
- No API/SPA complexity needed for initial feature set

**Key Gems:**
- `rails` (8.1.1): Full-stack framework
- `pg`: PostgreSQL driver
- `puma`: Web server
- `turbo-rails`: Real-time UI via Hotwire Frames
- `stimulus-rails`: Lightweight JS framework
- `tailwindcss-rails`: Atomic CSS (no custom CSS needed)
- `importmap-rails`: Zero-config JS modules (no bundler)
- `sidekiq`: Background jobs with Redis
- `redis`: Cache store, job queue backend

### Database: PostgreSQL (Single Database)

**Development:**
- Single database: `roadmate_development`
- Simpler setup, faster iteration

**Production:**
```
- Primary (roadmate_production)
  - User data, rides, ride requests, ride request messages, ratings
  - Main application data
  - Session store (via Redis)
```

**Rationale:**
- **Simplicity**: Single DB easier to manage at MVP scale
- **Performance**: Redis handles sessions and cache separately
- **Scaling**: Can add read replicas when needed

### Web Server: Puma + Thruster
- **Puma**: Multi-process HTTP server (5 threads default, configurable)
- **Thruster**: HTTP caching + asset compression layer
- **Cost**: No separate cache server (Thruster handles it)
- **Future**: Can upgrade to Passenger or Unicorn if needed

### View Layer: ERB + Hotwire + Tailwind CSS
- **ERB**: Server-rendered templates (no JS framework needed)
- **Turbo Frames**: Partial page updates via AJAX
- **Stimulus**: Lightweight JS for interactivity (polling, form validation)
- **Tailwind CSS**: Utility-first CSS (no custom stylesheets)
- **Mobile-First**: Responsive design out-of-box

### Asset Pipeline: Propshaft + Importmap
- **Propshaft**: Rails 8 default asset pipeline (simpler than Sprockets)
- **Importmap**: ES6 modules without webpack/esbuild
- **Benefits**: No build step during development, instant reload
- **Tradeoff**: Slower for 100+ JavaScript files (OK for MVP)

### Background Jobs: Sidekiq + Redis
**Development & MVP:**
```
Job scheduler → Sidekiq (Redis queue) → Worker thread
```

**Production (Single Server):**
```
# Run Sidekiq alongside Puma
bundle exec sidekiq -e production
```

**Future (Multi-Server):**
```
# Separate job server
servers:
  job:
    hosts:
      - 192.168.0.2
    cmd: bundle exec sidekiq
```

### Caching Strategy: Redis

**Development:**
```ruby
# config/environments/development.rb
config.cache_store = :memory_store
```

**Production:**
```ruby
# config/environments/production.rb
config.cache_store = :redis_cache_store, { url: ENV["REDIS_URL"] }
```

### Deployment: Kamal (Docker) or Render.com/Railway
**Why Kamal?**
- Built by Basecamp, integrated with Rails
- Single-server deployment (no Kubernetes complexity)
- Automatic zero-downtime deploys
- Built-in logging, monitoring hooks

**Alternatives:**
- Render.com (PaaS, simpler than Kamal)
- Railway (PaaS, supports Redis + PostgreSQL)

**Architecture:**
```
Developer (bin/kamal deploy or git push)
            ↓
    Build Docker image (Dockerfile)
            ↓
    SSH into server (Kamal) or PaaS (Render/Railway)
            ↓
    Pull image, start container, health check
            ↓
    Old container → drain requests → stop
            ↓
    New container active
```

---

## Data Flow: Core Features

### 1. User Registration & Login

```
┌─────────────────────────────────────────┐
│  User Registration (via Devise)         │
└──────────────────┬──────────────────────┘
                   │
         POST /users (Devise route)
                   │
        ┌──────────▼──────────────────┐
        │ Users::RegistrationsController│
        │ (overrides Devise default)   │
        │ - Validate phone + password  │
        │ - Normalize phone            │
        │ - Call Devise registration   │
        │ - Redirect to profile edit   │
        └──────────────────────────────┘
                   │
        ┌──────────▼──────────────────┐
        │ User Model                   │
        │ - Devise modules:            │
        │   :database_authenticatable, │
        │   :registerable,             │
        │   :rememberable              │
        │ - authentication_keys[:phone]│
        │ - encrypted_password (Devise)│
        └──────────────────────────────┘
                   │
        ┌──────────▼──────────────────────┐
        │ PostgreSQL (Primary DB)         │
        │ INSERT into users               │
        │ - phone (normalized)            │
        │ - encrypted_password (Bcrypt)   │
        └─────────────────────────────────┘
                   │
        Session stored in:
        - Redis (session store)
        - Browser cookie (encrypted, 60 days)
```

### 2. Creating a Ride (Offer/Request)

```
┌─────────────────────────────────────┐
│ Driver/Passenger: Create Ride       │
└─────────────────┬───────────────────┘
                  │
        GET /rides/new?type=offer
                  │
        ┌─────────▼────────────┐
        │ RidesController#new  │
        │ - Build @ride        │
        │ - Render form        │
        └──────────────────────┘
                  │
     User fills: origin, destination, time, price, seats
                  │
        ┌─────────▼────────────────────┐
        │ RidesController#create       │
        │ - Validate ride_params       │
        │ - Set user_id = current_user │
        │ - Save Ride                  │
        └──────────────────┬───────────┘
                           │
        ┌──────────────────▼──────────────┐
        │ Ride Model Validations         │
        │ - Presence: user, route, time  │
        │ - Format: enums                │
        │ - Comparison: time > now       │
        └──────────────────┬──────────────┘
                           │
        ┌──────────────────▼──────────────┐
        │ PostgreSQL (Primary DB)        │
        │ INSERT into rides              │
        │ ├─ user_id                     │
        │ ├─ origin, destination         │
        │ ├─ depart_at                   │
        │ ├─ ride_type, vehicle_type     │
        │ ├─ status = active             │
        │ └─ created_at = now            │
        └──────────────────┬──────────────┘
                           │
        Redirect to ride#show
                           │
        ┌──────────────────▼──────────────┐
        │ Sidekiq Job (every 15 min)     │
        │ ExpireRidesJob                 │
        │ - Find rides created > 1h ago  │
        │ - UPDATE status = expired      │
        └────────────────────────────────┘
```

### 3. Contact & RideRequest Flow

Two flows: **Flow A** (Driver posts offer, Passenger books) and **Flow B** (Passenger posts request, Driver offers).

**Flow A: Passenger creates RideRequest (booking)**
```
┌──────────────────────────────────────┐
│ Passenger clicks "Book"               │
│ on Driver's Offer Ride               │
└────────────────┬─────────────────────┘
                 │
    POST /rides/:id/ride_requests
                 │
        ┌────────▼─────────────────┐
        │ RideRequestsController#  │
        │ create                    │
        │ - Validate ride exists    │
        │ - direction = :booking    │
        │ - requester = passenger   │
        └────────┬──────────────────┘
                 │
        ┌────────▼──────────────────────┐
        │ PostgreSQL (Primary DB)      │
        │ INSERT into ride_requests    │
        │ ├─ ride_id                   │
        │ ├─ requester_id = passenger  │
        │ ├─ direction = booking       │
        │ ├─ status = pending          │
        │ └─ UNIQUE(ride_id, requester)│
        └────────┬──────────────────────┘
                 │
        ┌────────▼─────────────────┐
        │ Redirect to ride_request  │
        │ messages thread           │
        │ - Messages thread         │
        │ - Contact info hidden     │
        │ - Wait for driver accept  │
        └──────────────────────────┘
```

**Flow B: Driver creates RideRequest (offer)**
```
┌──────────────────────────────────────┐
│ Driver clicks "Offer"                 │
│ on Passenger's Request Ride          │
└────────────────┬─────────────────────┘
                 │
    POST /rides/:id/ride_requests
                 │
        ┌────────▼─────────────────┐
        │ RideRequestsController#  │
        │ create                    │
        │ - Validate ride exists    │
        │ - direction = :offer      │
        │ - requester = driver      │
        └────────┬──────────────────┘
                 │
        ┌────────▼──────────────────────┐
        │ PostgreSQL (Primary DB)      │
        │ INSERT into ride_requests    │
        │ ├─ ride_id                   │
        │ ├─ requester_id = driver     │
        │ ├─ direction = offer         │
        │ ├─ status = pending          │
        │ └─ UNIQUE(ride_id, requester)│
        └────────┬──────────────────────┘
```

### 4. Chat (Polling via Stimulus)

```
┌────────────────────────────────────┐
│ User types message & submits       │
└──────────┬───────────────────────┘
           │
    POST /ride_requests/:id/messages
           │
    ┌──────▼─────────────────────┐
    │ RideRequestMessagesController#
    │ create                      │
    │ - message_params            │
    │ - Save RideRequestMessage   │
    └──────┬──────────────────────┘
           │
    ┌──────▼──────────────────────────────┐
    │ PostgreSQL (Primary DB)             │
    │ INSERT into ride_request_messages   │
    │ ├─ ride_request_id                  │
    │ ├─ sender_id = current_user         │
    │ ├─ body                             │
    │ └─ read = false                     │
    └──────┬───────────────────────────┘
           │
    ┌──────▼────────────────────┐
    │ Respond with updated HTML │
    │ (Turbo Frame)             │
    └──────┬───────────────────┘
           │
┌──────────▼──────────────────────────┐
│ Stimulus Polling (ridePollController)
│ - Interval: 10 seconds              │
│ - GET /ride_requests/:id/messages   │
│ - Fetch latest messages             │
│ - Update DOM (Turbo)                │
│ - Scroll to bottom                  │
└─────────────────────────────────────┘
```

### 5. Rating Flow

```
┌────────────────────────────────────┐
│ After ride expire: User clicks Rate│
└──────────┬───────────────────────┘
           │
    GET /ratings/new?
     ride_request_id=:id
           │
    ┌──────▼──────────────────────┐
    │ RatingsController#new       │
    │ - Check: ride_request       │
    │   accepted & ride expired   │
    │ - Show form                 │
    └──────┬──────────────────────┘
           │
      User rates 1-5 + comment
           │
    ┌──────▼──────────────────┐
    │ RatingsController#create│
    │ - Validate score (1-5)  │
    │ - Create Rating record  │
    └──────┬──────────────────┘
           │
    ┌──────▼────────────────────────┐
    │ PostgreSQL (Primary DB)      │
    │ INSERT into ratings          │
    │ ├─ ride_request_id           │
    │ ├─ rater_id                  │
    │ ├─ ratee_id                  │
    │ ├─ score                     │
    │ └─ UNIQUE(ride_request_id,   │
    │       rater_id)              │
    └──────┬───────────────────────┘
           │
    ┌──────▼─────────────────────────┐
    │ after_create callback          │
    │ - Calculate avg_rating         │
    │ - SUM(ratings.score) / COUNT   │
    │ - Update User.avg_rating       │
    │ - Update User.rating_count     │
    └──────┬──────────────────────────┘
           │
    ┌──────▼────────────────────────┐
    │ PostgreSQL (Primary DB)      │
    │ UPDATE users                 │
    │ SET avg_rating = X,          │
    │     rating_count = Y         │
    │ WHERE id = ratee_id          │
    └─────────────────────────────┘
```

---

## Database Connections (Production)

### Connection Pooling

```ruby
# config/database.yml (production)
production:
  adapter: postgresql
  database: roadmate_production
  username: roadmate
  password: <%= ENV["DB_PASSWORD"] %>
  host: db.example.com
  max_connections: 25      # Total pool size
  checkout_timeout: 2.0
  reaping_frequency: 10
```

**Connection Flow:**
```
Puma (5 threads) → Redis (cache/session)
                → PostgreSQL (25 pool connections)
```

---

## Security Architecture

### Session Management
```
┌────────────────────────────────────┐
│ User Login Successful              │
└──────────────┬─────────────────────┘
               │
        ┌──────▼────────────────┐
        │ Set session[:user_id] │
        │ = 123                 │
        └──────┬─────────────────┘
               │
        ┌──────▼────────────────────┐
        │ Store in:                 │
        │ - Solid Cache DB, OR      │
        │ - Encrypted cookie        │
        │ (Rails default)           │
        └──────┬─────────────────────┘
               │
        ┌──────▼──────────────────┐
        │ Cookie (Encrypted)      │
        │ Name: _roadmate_session │
        │ HttpOnly: true          │
        │ Secure: true (prod)     │
        │ SameSite: Strict        │
        │ Max-Age: 5184000        │
        │ (60 days)               │
        └────────────────────────┘

Per-Request:
┌────────────────────────────┐
│ Browser sends cookie       │
└────────┬───────────────────┘
         │
  ┌──────▼─────────────────┐
  │ Rails middleware       │
  │ decrypt & verify       │
  └──────┬─────────────────┘
         │
  ┌──────▼─────────────────────────┐
  │ Set current_user helper        │
  │ User.find(session[:user_id])   │
  └────────────────────────────────┘
```

### Password Security (has_secure_password)
```
User Input: "MyP@ssw0rd"
    ↓
BCrypt hashing
    ↓
Hashed: "$2b$12$abcd...efgh" (60 chars)
    ↓
Stored in users.password_digest (VARCHAR)
    ↓
On Login:
    ↓
user.authenticate(password) using password_digest
    ↓
Time-constant comparison (resistant to timing attacks)
    ↓
Session set: session[:user_id] = user.id (60 days)
```

### OTP (Password Reset)
```
1. User: "I forgot my password"
2. OtpCode.create(phone, code: "123456", expires_at: 10.min.from_now)
3. SMS sent: "Your OTP: 123456"
4. User enters OTP
5. OtpCode.find_by(phone, code, expires_at > now)
6. If valid: allow password reset
7. Mark used: true, delete after expiry (cleanup job)
8. Rate limit: Max 3 OTP requests/hour per phone
```

---

## Performance Considerations

### Caching Strategy
```
Level 1: HTTP Cache (Thruster)
  - Static assets (CSS, JS, images)
  - TTL: Long (1 year for fingerprinted assets)

Level 2: Redis Cache
  - User data (ratings, profile)
  - Query results (active rides)
  - Session store
  - TTL: 1 hour default

Level 3: Database
  - Primary queries (active rides)
  - Real-time data (ride_request_messages)
  - Transactions (ratings)
```

### Query Optimization
```ruby
# N+1 Prevention
# Bad
@conversations = Conversation.all
@conversations.each { |c| puts c.initiator.name }  # Query per conversation

# Good
@conversations = Conversation.includes(:initiator, :recipient)
@conversations.each { |c| puts c.initiator.name }  # Single query

# Scoping
scope :active, -> { where(status: :active).order(depart_at: :asc) }
@posts = Post.active.limit(20)  # Efficient query
```

### Background Jobs (Async via Sidekiq)
```
Sync (blocks user request):
  user.rides.destroy_all  → Takes 2s → User waits

Async (via Sidekiq):
  DeleteUserRidesJob.perform_later(user_id)
                         ↓
        Job queued in Redis
                         ↓
        Sidekiq worker thread picks up
                         ↓
        Runs async → User sees success immediately
```

---

## Monitoring & Observability

### Logs
```ruby
# Development: Console
Rails.logger.info "Message"  → Printed to STDOUT

# Production: Docker/Kamal
Rails.logger.info "Message"  → Written to STDOUT
                             → Docker captures to host logs
                             → View via: bin/kamal logs
                             → Can integrate with Datadog/ELK

# Datadog Integration (Phase 2)
Datadog.configure do |c|
  c.service = "roadmate"
  c.env = Rails.env
end
```

### Error Tracking
```ruby
# Sentry Integration (Future)
Sentry.init do |config|
  config.dsn = ENV["SENTRY_DSN"]
  config.environment = Rails.env
end

begin
  # Code
rescue StandardError => e
  Sentry.capture_exception(e)
end
```

### Health Check
```
GET /up → 200 OK if Rails boots
        → 500 if critical error

Used by:
- Load balancer (uptime monitoring)
- Kamal (deployment health checks)
- Monitoring tools (Datadog, New Relic)
```

---

## PWA Architecture (Phase 5)

### Web App Manifest
```json
// public/manifest.json
{
  "name": "RoadMate",
  "short_name": "RoadMate",
  "scope": "/",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1f2937",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Service Worker
```javascript
// app/views/pwa/service_worker.js.erb
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("v1").then((cache) => {
      return cache.addAll([
        "/",
        "/manifest.json",
        "/offline.html"
      ]);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

### Installation Flow
```
iOS:
  1. Open Safari → roadmate.example.com
  2. Share → Add to Home Screen
  3. Icon appears on home screen
  4. Tap → Opens as standalone app

Android:
  1. Open Chrome/Firefox
  2. Menu → Install app
  3. Icon appears on home screen
  4. Tap → Opens as standalone app
```

---

## Scaling Roadmap

### MVP (Current)
```
Single server, ~10k concurrent users
- 1 Puma instance
- Sidekiq worker (Redis queue)
- PostgreSQL (single)
- Redis (cache + session + job queue)
- Local/S3 storage (Active Storage)
```

### Phase 2 (1k+ daily active users)
```
Add replicas, monitoring
- Keep Puma single, upgrade CPU/RAM
- Sidekiq on same or separate server
- PostgreSQL read replicas
- S3/R2 for storage
- Datadog monitoring
```

### Phase 3 (10k+ daily active users)
```
Multi-server, load balancing
- Multiple Puma instances (Kamal + HAProxy/Nginx)
- Separate Sidekiq job server
- PostgreSQL primary + replicas
- Redis cluster
- CDN for static assets
- Dedicated monitoring/alerting
```

---

## Disaster Recovery

### Backup Strategy
```
Database:
  - Daily snapshots (Kamal volumes)
  - Store on separate machine
  - 30-day retention

Active Storage:
  - Automatic backup via S3/R2
  - Cross-region replication (R2)

Configuration:
  - Version control (git)
  - Secrets in .kamal/secrets
  - Encrypted backup
```

### Recovery Process
```
1. Stop current container (bin/kamal stop)
2. Restore database from backup
3. Restore files from S3/R2
4. Deploy code from git commit
5. Run migrations (if needed)
6. Start container (bin/kamal deploy)
7. Verify health check (/up)
```

---

## Summary

**RoadMate uses a deliberately simple, scalable architecture:**
- Full-stack Rails 8 (velocity over complexity)
- PostgreSQL (reliable RDBMS, future GIS support)
- Sidekiq + Redis (background jobs, cache, session store)
- Hotwire + Tailwind (real-time UX without SPA)
- Kamal or Render/Railway (Docker deployment, zero-downtime)
- Polling for chat (10s interval, Turbo Frames, not WebSocket)
- Progressive PWA (progressive enhancement)
- has_secure_password (bcrypt, no Devise complexity)

This design sacrifices some "cloud-native" patterns for **developer velocity and operational simplicity**, ideal for a solo-founder MVP.
