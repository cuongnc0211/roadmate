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
│  │  │  User, Post, Conversation, Message, Rating      │ │  │
│  │  │  with validations, associations, enums          │ │  │
│  │  └──────────────────────────────────────────────────┘ │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────────┐ │  │
│  │  │   Background Jobs (Solid Queue, In-Puma)        │ │  │
│  │  │  - PostExpiryJob (hourly)                        │ │  │
│  │  │  - RecurringPostCreatorJob (hourly)              │ │  │
│  │  │  - OtpCodeCleanupJob (hourly)                    │ │  │
│  │  │  - SmsNotifierJob (on-demand)                    │ │  │
│  │  └──────────────────────────────────────────────────┘ │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────────┐ │  │
│  │  │         Services (Business Logic)                │ │  │
│  │  │  - UserAuthenticator                             │ │  │
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
│  │  │    Cache Layer (Solid Cache + Redis)             │ │  │
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
        │   (Primary DB)   │        │   (Cache/Queue) │
        └────────┬─────────┘        └────────┬────────┘
                 │                          │
        ┌────────▼──────────┐        ┌──────▼─────────┐
        │ Solid Queue DB    │        │  Solid Cache   │
        │ (Job persistence) │        │     DB         │
        └────────┬──────────┘        └────────────────┘
                 │
        ┌────────▼──────────┐
        │ Solid Cable DB    │
        │  (future use)     │
        └───────────────────┘
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
- `solid_queue`: Background jobs (database-backed, no Redis needed)
- `solid_cache`: Caching (database-backed or Redis)
- `solid_cable`: Action Cable backend (future use, not MVP)

### Database: PostgreSQL (Multiple Databases in Production)

**Development:**
- Single database: `roadmate_development`
- Simpler setup, faster iteration

**Production (4 Separate Databases):**
```
1. Primary (roadmate_production)
   - User data, posts, conversations, messages, ratings
   - Main application data

2. Cache (roadmate_production_cache)
   - Session store, rate-limiting buckets, query cache
   - Solid Cache tables (SolidCache::Entry)
   - Can be flushed without losing app data

3. Queue (roadmate_production_queue)
   - Job storage (Solid Queue)
   - Can be separately scaled/monitored

4. Cable (roadmate_production_cable)
   - Action Cable state (if WebSocket added later)
   - Separate DB for isolation
```

**Rationale:**
- **Resilience**: Cache DB issues don't affect app data
- **Performance**: Separate connections prevent contention
- **Maintenance**: Can backup/replicate only primary DB
- **Scaling**: Queue DB can handle concurrent job writes separately

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

### Background Jobs: Solid Queue (In-Puma)
**Development & MVP:**
```
Job scheduler → Solid Queue (Database) → Puma Worker Thread
                   ↑
             db/queue_schema.rb
```

**Production (Single Server):**
```
# config/deploy.yml
env:
  clear:
    SOLID_QUEUE_IN_PUMA: true  # Run jobs in Puma process
```

**Future (Multi-Server):**
```
# Separate job server
servers:
  job:
    hosts:
      - 192.168.0.2
    cmd: bin/jobs  # Dedicated job processor
```

### Caching Strategy: Solid Cache + Redis (Optional)
**MVP (In-Memory):**
```ruby
# config/environments/development.rb
config.cache_store = :memory_store
```

**Production (Database-Backed):**
```ruby
# config/environments/production.rb
config.cache_store = :solid_cache_store  # Uses separate cache DB
```

**With Redis (Optional, for higher throughput):**
```ruby
config.cache_store = :redis_cache_store, { url: ENV["REDIS_URL"] }
```

### Deployment: Kamal (Docker)
**Why Kamal?**
- Built by Basecamp, integrated with Rails
- Single-server deployment (no Kubernetes complexity)
- Automatic zero-downtime deploys
- Built-in logging, monitoring hooks

**Architecture:**
```
Developer (bin/kamal deploy)
            ↓
    Build Docker image (Dockerfile)
            ↓
    Push to registry (localhost:5555 → production registry)
            ↓
    SSH into 192.168.0.1
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
│  User Registration                      │
└──────────────────┬──────────────────────┘
                   │
         POST /users/new
                   │
        ┌──────────▼───────────┐
        │ UsersController#new  │
        │ - Render form        │
        └──────────────────────┘
                   │
         User fills: phone + password
                   │
        ┌──────────▼─────────────────┐
        │ UsersController#create     │
        │ - Validate params          │
        │ - Normalize phone          │
        │ - Create User record       │
        │ - Set session[:user_id]    │
        │ - Redirect to profile      │
        └──────────────────────────┘
                   │
        ┌──────────▼──────────┐
        │ User Model          │
        │ - has_secure_password
        │ - bcrypt hashing    │
        └──────────────────────┘
                   │
        ┌──────────▼──────────────┐
        │ PostgreSQL (Primary DB) │
        │ INSERT into users       │
        └─────────────────────────┘
                   │
        Session stored in:
        - Solid Cache DB (or Redis)
        - OR browser cookie (encrypted)
```

### 2. Creating a Post (Offer/Request)

```
┌─────────────────────────────────────┐
│ Driver/Passenger: Create Post       │
└─────────────────┬───────────────────┘
                  │
        GET /posts/new?type=offer
                  │
        ┌─────────▼────────────┐
        │ PostsController#new  │
        │ - Build @post        │
        │ - Render form        │
        └──────────────────────┘
                  │
     User fills: route, time, price, seats
                  │
        ┌─────────▼────────────────────┐
        │ PostsController#create       │
        │ - Validate post_params       │
        │ - Set user_id = current_user │
        │ - Save Post                  │
        └──────────────────┬───────────┘
                           │
        ┌──────────────────▼──────────────┐
        │ Post Model Validations         │
        │ - Presence: user, route, time  │
        │ - Format: phone, enums         │
        │ - Comparison: time > now       │
        └──────────────────┬──────────────┘
                           │
        ┌──────────────────▼──────────────┐
        │ PostgreSQL (Primary DB)        │
        │ INSERT into posts              │
        │ ├─ user_id                     │
        │ ├─ origin, destination         │
        │ ├─ depart_at                   │
        │ ├─ post_type, vehicle_type     │
        │ ├─ status = active             │
        │ └─ created_at = now            │
        └──────────────────┬──────────────┘
                           │
        Redirect to post#show
                           │
        ┌──────────────────▼──────────────┐
        │ Solid Queue Job (hourly)       │
        │ PostExpiryJob                  │
        │ - Find posts created > 24h ago │
        │ - UPDATE status = expired      │
        └────────────────────────────────┘
```

### 3. Contact & Conversation Flow

```
┌──────────────────────────────────────┐
│ Passenger clicks "Liên hệ"           │
│ on Driver's Post                     │
└────────────────┬─────────────────────┘
                 │
       POST /posts/:id/contact
                 │
        ┌────────▼─────────────┐
        │ PostsController#     │
        │ contact              │
        │ - Check: not own post│
        │ - Create Conversation
        └────────┬─────────────┘
                 │
        ┌────────▼──────────────────┐
        │ ConversationInitiator     │
        │ Service Object            │
        │ - Validate user != post.  │
        │   user                    │
        │ - find_or_create_by:      │
        │   post_id, initiator_id   │
        │ - UNIQUE constraint       │
        └────────┬──────────────────┘
                 │
        ┌────────▼──────────────────────┐
        │ PostgreSQL (Primary DB)      │
        │ INSERT into conversations    │
        │ ├─ post_id = driver's post   │
        │ ├─ initiator_id = passenger  │
        │ ├─ recipient_id = driver     │
        │ └─ status = active           │
        └────────┬──────────────────────┘
                 │
        ┌────────▼─────────────────┐
        │ Redirect to conversation  │
        │ show page                 │
        │ - Display driver's phone  │
        │ - Display driver's Zalo   │
        │ - Open message form       │
        └──────────────────────────┘
```

### 4. Chat (Polling via Stimulus)

```
┌────────────────────────────────────┐
│ User types message & submits       │
└──────────┬───────────────────────┘
           │
    POST /conversations/:id/messages
           │
    ┌──────▼──────────────────┐
    │ MessagesController#     │
    │ create                  │
    │ - message_params        │
    │ - Save Message          │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────────────┐
    │ PostgreSQL (Primary DB)        │
    │ INSERT into messages           │
    │ ├─ conversation_id             │
    │ ├─ sender_id = current_user    │
    │ ├─ body                        │
    │ └─ read = false                │
    └──────┬───────────────────────┘
           │
    ┌──────▼────────────────────┐
    │ Respond with updated HTML │
    │ (Turbo Frame or full page)│
    └──────┬───────────────────┘
           │
┌──────────▼──────────────────────────┐
│ Stimulus Polling (messagePoll      │
│ controller)                         │
│ - Interval: 10 seconds              │
│ - GET /messages?conversation_id=:id│
│ - Fetch latest messages             │
│ - Update DOM (Turbo)                │
│ - Scroll to bottom                  │
└─────────────────────────────────────┘
```

### 5. Rating Flow

```
┌────────────────────────────────────┐
│ After trip: User clicks Rate       │
└──────────┬───────────────────────┘
           │
    GET /ratings/new?
         conversation_id=:id
           │
    ┌──────▼──────────────┐
    │ RatingsController#  │
    │ new                 │
    │ - Show form         │
    └──────┬──────────────┘
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
    │ ├─ conversation_id           │
    │ ├─ rater_id                  │
    │ ├─ ratee_id                  │
    │ ├─ score                     │
    │ └─ UNIQUE(conversation_id,   │
    │       rater_id)              │
    └──────┬───────────────────────┘
           │
    ┌──────▼─────────────────────────┐
    │ RatingCalculator Service       │
    │ - Find ratee (target user)     │
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
  primary: &primary_production
    adapter: postgresql
    max_connections: 25      # Total pool size

  cache:
    <<: *primary_production  # Same pool config
    database: roadmate_production_cache

  queue:
    <<: *primary_production  # Separate pool
    database: roadmate_production_queue

  cable:
    <<: *primary_production
    database: roadmate_production_cable
```

**Connection Flow:**
```
Puma (5 threads) → 25 pool connections
                   ├─ Primary DB (15 connections)
                   ├─ Cache DB (5 connections)
                   ├─ Queue DB (3 connections)
                   └─ Cable DB (2 connections)
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

### Password Security
```
User Input: "MyP@ssw0rd"
    ↓
has_secure_password (BCrypt)
    ↓
Hashed: "$2b$12$abcd...efgh" (60 chars)
    ↓
Stored in users.password_digest (VARCHAR)
    ↓
On Login:
    ↓
BCrypt::Password.new(stored_hash) == input
    ↓
Time-constant comparison (resistant to timing attacks)
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

Level 2: Rails Cache (Solid Cache DB or Redis)
  - User data (ratings, profile)
  - Query results (trending posts)
  - Session store
  - TTL: 1 hour default

Level 3: Database
  - Primary queries (active posts)
  - Real-time data (messages)
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

### Background Jobs (Async)
```
Sync (blocks user request):
  user.posts.destroy_all  → Takes 2s → User waits

Async (via Solid Queue):
  DeleteUserPostsJob.perform_later(user_id)
                         ↓
        Job queued in Queue DB
                         ↓
        Puma worker thread picks up
                         ↓
        Runs async → User sees success immediately
```

---

## Monitoring & Observability

### Logs
```ruby
# Development: Console
Rails.logger.info "Message"  → Printed to STDOUT

# Production: Docker
Rails.logger.info "Message"  → Written to STDOUT
                             → Docker captures to host logs
                             → Can integrate with Datadog/ELK

# Datadog Integration (Phase 2)
config.logger = Logger.new($stdout)
config.logger.extend ActiveSupport::Logger.broadcast(
  Datadog::Tracing.trace("rails.action_controller")
)
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
- Solid Queue in-process
- PostgreSQL (single)
- Local storage (Active Storage)
```

### Phase 2 (1k+ daily active users)
```
Add Redis, replicas
- Keep Puma single, upgrade CPU/RAM
- Redis for caching + session store
- PostgreSQL read replicas
- S3/R2 for storage
- Datadog monitoring
```

### Phase 3 (10k+ daily active users)
```
Multi-server, load balancing
- Multiple Puma instances (Kamal + HAProxy/Nginx)
- Separate job server (Solid Queue)
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
- Full-stack Rails (velocity over complexity)
- PostgreSQL (reliable RDBMS, future GIS support)
- Solid Queue (no external dependencies at MVP)
- Hotwire + Tailwind (real-time UX without SPA)
- Kamal (Docker deployment, zero-downtime)
- Polling for chat (not WebSocket)
- Progressive PWA (progressive enhancement)

This design sacrifices some "cloud-native" patterns for **developer velocity and operational simplicity**, ideal for a solo-founder MVP.
