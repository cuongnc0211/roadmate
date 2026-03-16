# RoadMate — Carpooling Marketplace MVP

**Your companion on the road.** A marketplace connecting drivers and passengers on the Hà Nội ↔ Hoà Lạc corridor (~40km).

## Quick Start

### Prerequisites
- Ruby 3.3.5
- PostgreSQL 14+
- Redis 7+ (for Solid Queue and caching)
- Node.js 18+ (for importmap-rails and asset pipeline)

### Setup

```bash
# Clone and install dependencies
git clone <repo>
cd roadmate
bundle install

# Setup database
rails db:create db:migrate

# Start development server
./bin/dev
```

This starts:
- Puma web server on `http://localhost:3000`
- Solid Queue (background jobs) in-process
- Tailwind CSS watcher
- Asset pipeline watcher

### Environment Variables

Create `.env.local` (or set in your environment):

```bash
# Database
DATABASE_URL=postgres://user:password@localhost/roadmate_development

# Cache & Queue (optional, defaults to memory store)
REDIS_URL=redis://localhost:6379/0

# SMS (password reset via OTP)
SMS_PROVIDER=esms
ESMS_API_KEY=your_api_key
ESMS_SECRET_KEY=your_secret_key

# Rails
SECRET_KEY_BASE=<generated automatically in development>
RAILS_ENV=development
```

## Architecture

**Tech Stack:**
- **Backend**: Rails 8 (full-stack, not API mode)
- **View Layer**: ERB + Hotwire (Turbo Frames + Stimulus)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (4 separate DBs in production)
- **Background Jobs**: Solid Queue (runs in Puma process by default)
- **Asset Pipeline**: Propshaft + importmap-rails
- **Deploy**: Kamal (Docker)
- **PWA**: Manifest + Service Worker

See `/docs/system-architecture.md` for detailed diagrams.

## Project Structure

```
app/
├── models/           # Domain models (User, Post, Conversation, Message, Rating, OtpCode)
├── controllers/      # Thin controllers delegating to services
├── views/            # ERB templates + Turbo Frames
├── assets/           # CSS (Tailwind), JS (Stimulus)
├── jobs/             # Solid Queue background jobs
├── mailers/          # Email/SMS handlers
├── services/         # Complex business logic (for phase 2+)

config/
├── routes.rb         # RESTful routing
├── database.yml      # DB connection (4 databases in prod)
├── deploy.yml        # Kamal deployment config
└── environments/     # Rails env configs

db/
├── migrate/          # Database migrations (per phase)
├── seeds.rb          # Initial seed data
└── {cache,queue,cable}_schema.rb  # Solid* schemas

docs/                 # Project documentation
└── ...
```

## Development Workflow

### Creating a Feature

1. Read `/docs/code-standards.md` for naming and patterns
2. Create database migration: `rails generate migration CreateTableName`
3. Implement model with validations and enums
4. Create controller actions (RESTful)
5. Build views (ERB + Tailwind)
6. Add Stimulus JavaScript if needed
7. Test manually (no automated tests at MVP stage)

### Running Tests (when added)

```bash
# Run all tests
bundle exec rspec

# Run specific spec file
bundle exec rspec spec/models/user_spec.rb
```

### Linting & Security

```bash
# Lint and format
bundle exec rubocop -A

# Security checks
bundle exec brakeman
bundle exec bundler-audit
```

## Key Business Logic

### Authentication
- Phone + password login (no email)
- Session: 60-day cookie persistence
- Password reset: SMS OTP (ESMS provider)

### Posts (Offers/Requests)
- Auto-expire after 24 hours
- Recurring posts: Auto-recreate daily based on `recurring_days`
- Filter by district, time, vehicle type

### Contact Reveal & Rating
- Clicking "Liên hệ" creates Conversation and reveals phone + Zalo
- Rating requires existing conversation (unique per rater/ratee pair)
- Avg rating shown only when `rating_count >= 3`

### Chat (No WebSocket)
- Uses Turbo Frames + Stimulus polling (10s intervals)
- Mark messages as read on view

See `/docs/project-overview-pdr.md` for full business rules.

## Database Schema

**Models (planned):**
- `User`: phone, password_digest, name, avatar_url, zalo_link, vehicle_type, vehicle_plate, available_seats, avg_rating, rating_count
- `Post`: user_id, post_type, vehicle_type, origin, destination, origin_district, dest_district, depart_at, price_suggestion, seats_available, status, recurring, recurring_days, note
- `Conversation`: post_id, initiator_id, recipient_id, status
- `Message`: conversation_id, sender_id, body, read
- `Rating`: conversation_id, rater_id, ratee_id, score (1-5), comment
- `OtpCode`: phone, code, expires_at, used (for password reset)

See `/docs/codebase-summary.md` for current schema state.

## Deployment

### Local Build & Run

```bash
docker build -t roadmate .
docker run -it -p 3000:80 \
  -e RAILS_MASTER_KEY=$(cat config/master.key) \
  -e DATABASE_URL=postgres://user:pass@host/db \
  roadmate
```

### Deploy with Kamal

```bash
# Prerequisites
gem install kamal

# Configure deploy server in config/deploy.yml

# Deploy
bin/kamal deploy

# View logs
bin/kamal logs

# SSH into app
bin/kamal app shell
```

See `/docs/deployment-guide.md` for full Kamal setup.

## Conventions

- **Models/Classes**: English, singular (User, Post)
- **Routes**: RESTful, English
- **Naming**: snake_case for methods/variables, PascalCase for classes
- **Money**: Integer (VNĐ), formatted as "50.000đ" in UI
- **Phone**: Normalized to +84xxxxxxxxx or 0xx format
- **Time**: UTC in DB, UTC+7 for display
- **Images**: Active Storage (local in dev, S3/R2 in prod)

## Links

- **Implementation Priority**: `/docs/project-roadmap.md`
- **Code Standards**: `/docs/code-standards.md`
- **System Architecture**: `/docs/system-architecture.md`
- **Deployment Guide**: `/docs/deployment-guide.md`
- **Project Overview & PDR**: `/docs/project-overview-pdr.md`
- **Codebase Summary**: `/docs/codebase-summary.md`

## Support

For questions on implementation, see the corresponding docs file. For new features not in the roadmap, file an issue.

**Solo founder**: Cuong Nguyen | Built with Rails 8 + Hotwire + Tailwind
