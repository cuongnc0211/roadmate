# RoadMate Documentation Index

Welcome to the RoadMate documentation. This is your central hub for understanding the project.

## Getting Started (New Developer?)

**Start here:**
1. Read [`../README.md`](../README.md) — 5-minute quick start
2. Run `./bin/dev` in project root
3. Read `project-overview-pdr.md` — understand what RoadMate does

## Core Documentation Files

### 1. Project Overview & Requirements
**File**: `project-overview-pdr.md` (361 lines)

What this project is, who it's for, and what success looks like.

**Contains:**
- Business problem & market opportunity
- Target users & personas
- MVP scope (in/out of scope)
- Success criteria & KPIs
- Risk mitigation strategies
- Go-to-market plan

**Read if you:**
- Are new to the project
- Need to understand business logic
- Want to see success metrics
- Are considering pivots/feature requests

---

### 2. Current Codebase State
**File**: `codebase-summary.md` (454 lines)

Where we are right now, what exists, what's planned.

**Contains:**
- Current status (Rails 8 initialized)
- Directory structure & file organization
- Database schema (all 6 planned tables with DDL)
- Key configuration files explained
- Development workflow commands
- Security audit checklist

**Read if you:**
- Are implementing Phase 1 features
- Need to understand the database structure
- Want to know what files exist
- Are reviewing code organization

---

### 3. Code Standards & Conventions
**File**: `code-standards.md` (781 lines)

How to write code that fits the project.

**Contains:**
- Naming conventions (models, methods, files)
- Model patterns (associations, validations, enums)
- Controller patterns (RESTful, auth, authorization)
- View layer (ERB, Turbo, Stimulus)
- JavaScript & Stimulus examples
- Security best practices (10+ patterns)
- Performance considerations
- Testing strategies
- File organization rules

**Read if you:**
- Are writing code for this project
- Need to understand naming conventions
- Want security best practices
- Are creating a new model/controller

**Use as**: Reference during code reviews

---

### 4. System Architecture
**File**: `system-architecture.md` (823 lines)

How the system is designed and how data flows.

**Contains:**
- High-level architecture diagram
- Technology stack & rationale
- Data flow diagrams (5 core user flows):
  - User registration & login
  - Creating a post
  - Contact & conversation
  - Chat (polling)
  - Rating system
- Database architecture (4 separate DBs)
- Security architecture (sessions, passwords, OTP)
- Performance considerations (caching, queries)
- Monitoring & observability
- PWA architecture
- Scaling roadmap

**Read if you:**
- Need to understand how the system works end-to-end
- Are designing new features
- Want to know about data flows
- Are debugging a complex issue
- Need to understand the deployment architecture

**Use as**: Reference for architecture questions

---

### 5. Implementation Roadmap
**File**: `project-roadmap.md` (482 lines)

What's being built, when, and in what order.

**Contains:**
- 6 implementation phases (Weeks 1-8+)
- Per-phase breakdown (features, database, views, controllers, jobs, tests, exit criteria)
- Timeline & milestones
- Priority features vs nice-to-have
- Technical constraints & assumptions
- Risk mitigation strategies
- Success metrics & KPIs
- Future roadmap (Phase 2-4)
- Decision log (why Rails, polling, etc.)

**Read if you:**
- Are planning Phase 1 implementation
- Need to understand the timeline
- Want to know exit criteria for a phase
- Need to understand project priorities
- Are considering scope changes

**Phases:**
1. **Auth & Profile** (Weeks 1-2) — Users can login, edit profile
2. **Posts & Feed** (Weeks 3-4) — Create/browse posts
3. **Contact & Chat** (Weeks 5-6) — Message each other
4. **Rating** (Week 7) — Rate after conversation
5. **PWA & Polish** (Week 8) — Recurring posts, install app
6. **Monitoring** (Weeks 9+) — Health checks, launch

---

### 6. Deployment Guide
**File**: `deployment-guide.md` (751 lines)

How to set up development, build for production, and deploy.

**Contains:**
- Local development setup (macOS, Linux)
- Environment variables
- Docker build process
- Kamal deployment (Kubernetes-light)
- Database setup (PostgreSQL, 4 DBs)
- Active Storage (local dev, S3/R2 prod)
- SSL/TLS (Let's Encrypt)
- Monitoring & logging
- Performance tuning
- Security checklist
- Troubleshooting
- Maintenance tasks
- Cost estimation ($40-70/month MVP)

**Read if you:**
- Are setting up local development
- Need to deploy to production
- Are troubleshooting deployment issues
- Want to understand infrastructure
- Need to set up monitoring

**Quick commands:**
- **Develop**: `./bin/dev`
- **Deploy**: `bin/kamal deploy`
- **Logs**: `bin/kamal logs -f`
- **Build**: `docker build -t roadmate .`

---

## Quick Reference

### Database Schema (Ready for Migration)

| Table | Columns | Purpose |
|-------|---------|---------|
| `users` | 8 | User accounts, profiles, ratings |
| `posts` | 13 | Ride offers/requests with details |
| `conversations` | 4 | Chat threads between users |
| `messages` | 4 | Messages within conversations |
| `ratings` | 5 | User ratings/reviews |
| `otp_codes` | 4 | Password reset OTP codes |

**Total**: 40+ columns, 10+ indexes, security constraints

---

### Tech Stack

```
Frontend:  ERB + Hotwire (Turbo + Stimulus) + Tailwind CSS
Backend:   Rails 8.1.1 (full-stack, not API)
Database:  PostgreSQL (4 separate DBs in prod)
Jobs:      Solid Queue (in-Puma for MVP)
Cache:     Solid Cache / Redis
Deploy:    Kamal (Docker)
Auth:      bcrypt (has_secure_password)
SMS:       ESMS (Vietnam-local)
Storage:   Active Storage (S3/R2 production)
```

---

### Authentication Flow

1. User registers: phone + password → `has_secure_password` (bcrypt)
2. User logs in: credentials authenticated → session cookie (60 days)
3. Forgot password: SMS OTP (ESMS) → verify OTP → reset password
4. Session persisted in Solid Cache DB or encrypted cookie

---

### Core Features (MVP)

1. **Auth**: Phone + password login, session, password reset (OTP)
2. **Profile**: Edit name, avatar, vehicle type, Zalo link, view ratings
3. **Posts**: Create offer/request, filter by route/time, auto-expire (24h), recurring (daily)
4. **Contact**: "Liên hệ" button → create conversation, reveal phone + Zalo
5. **Chat**: Message in-app (polling every 10s, Turbo Frames)
6. **Rating**: 1-5 score + comment, unique per conversation, avg rating shown (min 3 reviews)
7. **PWA**: Web app manifest, service worker, install to home screen
8. **Jobs**: Post expiry, recurring post creation, OTP cleanup (all hourly)

---

## For Different Roles

### Product Manager / Founder
- Start: `project-overview-pdr.md` (business logic, success criteria)
- Then: `project-roadmap.md` (timeline, priorities, risks)
- Reference: `project-overview-pdr.md` for KPIs

### Backend Developer
- Start: `code-standards.md` (conventions before coding)
- Then: `codebase-summary.md` (database schema, file structure)
- Reference: `system-architecture.md` (data flows)
- Deploy: `deployment-guide.md`

### Frontend Developer
- Start: `code-standards.md` (naming, view patterns)
- Then: `codebase-summary.md` (views, assets)
- Reference: `system-architecture.md` (flows involving UI)

### DevOps / Infrastructure
- Start: `deployment-guide.md` (setup, Kamal, troubleshooting)
- Then: `system-architecture.md` (architecture, security)
- Reference: `project-roadmap.md` (phase exit criteria)

### QA / Tester
- Start: `project-overview-pdr.md` (success criteria, user flows)
- Then: `project-roadmap.md` (phase features, exit criteria)
- Reference: `code-standards.md` (edge cases, security)

---

## Navigation Tips

- **Find a feature?** → `project-overview-pdr.md` (business) or `project-roadmap.md` (when it ships)
- **How do I code X?** → `code-standards.md` (patterns) + examples
- **Design question?** → `system-architecture.md` (flows, data)
- **Deployment question?** → `deployment-guide.md` (setup, troubleshooting)
- **What exists now?** → `codebase-summary.md` (current state)
- **What's the timeline?** → `project-roadmap.md` (phases, milestones)

---

## Contributing to Documentation

When updating docs:
1. Keep files under 800 lines (split if needed)
2. Update navigation links when adding new files
3. Use code examples where possible
4. Reference the actual codebase (verify paths exist)
5. Update this INDEX.md if adding a new doc

---

## External Resources

- [Rails 8 Guides](https://guides.rubyonrails.org)
- [Hotwire Docs](https://hotwired.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Kamal Deploy](https://kamal-deploy.org)
- [Solid Queue](https://github.com/rails/solid_queue)
- [CLAUDE.md](../CLAUDE.md) — Project business context (Vietnamese business logic)

---

## Documentation Status

- ✓ README.md — Updated with RoadMate-specific content
- ✓ project-overview-pdr.md — Complete (PDR approved)
- ✓ codebase-summary.md — Complete (current state)
- ✓ code-standards.md — Complete (ready for use)
- ✓ system-architecture.md — Complete (all flows documented)
- ✓ project-roadmap.md — Complete (6 phases defined)
- ✓ deployment-guide.md — Complete (dev + prod)
- ✓ INDEX.md — This file (navigation guide)

**Next documentation**: Phase 1 implementation guide (hand-off to developers)

---

## Questions?

- **Product/business**: See `project-overview-pdr.md` or `CLAUDE.md`
- **Technical/architecture**: See `system-architecture.md` or `codebase-summary.md`
- **Code patterns**: See `code-standards.md`
- **Deployment**: See `deployment-guide.md`
- **Timeline/roadmap**: See `project-roadmap.md`

**Report bugs or missing docs**: File an issue or update this guide.

---

*Last Updated: 2026-03-16*
*Status: APPROVED for Phase 1 implementation*
