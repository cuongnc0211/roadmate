# RoadMate — Project Roadmap & Implementation Timeline

## Overview

**Goal**: MVP launch in 8 weeks with core carpooling marketplace features validated.

**Current Phase**: Init (Weeks -1 to 0) — Scaffolding complete, ready for Phase 1.

**Approach**: Linear waterfall by feature phase; each phase builds on previous. No parallel development until Phase 4+.

---

## Phase Breakdown

### Phase 1: Authentication & Profile (Weeks 1-2)

**Objective**: Users can register, login, and manage their profile.

**Status**: Not started

**Key Features**:
- [ ] User model + phone/password auth (has_secure_password)
- [ ] Session management (60-day cookie, session[:user_id])
- [ ] Signup → form validation → create User (phone + password)
- [ ] Login → authenticate with password → redirect to feed
- [ ] Profile view (show user info + rating)
- [ ] Profile edit (name, avatar, vehicle, Zalo link)
- [ ] Logout (clear session)
- [ ] Password reset via SMS OTP (ESMS integration)
- [ ] OTP code generation, validation, cleanup

**Database**:
- Create `users` table (phone, password_digest, name, avatar_url, zalo_link, vehicle_type, vehicle_plate, available_seats, avg_rating, rating_count)
- Create `otp_codes` table (phone, code, expires_at, used)
- Use password_digest (has_secure_password standard column)

**Views**:
- `users/new` (signup form)
- `sessions/new` (login form)
- `users/show` (profile)
- `users/edit` (edit profile)
- `password_resets/new` (forgot password form)
- `password_resets/edit` (OTP entry + new password)

**Controllers**:
- `UsersController` (new, create, show, edit, update)
- `SessionsController` (new, create, destroy)
- `PasswordResetsController` (new, create, edit, update)
- `OtpCodesController` (verify OTP)

**Testing**:
- Manual login/logout flow
- Phone normalization (0xx → +84xxxxxxx)
- Password hashing (bcrypt)
- OTP generation & expiry

**Exit Criteria**:
- Can register phone + password
- Can login with credentials
- Session persists across requests
- Can edit profile (name, avatar, vehicle)
- Can reset password via OTP

**Risk**: ESMS SMS delivery reliability (have fallback manual entry)

---

### Phase 2: Rides & Feed (Weeks 3-4)

**Objective**: Drivers and passengers can create rides, view feed, filter.

**Status**: Not started

**Key Features**:
- [ ] Ride model (offer/request, route, time, price, seats)
- [ ] Create ride: offer ("I have a seat") or request ("I need a ride")
- [ ] Edit own ride
- [ ] Close (manually) or expire (auto after 1h) ride
- [ ] Feed: list all active rides
- [ ] Filter: by origin district, destination district, vehicle type
- [ ] Sort: by departure time (ascending)
- [ ] Pagination: 20 rides per page
- [ ] Ride detail view (show route, driver/passenger info)
- [ ] Background job: auto-expire rides after 1h, mark full rides

**Database**:
- Create `rides` table (user_id, ride_type, vehicle_type, origin, destination, origin_district, dest_district, depart_at, price_suggestion, seats_available, status, recurring, recurring_days, note)
- Add indexes: (status, depart_at), (origin_district, dest_district), (user_id)

**Views**:
- `rides/index` (feed with filters)
- `rides/new` (choose type: offer or request)
- `rides/new_offer` (offer form)
- `rides/new_request` (request form)
- `rides/show` (ride detail)
- `rides/edit` (edit form)
- `my_rides/index` (user's rides)

**Controllers**:
- `RidesController` (index, new, create, show, edit, update, destroy)
- `MyRidesController` (index)

**Jobs**:
- `ExpireRidesJob` (every 15min: expire rides depart_at < 1h ago, mark full rides)

**Testing**:
- Create offer/request ride
- Filter by district
- Auto-expiry after 1h
- Cannot edit other user's rides
- Pagination works

**Exit Criteria**:
- Can create ride (offer/request)
- Feed displays active rides filtered
- Rides auto-expire after 1h
- Own rides show edit/delete buttons
- Ride status: active → matched/full/expired

---

### Phase 3: RideRequests & Chat (Weeks 5-6)

**Objective**: Users can initiate contact and message each other via RideRequests.

**Status**: Not started

**Key Features**:
- [ ] Book/Offer button on ride detail
- [ ] Create RideRequest (booking or offer) on click
- [ ] Display driver/passenger phone + Zalo link in thread
- [ ] Message form + message list in RideRequest thread
- [ ] In-app messaging (Turbo Frames)
- [ ] Stimulus polling for new messages (10s interval)
- [ ] Mark messages as read
- [ ] RideRequest list (inbox)
- [ ] Cannot create RideRequest for your own ride
- [ ] Accept/decline RideRequest actions
- [ ] Auto-decline other requests when one accepted

**Database**:
- Create `ride_requests` table (ride_id, requester_id, direction, status, seats, price, note)
- Create `ride_request_messages` table (ride_request_id, sender_id, body, read)
- Add indexes: (ride_id, requester_id) UNIQUE, (ride_request_id, created_at)

**Views**:
- `ride_requests/index` (inbox list)
- `ride_requests/show` (with messages thread)
- `ride_request_messages/_message` (partial)
- `ride_request_messages/_form` (message input)

**Controllers**:
- `RideRequestsController` (index, create, accept, decline)
- `RideRequestMessagesController` (index, create)

**JavaScript (Stimulus)**:
- `ride_message_poll_controller.js` (fetch messages every 10s)

**Testing**:
- Click Book/Offer → RideRequest created
- Phone + Zalo displayed after creation
- Send message → stored + appears immediately
- Polling fetches new messages (every 10s)
- Cannot create request on own rides
- Accept/decline work, auto-decline others
- Read/unread tracking

**Exit Criteria**:
- Can initiate RideRequest (booking or offer)
- Can send/receive messages in RideRequest thread
- Phone + Zalo visible immediately in thread
- Polling updates without page reload
- Two flows (Flow A & B) working

**Note**: Polling only (no WebSocket at MVP)

---

### Phase 4: Rating System (Week 7)

**Objective**: Users can rate each other after transactions.

**Status**: Not started

**Key Features**:
- [ ] Rating form: score (1-5) + comment
- [ ] Create rating after conversation exists
- [ ] Unique rating per (conversation, rater) pair
- [ ] Update avg_rating + rating_count on User
- [ ] Display avg_rating on profile (only if count >= 3)
- [ ] Show "Not enough reviews" if count < 3
- [ ] Rating calculations (average, weighted)

**Database**:
- Create `ratings` table (ride_request_id, rater_id, ratee_id, score, comment)
- Add index: (ride_request_id, rater_id) UNIQUE
- Add index: (ratee_id)

**Views**:
- `ratings/new` (rating form)
- `ratings/create` (submit rating)
- Profile shows: avg_rating or "Not enough reviews"

**Controllers**:
- `RatingsController` (new, create)

**Services**:
- `RatingCalculator` (update User avg_rating + rating_count)

**Testing**:
- Cannot rate without accepted RideRequest
- Cannot rate until ride expired
- Can rate multiple users
- Cannot rate twice for same RideRequest
- avg_rating updates correctly
- Profile shows rating only if >= 3 reviews

**Exit Criteria**:
- Can leave rating after RideRequest accepted & ride expired
- Avg rating displayed on profile (if >= 3 reviews)
- No duplicate ratings per RideRequest
- Conditions enforced: accepted status + ride expired

---

### Phase 5: Polish & PWA (Week 8)

**Objective**: Recurring posts, PWA support, UI polish.

**Status**: Not started

**Key Features**:
- [ ] Recurring rides: auto-recreate daily (M-F, e.g.)
- [ ] Web app manifest (install to home screen)
- [ ] Service worker (basic offline support)
- [ ] Mobile UI optimizations (Tailwind responsive)
- [ ] Error pages (404, 500)
- [ ] Loading states + spinners
- [ ] Toast notifications (success/error messages)
- [ ] Accessibility (alt text, ARIA labels)
- [ ] Performance: page load <3s, Time to Interactive <5s

**Background Jobs**:
- `RecurringRideJob` (after ride expires: recreate next day if matches recurring_days)
- `OtpCleanupJob` (hourly: delete expired/used OTP codes)

**Views**:
- PWA manifest linked in application layout
- Service worker registered
- Mobile-responsive layout tweaks
- Error pages

**Testing**:
- Recurring ride recreates daily for selected days
- PWA installs on iOS/Android
- Offline page loads (service worker)
- Mobile layout responsive (Tailwind breakpoints)
- Performance: lighthouse score >80

**Exit Criteria**:
- Recurring rides auto-create (next day if matches recurring_days)
- Can install as PWA
- Mobile UI polished
- All core features working end-to-end (both Flow A & B)

---

### Phase 6: Monitoring & Launch (Weeks 9+)

**Objective**: Monitor app health, prepare for launch.

**Status**: Not started

**Key Features**:
- [ ] Datadog integration (logging, metrics)
- [ ] Health check endpoint (/up)
- [ ] Error tracking (Sentry optional)
- [ ] Performance monitoring (Rails queries, response times)
- [ ] User behavior tracking (Google Analytics optional)
- [ ] Support form / feedback channel
- [ ] Documentation completion
- [ ] Manual testing checklist

**Testing**:
- Datadog dashboards created
- Alerts configured (error rate, response time)
- Full end-to-end flow tested (signup → post → contact → rate)
- Mobile browsers tested (iOS Safari, Chrome, Firefox)
- Edge cases (full inbox, many posts, rate limiting)

**Exit Criteria**:
- App monitored and healthy
- Ready for closed beta (20-50 users)
- Documentation complete for developers

---

## Timeline (8 Weeks to MVP)

```
Week 1-2:  [Phase 1] Auth & Profile
Week 3-4:  [Phase 2] Posts & Feed
Week 5-6:  [Phase 3] Contact & Chat
Week 7:    [Phase 4] Rating
Week 8:    [Phase 5] Polish & PWA
Week 9+:   [Phase 6] Monitoring & Launch
```

**Milestones:**
- **End of Week 2**: Can register & login
- **End of Week 4**: Can browse posts, create post
- **End of Week 6**: Can message other users
- **End of Week 7**: Can rate users
- **End of Week 8**: PWA, recurring posts, polished UI
- **Week 9**: Closed beta launch

---

## Priority Features (MVP Must-Have)

1. **Auth** — Phone + password login (foundation)
2. **Posts** — Create offer/request, view feed
3. **Contact reveal** — See phone + Zalo after "Liên hệ"
4. **Chat** — Asynchronous messaging (no WebSocket)
5. **Rating** — Build trust via reviews

**Nice-to-Have (if time)**:
- Map integration (visual routes)
- Recurring posts
- Push notifications
- Advanced filtering

---

## Known Constraints & Assumptions

### Technical Constraints
- **No WebSocket**: Polling only (simpler deployment, no extra infrastructure)
- **No payment**: Cash/bank transfer only (MVP validation first)
- **No mobile app**: PWA instead (lower dev cost, easier iteration)
- **No complex ML**: Simple filtering (district, time, type)
- **Single server**: No load balancing (scales to 10k concurrent)

### Business Constraints
- **Solo founder**: 8 hours/week dev time (estimate 50 hours total for MVP)
- **No marketing budget**: Word-of-mouth only
- **Vietnamese market**: Phone-first, SMS-based (no email preference)
- **Text locations**: No map integration (addresses not geocoded)

### Assumptions
- FPT University + ĐHQG students will be early adopters
- Trust is built via ratings (peer review model)
- Users comfortable coordinating details via Zalo/phone
- No competitor will enter market during MVP phase
- Server infrastructure (Kamal, single VPS) sufficient for 100-500 daily active users

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| **ESMS SMS fails** | High | High | Fallback manual OTP entry, rate limit |
| **Low user adoption** | High | Critical | Build MVP fast, get feedback early |
| **Competitor emerges** | Medium | High | Focus on user retention, UX polish |
| **Database scalability** | Low | High | Monitor query performance, add indexes early |
| **Churn after first week** | High | High | Good onboarding, clear instructions, responsive support |
| **Chat/coordination breaks** | Medium | Medium | Dual channels (in-app + Zalo), fallback to phone |
| **Deployment issues** | Low | High | Test Kamal deploy locally before production |

---

## Success Metrics (Post-MVP)

### Usage
- **DAU** (Daily Active Users): Target 50+ by week 3
- **MAU** (Monthly Active Users): Target 200+ by month 2
- **Trips/day**: Target 10+ successful trips by month 1

### Engagement
- **Return rate**: >50% of users return next day
- **Posts/user**: Average 2+ posts per active user
- **Messages/conversation**: Average 5+ messages

### Quality
- **Support tickets**: <5% of trips
- **Cancellations**: <10%
- **Negative ratings** (<3 stars): <5%
- **Avg rating**: >4.0

### Retention
- **Day 7 retention**: >30%
- **Day 30 retention**: >15%

---

## Future Roadmap (Phase 2+)

### Quarter 2 (After MVP Validation)
- [ ] Map integration (Google Maps / Mapbox)
- [ ] Payments (Stripe / mPay)
- [ ] Mobile app (Expo / React Native)
- [ ] Advanced search + matching algorithm
- [ ] Corporate partnerships (company shuttle service)

### Quarter 3
- [ ] Trip insurance
- [ ] Driver verification (ID, vehicle)
- [ ] Ratings/reviews public profiles
- [ ] User messaging (off-app notification)
- [ ] Community features (groups, forums)

### Quarter 4+
- [ ] International expansion
- [ ] Multiple routes (airport, intercity)
- [ ] API for partners
- [ ] Affiliate program
- [ ] Advertising

---

## Team & Capacity

**Current**: Solo founder (Cuong Nguyen)
- 8 hours/week available
- 8+ years Rails experience
- Familiar with full-stack development
- Can do design, backend, frontend, DevOps

**Estimate**: 50-60 hours to MVP (6-8 weeks)

**Scaling (Future)**:
- Week 9+: 1-2 contractors for customer support
- Month 2+: 1 engineer for mobile app (Expo)
- Month 3+: 1 designer for UX/marketing

---

## Documentation Roadmap

- [x] README.md — Quick start
- [x] project-overview-pdr.md — Product requirements
- [x] codebase-summary.md — Current codebase state
- [x] code-standards.md — Coding conventions
- [x] system-architecture.md — Technical architecture
- [x] project-roadmap.md — This file (timeline, phases)
- [x] deployment-guide.md — Deploy instructions

---

## Decision Log

### Decision 1: Full-Stack Rails vs. API + SPA
**Chosen**: Full-stack Rails (ERB + Hotwire)
**Rationale**: Founder expertise, velocity, no separate deploy pipelines

### Decision 2: Polling vs. WebSocket Chat
**Chosen**: Polling (10s interval, Stimulus)
**Rationale**: Simpler deployment, no external job broker, acceptable latency for MVP

### Decision 3: Solid Queue vs. Sidekiq + Redis
**Chosen**: Solid Queue (database-backed)
**Rationale**: Built into Rails 8, no external dependencies at MVP

### Decision 4: PostgreSQL Single vs. Multiple DBs
**Chosen**: Multiple DBs in prod (primary, cache, queue, cable)
**Rationale**: Durability, separation of concerns, easier scaling

### Decision 5: Kamal Deployment
**Chosen**: Kamal (Docker)
**Rationale**: Single-server simplicity, zero-downtime deploys, cost-effective

### Decision 6: Devise vs. has_secure_password
**Chosen**: has_secure_password (bcrypt) + manual session management
**Rationale**:
- Simpler, fewer dependencies (no Devise complexity at MVP)
- Phone-based authentication (easier without Devise email assumption)
- Direct session[:user_id] control
- Uses password_digest column (Rails standard)
- Sufficient for MVP MVP scope (no email, no roles, no token auth)
- Manual SessionsController + UsersController, less configuration
- Future can add mobile API tokens when needed

---

## Approval & Sign-Off

**Document Version**: 1.0
**Last Updated**: 2026-03-16
**Author**: Cuong Nguyen (Founder)
**Status**: APPROVED for Phase 1 Implementation

**Next Milestone**: Phase 1 complete by 2026-03-30
