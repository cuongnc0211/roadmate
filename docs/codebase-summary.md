# RoadMate — Codebase Summary

## Current State (Early MVP)

**Initialized**: Rails 8.1.1 with standard scaffolding
**Models**: Only `ApplicationRecord` (no domain models yet)
**Controllers**: Only `ApplicationController` (no domain controllers yet)
**Views**: Only layout templates (no feature views yet)
**Routes**: Only health check (`/up`)
**Database**: Schema empty (ready for User, Ride, RideRequest, RideRequestMessage, Rating, OtpCode)
**Jobs**: No domain jobs yet (Sidekiq infrastructure ready)

This is a clean slate ready for Phase 1 (Auth) implementation.

---

## Directory Structure

```
roadmate/
├── app/
│   ├── assets/
│   │   ├── images/              # Logo, icons, etc.
│   │   ├── stylesheets/
│   │   │   └── application.tailwind.css  # Tailwind directives
│   │   └── config/
│   │       └── manifest.js      # Importmap manifest (auto-generated)
│   │
│   ├── controllers/
│   │   └── application_controller.rb    # Base controller (allow_browser: modern only)
│   │
│   ├── helpers/
│   │   └── application_helper.rb        # View helpers (empty)
│   │
│   ├── javascript/
│   │   ├── application.js       # Main entry point (importmap)
│   │   └── controllers/         # Stimulus controllers directory (empty)
│   │
│   ├── jobs/
│   │   └── application_job.rb   # Base job class (Solid Queue)
│   │
│   ├── mailers/
│   │   └── application_mailer.rb # Base mailer (no SendGrid yet)
│   │
│   ├── models/
│   │   └── application_record.rb # Base AR class (primary_abstract_class)
│   │
│   └── views/
│       ├── layouts/
│       │   ├── application.html.erb
│       │   ├── mailer.html.erb
│       │   └── mailer.text.erb
│       └── pwa/                 # PWA manifest + service worker (not routed yet)
│           ├── manifest.json.erb
│           └── service-worker.js.erb
│
├── config/
│   ├── routes.rb                # Currently only /up route
│   ├── database.yml             # 4 DBs in prod (primary, cache, queue, cable)
│   ├── storage.yml              # Active Storage (local dev, S3 prod)
│   ├── cable.yml                # Solid Cable adapter
│   ├── cache.yml                # Solid Cache adapter
│   ├── queue.yml                # Solid Queue adapter
│   ├── deploy.yml               # Kamal deployment config
│   ├── environments/
│   │   ├── development.rb       # Dev settings (eager loading, caching off)
│   │   ├── production.rb        # Prod settings (logging, SSL, CDN)
│   │   └── test.rb              # Test settings
│   └── locales/
│       └── en.yml               # i18n (English only for now)
│
├── db/
│   ├── migrate/                 # Migrations (empty, will grow per phase)
│   ├── cache_migrate/           # Solid Cache migrations
│   ├── queue_migrate/           # Solid Queue migrations
│   ├── cable_migrate/           # Solid Cable migrations
│   ├── seeds.rb                 # Seed data (empty)
│   ├── schema.rb                # Auto-generated schema (empty)
│   ├── cache_schema.rb          # Solid Cache schema (auto)
│   ├── queue_schema.rb          # Solid Queue schema (auto)
│   └── cable_schema.rb          # Solid Cable schema (auto)
│
├── public/
│   ├── 404.html, 500.html       # Error pages
│   └── robots.txt               # SEO
│
├── lib/
│   └── tasks/                   # Custom Rake tasks (empty)
│
├── script/
│   └── docker-entrypoint        # Docker startup hook
│
├── .kamal/
│   ├── secrets                  # Kamal secrets (not in git)
│   └── hooks/                   # Pre/post-deploy scripts
│
├── Dockerfile                   # Multi-stage Docker build
├── Gemfile, Gemfile.lock        # Dependencies (42 gems)
├── Procfile.dev                 # Foreman dev processes
├── .ruby-version                # Ruby 3.3.5
├── .rubocop.yml                 # Linter config (omakase)
├── Rakefile                     # Rails tasks
├── config.ru                    # Rack config
└── README.md                    # Project overview
```

---

## Key Files Explained

### `config/database.yml`
Defines 4 PostgreSQL databases in production (separate for data durability):
- **primary**: Main app data (users, posts, conversations, messages, ratings)
- **cache**: Solid Cache tables (Rails.cache backend)
- **queue**: Solid Queue tables (job storage)
- **cable**: Solid Cable tables (Action Cable state, not used yet)

Development uses single `roadmate_development` database.

### `config/deploy.yml`
Kamal Docker deployment config:
- **Service**: roadmate
- **Registry**: localhost:5555 (local Docker registry, change for production)
- **Server**: 192.168.0.1 (placeholder, update with actual IP)
- **Env vars**: RAILS_MASTER_KEY, SOLID_QUEUE_IN_PUMA (run jobs in Puma process)
- **Volumes**: roadmate_storage (Active Storage files, database backups)
- **Builder**: amd64 architecture

### `Gemfile`
Key gems for MVP:
- **rails 8.1.1**: Full-stack framework
- **pg**: PostgreSQL adapter
- **puma**: Web server
- **turbo-rails**: Hotwire for real-time UI (AJAX forms, Turbo Frames)
- **stimulus-rails**: Lightweight JS framework for interactivity
- **tailwindcss-rails**: Tailwind CSS (no config needed, auto)
- **importmap-rails**: Zero-config JS modules (no bundler)
- **jbuilder**: JSON serialization (for future APIs)
- **solid_cache, solid_queue, solid_cable**: Rails-provided adapters (no Redis required)
- **kamal, thruster**: Docker deploy + HTTP caching
- **image_processing**: Active Storage variant processing
- **brakeman, bundler-audit, rubocop**: Security & style (dev only)

### `app/views/layouts/application.html.erb`
Master layout template:
- Rails csrf tokens + session cookies
- Asset tags (CSS from Tailwind, JS from importmap)
- PWA manifest link (commented out, enable in Phase 5)
- `yield` for content

### `.kamal/secrets` (Not in Git)
Stores production secrets:
```
RAILS_MASTER_KEY=<generated>
KAMAL_REGISTRY_PASSWORD=<docker-registry-auth>
```

---

## Database Schema (Planned, Not Yet Migrated)

### Users Table
```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  phone VARCHAR NOT NULL UNIQUE,        -- +84xxxxxxxxx format
  password_digest VARCHAR NOT NULL,     -- bcrypt hash
  name VARCHAR NOT NULL,
  avatar_url VARCHAR,                   -- Active Storage URL
  zalo_link VARCHAR,                    -- https://zalo.me/...
  vehicle_type INTEGER DEFAULT 0,       -- enum: 0=none, 1=motorbike, 2=car
  vehicle_plate VARCHAR,                -- "30A-12345"
  available_seats INTEGER,              -- null if no vehicle
  avg_rating FLOAT DEFAULT 0,           -- average score (updated on each rating)
  rating_count INTEGER DEFAULT 0,       -- number of ratings
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
CREATE INDEX ON users (phone);
CREATE INDEX ON users (rating_count);  -- for "min 3 ratings" query
```

### Rides Table
```sql
CREATE TABLE rides (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL,              -- FK to users
  ride_type INTEGER NOT NULL,           -- enum: 0=offer (driver), 1=request (passenger)
  vehicle_type INTEGER NOT NULL,        -- enum: 0=motorbike, 1=car, 2=any
  origin VARCHAR NOT NULL,              -- "Hà Nội, Đống Đa" (text)
  destination VARCHAR NOT NULL,         -- "Hoà Lạc, Hà Nội" (text)
  origin_district VARCHAR NOT NULL,     -- "Đống Đa" (for filtering)
  dest_district VARCHAR NOT NULL,       -- "Hoà Lạc"
  depart_at TIMESTAMP NOT NULL,         -- UTC time
  price_suggestion INTEGER,             -- VNĐ, nullable
  seats_available INTEGER,              -- for offers only, nullable
  status INTEGER DEFAULT 0,             -- enum: 0=active, 1=matched, 2=full, 3=expired, 4=cancelled
  recurring BOOLEAN DEFAULT false,
  recurring_days VARCHAR,               -- "1,2,3,4,5" = Mon-Fri
  note TEXT,                            -- "Gặp tại Thống Nhất, +84123456789"
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
CREATE INDEX ON rides (user_id);
CREATE INDEX ON rides (status, depart_at);  -- for active rides query
CREATE INDEX ON rides (origin_district, dest_district);  -- for feed filtering
CREATE INDEX ON rides (ride_type);
```

### RideRequests Table
```sql
CREATE TABLE ride_requests (
  id BIGINT PRIMARY KEY,
  ride_id BIGINT NOT NULL,              -- FK to rides
  requester_id BIGINT NOT NULL,         -- FK to users (who initiated)
  direction INTEGER NOT NULL,           -- enum: 0=booking, 1=offer
  status INTEGER DEFAULT 0,             -- enum: 0=pending, 1=accepted, 2=declined, 3=cancelled
  seats INTEGER DEFAULT 1,              -- number of seats (booking)
  price INTEGER,                        -- negotiated price (VNĐ)
  note TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
CREATE UNIQUE INDEX ON ride_requests (ride_id, requester_id);  -- prevent duplicates
CREATE INDEX ON ride_requests (requester_id);
CREATE INDEX ON ride_requests (status);
```

### RideRequestMessages Table
```sql
CREATE TABLE ride_request_messages (
  id BIGINT PRIMARY KEY,
  ride_request_id BIGINT NOT NULL,     -- FK to ride_requests
  sender_id BIGINT NOT NULL,            -- FK to users
  body TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
CREATE INDEX ON ride_request_messages (ride_request_id, created_at);  -- for history
CREATE INDEX ON ride_request_messages (sender_id);
```

### Ratings Table
```sql
CREATE TABLE ratings (
  id BIGINT PRIMARY KEY,
  ride_request_id BIGINT NOT NULL,     -- FK to ride_requests
  rater_id BIGINT NOT NULL,             -- FK to users (who leaves rating)
  ratee_id BIGINT NOT NULL,             -- FK to users (who is rated)
  score INTEGER NOT NULL,               -- 1-5
  comment TEXT,                         -- optional review
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
CREATE UNIQUE INDEX ON ratings (ride_request_id, rater_id);  -- one rating per rater/request
CREATE INDEX ON ratings (ratee_id);
```

### OtpCodes Table (Password Reset Only)
```sql
CREATE TABLE otp_codes (
  id BIGINT PRIMARY KEY,
  phone VARCHAR NOT NULL,               -- +84xxxxxxxxx
  code VARCHAR NOT NULL,                -- "123456" (6 digits)
  expires_at TIMESTAMP NOT NULL,        -- 10 min from creation
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP
);
CREATE INDEX ON otp_codes (phone, expires_at);  -- for cleanup job
```

---

## Enums (ActiveRecord)

Defined in models (will be created in Phase 1+):

```ruby
# User#vehicle_type
enum vehicle_type: { none: 0, motorbike: 1, car: 2 }

# Ride#ride_type
enum ride_type: { offer: 0, request: 1 }

# Ride#vehicle_type (independent from User#vehicle_type)
enum vehicle_type: { motorbike: 0, car: 1, any: 2 }

# Ride#status (5 states)
enum status: { active: 0, matched: 1, full: 2, expired: 3, cancelled: 4 }

# RideRequest#direction (who initiated)
enum direction: { booking: 0, offer: 1 }

# RideRequest#status
enum status: { pending: 0, accepted: 1, declined: 2, cancelled: 3 }
```

---

## Asset Pipeline & JavaScript

### Propshaft (Asset Pipeline)
- **Input**: `app/assets/stylesheets/`, `app/assets/images/`
- **Output**: `public/assets/` (fingerprinted, cached)
- **Dev**: Auto-refresh on file change
- **Prod**: Precompiled during Docker build

### Tailwind CSS
- **Config**: Auto-generated by `tailwindcss-rails`
- **Input**: `app/assets/stylesheets/application.tailwind.css`
- **Output**: Embedded in CSS bundle
- **No configuration needed** — Tailwind scans app/ for class names

### Importmap & JavaScript
- **Method**: ES modules without bundler
- **Manifest**: `config/importmap.rb` (auto-managed)
- **Entry**: `app/javascript/application.js`
- **Stimulus**: Auto-loads controllers from `app/javascript/controllers/`
- **No build step** — faster dev iteration

---

## Development Workflow

### Running Locally
```bash
./bin/dev                    # Starts Puma, Solid Queue, Tailwind watcher (Procfile.dev)
```

### Creating a Model
```bash
rails generate model User phone:string password_digest:string name:string
# Creates: app/models/user.rb, db/migrate/YYYYMMDDHHMMSS_create_users.rb

rails db:migrate             # Run migration
```

### Creating a Controller & Views
```bash
rails generate controller Posts index show create edit
# Creates: app/controllers/posts_controller.rb, app/views/posts/, routes

# Routes auto-added (or update config/routes.rb manually)
```

### Adding a Stimulus Component
```bash
# Create: app/javascript/controllers/form_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    console.log("Form controller loaded")
  }
}

# In view:
<div data-controller="form">
  <!-- Component content -->
</div>
```

### Running Tests (When Added)
```bash
bundle exec rspec spec/models/user_spec.rb
bundle exec rspec                            # All tests
```

---

## Configuration Files

### `config/environments/production.rb`
Key settings:
- `config.assume_ssl = true` (require HTTPS)
- `config.force_ssl = true` (redirect HTTP → HTTPS)
- `config.active_storage.service = :amazon` (S3/R2 for production)
- `config.log_to_stdout = true` (Docker logging)
- Caching enabled, eager loading enabled

### `config/sidekiq.yml`
Sidekiq (background jobs):
- Adapter: Redis
- Concurrency: 3 (configurable)
- Timeout: 25 seconds
- Queues: default, critical

### `.rubocop.yml`
Linting config (Rails Omakase defaults):
- No custom rules, follows Rails conventions
- Run: `bundle exec rubocop -A` (auto-fix)

---

## Deployment Architecture

### Development
- Rails server on `http://localhost:3000`
- SQLite or PostgreSQL (configurable)
- Solid Queue runs in Puma process
- Emails logged to console

### Production (Kamal)
```
┌─────────────────────────────────────┐
│ Server (192.168.0.1)                │
├─────────────────────────────────────┤
│ Container: roadmate                 │
│  - Puma web server (port 80)        │
│  - Solid Queue in-puma              │
│  - Thruster (HTTP caching)          │
├─────────────────────────────────────┤
│ Volumes:                            │
│  - roadmate_storage (Active Store)  │
│  - PostgreSQL data (external)       │
└─────────────────────────────────────┘
```

---

## Security Checklist

- [x] `has_secure_password` for bcrypt hashing
- [x] CSRF tokens on all forms
- [x] HTTPS redirects in production
- [x] Strong Parameters (controller input validation)
- [x] SQL injection prevention (parameterized queries)
- [x] XSS protection (ERB auto-escaping)
- [x] Rate limiting (OTP: 3/hour per phone)
- [x] Phone normalization (+84 format)
- [ ] Add Brakeman scanning to CI
- [ ] Add bundler-audit scanning to CI

---

## Next Steps (Phase 1)

1. Create User model with validations
2. Implement phone + password auth (SessionsController)
3. Add OTP model + SMS sending (ESMS integration)
4. Create Profile edit view
5. Test auth flow manually
6. Commit & merge to main

See `/docs/project-roadmap.md` for full timeline.

---

## Useful Links

- Rails 8 Guides: https://guides.rubyonrails.org
- Hotwire Docs: https://hotwired.dev
- Tailwind CSS: https://tailwindcss.com
- Kamal Deploy: https://kamal-deploy.org
- Solid Queue: https://github.com/rails/solid_queue
- Importmap: https://github.com/rails/importmap-rails
