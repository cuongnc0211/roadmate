# RoadMate — Project Overview & Product Development Requirements (PDR)

## Executive Summary

**RoadMate** is a carpooling marketplace MVP for Vietnam targeting the Hà Nội ↔ Hoà Lạc corridor. It solves the "last-mile mobility" problem by connecting drivers with available seats to passengers needing transportation.

**Status**: Early MVP (init commit only) — validating core hypothesis: "can drivers and passengers reliably match and transact?"

**Solo Founder**: 1 person, velocity prioritized over scalability.

---

## Problem Statement

### The Opportunity
- **Route**: Hà Nội ↔ Khu Công nghệ cao Hoà Lạc (~40km)
- **Daily Users**: FPT University students (1st year at Hoà Lạc), ĐHQG Hà Nội students, CNC Hoà Lạc employees
- **Pain Point**: Public transport is slow/unreliable; taxi/Grab is expensive for daily commutes; few ride-share options
- **Solution**: Peer-to-peer carpooling on a simple marketplace

### Why Now
- Growing commuting volume from central Hà Nội to Hoà Lạc tech hub
- SMS + phone-based culture in Vietnam (not email-dependent)
- Lightweight PWA more practical than native app for casual users
- Solo founder with 8+ years Rails experience can iterate fast

---

## Target Users

### Primary (MVP Phase 1)
1. **Drivers** (Vehicle Owners)
   - Have car or motorbike with spare seat(s)
   - Want to offset fuel costs or make small income
   - Willing to repeat trips (e.g., commute 5 days/week)
   - Use phone for payment coordination (cash/bank transfer)

2. **Passengers** (Need Ride)
   - Students or office workers commuting Hà Nội ↔ Hoà Lạc
   - Want cheaper alternative to Grab/taxi
   - Comfortable with unscheduled/flexible timing
   - Trust peer-to-peer transactions

### Secondary (Phase 2+)
- Corporate shuttle coordinators (batch bookings)
- Tour/event organizers (one-off group rides)
- Airport/intercity travel (longer routes)

---

## MVP Scope

### In Scope (Phase 1-3, Next 6-8 Weeks)

#### Core Features
1. **Authentication**
   - Phone + password login (no email)
   - Session persistence (60 days)
   - Password reset via SMS OTP

2. **Profile**
   - Name, avatar, vehicle info (if driver)
   - Zalo link (Vietnamese messaging app)
   - Rating/review visibility (after 3+ reviews)

3. **Post CRUD**
   - Create offer ("I have a seat") or request ("I need a ride")
   - Specify: route, time, vehicle type, price suggestion, notes
   - Edit/close own posts
   - Auto-expire after 24h; recurring option (daily for M-F, etc.)

4. **Feed & Discovery**
   - List all active posts filtered by: origin district, destination district, time window, vehicle type
   - Sort by time/price/rating
   - Search by location (text, no map)

5. **Contact & Chat**
   - Click "Liên hệ" to initiate conversation (reveals phone + Zalo)
   - Simple in-app messaging (no WebSocket, polling-based)
   - View conversation history
   - Mark messages as read

6. **Rating**
   - Rate after conversation is created
   - Score (1-5) + optional comment
   - Average rating shown on profile (min 3 reviews required)

7. **Background Jobs**
   - Post expiry (daily Sidekiq job)
   - Recurring post auto-creation
   - OTP cleanup (delete expired codes)

8. **PWA Support**
   - Web app manifest (iOS/Android home screen)
   - Service worker (offline capability, future)
   - Mobile-optimized UI (Tailwind CSS)

### Out of Scope (MVP)
- Map integration (Google Maps, Mapbox) — text-based locations only
- In-app payments or payment processing
- WebSocket/real-time chat (polling only)
- Native mobile app (Expo/React Native) — Phase 2
- Email notifications
- Complex matching algorithm
- Insurance/liability features
- Background checks or KYC
- Multiple languages (Vietnamese only, with English in code)

---

## Success Criteria (MVP)

### Functional
- [x] Users can register via phone + password
- [x] Drivers can post offers; passengers can post requests
- [x] Conversations are created upon contact initiation
- [x] Users can message within conversations
- [x] Users can rate each other after conversation
- [x] Posts auto-expire; recurring posts auto-create

### Operational
- App loads in <3s on 4G network
- Chat polling updates messages within 15s
- Database supports 10k users, 50k posts without performance degradation
- Deployment: single server (Kamal), no load balancer needed for MVP

### Business Validation
- **Hypothesis**: "Drivers and passengers can reliably match and coordinate via phone"
- **Success**: >50 successful trips in first month, positive feedback on contact coordination
- **Pivot Point**: If matching rate <20%, may need stronger algorithm or targeting adjustment

### Quality Gates
- No critical security issues (Brakeman clean)
- No SQL injection vulnerabilities
- SMS OTP rate-limited to 3/hour per phone (abuse prevention)
- Conversations cannot be created for your own posts
- Rating is unique per (conversation, rater) pair

---

## Technical Constraints

### Stack Decisions
- **Rails 8** (full-stack, not API mode): Founder expertise, velocity
- **Hotwire** (Turbo Frames + Stimulus): Sufficient for MVP interactions, no build tool overhead
- **PostgreSQL**: Reliability, GIS support for future map feature
- **Solid Queue**: Built-in, no external job broker needed
- **Propshaft + importmap**: Zero bundler complexity, assets served locally
- **No WebSocket**: Polling acceptable for MVP scale, reduces deployment complexity

### Dependencies
- `has_secure_password` (bcrypt) for auth
- `image_processing` for avatar thumbnails
- `jbuilder` for future JSON APIs
- Dev tools: `rubocop`, `brakeman`, `bundler-audit`

### No External Dependencies for MVP
- No: Stripe, email provider, SMS initially (ESMS added for password reset only)
- No: Redis initially (use in-memory store if needed)
- No: Elasticsearch, analytics, logging (Datadog later)

---

## Implementation Roadmap

### Phase 1: Auth & Profile (Weeks 1-2)
- [ ] User model + phone/password auth
- [ ] Session management (60-day cookies)
- [ ] Profile creation/edit
- [ ] SMS OTP setup (ESMS integration)

### Phase 2: Posts & Feed (Weeks 3-4)
- [ ] Post model (offer/request, enums)
- [ ] Post CRUD endpoints
- [ ] Feed with filtering
- [ ] Post auto-expiry (Sidekiq job)

### Phase 3: Contact & Chat (Weeks 5-6)
- [ ] Conversation model
- [ ] Message model
- [ ] Conversation creation ("Liên hệ" button)
- [ ] Chat UI (Turbo Frames + polling)

### Phase 4: Rating (Week 7)
- [ ] Rating model
- [ ] Rating creation after conversation
- [ ] Avg rating display (min 3 threshold)

### Phase 5: Polish & PWA (Week 8)
- [ ] Recurring posts (Sidekiq job)
- [ ] Web app manifest
- [ ] Service worker (basic offline)
- [ ] Mobile UI refinements
- [ ] Launch & manual testing

### Phase 6: Monitoring & Optimization (Weeks 9+)
- [ ] Add Datadog monitoring
- [ ] Performance profiling
- [ ] User feedback loop
- [ ] Bug fixes

---

## Non-Functional Requirements

### Performance
- Page load time: <3s on 4G
- Chat message delivery: <15s (polling)
- Database query: <200ms for feed queries
- Pagination: 20 posts per page default

### Scalability (Future)
- Current: Single server, supports ~10k concurrent users
- Future: Redis, read replicas, caching when hitting limits

### Security
- Phone numbers stored normalized (+84xxxxxxxxx format)
- Password hashed with bcrypt (has_secure_password)
- OTP codes expire in 10 minutes; single-use only
- Rate limiting on password reset (3 OTP/hour per phone)
- CSRF protection (default Rails)
- SQL injection prevention (parameterized queries)
- XSS protection (ERB auto-escaping)

### Reliability
- Database backups: daily (Kamal volumes)
- Logs: local rotation; Datadog integration (phase 2)
- Monitoring: basic uptime check (/up endpoint)
- No SLA required for MVP (internal beta)

### Compliance
- Data: User data stored in Vietnam (PostgreSQL local or regional cloud)
- Privacy: No email/SMS marketing without opt-in
- Payment: Out-of-app (cash/bank transfer) — no PCI scope

---

## User Flows

### Scenario 1: New Driver Posting a Ride
1. Register phone + password
2. Set up profile (name, avatar, vehicle info)
3. Click "Đăng xe" → select "Có xe" (Offer)
4. Enter: origin district, destination district, departure time, seats available, price suggestion
5. Post appears on feed (visible for 24h or until manually closed)
6. Other users click "Liên hệ" → conversation created
7. Driver can message with passenger, share Zalo link
8. After trip, both rate each other

### Scenario 2: Passenger Booking a Seat
1. Register phone + password
2. Create profile
3. View feed (filtered by route/time)
4. Click "Liên hệ" on driver's offer → conversation opens
5. Chat with driver, get their phone + Zalo, coordinate pickup
6. After trip, rate driver (1-5)

### Scenario 3: Recurring Commute
1. Driver posts: "Hàng ngày T-T thứ 6, 07:00, từ Hà Nội → Hoà Lạc"
2. System marks post as recurring (recurring_days: 1,2,3,4,5)
3. Post auto-expires after 24h
4. Sidekiq job recreates post next day at same time
5. Repeat for 5 business days until manually closed

---

## Measurement & KPIs (Post-MVP)

### Usage
- Daily active users (DAU)
- Successful trips per week
- Avg rating score
- Message response time

### Conversion
- Registration to first post: <1 day
- Conversation to trip completion: <1 week
- Repeat user rate: >50%

### Quality
- Support tickets: <5% of trips
- Cancellation rate: <10%
- Negative ratings (<3 stars): <5%

---

## Risks & Mitigations

### Risk: "Drivers/passengers don't trust unknown peers"
- **Mitigation**: Rating system visible from profile; Zalo link (trusted Vietnamese platform)

### Risk: "Posts don't match (wrong time, wrong location)"
- **Mitigation**: Clear origin/destination districts, precise time selection, recurring feature for regular commutes

### Risk: "SMS OTP delivery unreliable"
- **Mitigation**: Use ESMS (Vietnam-local provider); implement retry logic; fallback to manual code entry

### Risk: "Solo founder burnout on customer support"
- **Mitigation**: Lean MVP; automate expiry; clear T&Cs; focus on product-market fit before scaling support

### Risk: "Chat/coordination breaks down"
- **Mitigation**: In-app messaging + Zalo link (dual channels); transparent contact reveal

---

## Go-to-Market

### Phase 1: Internal Beta
- Founder + close friends test core flows
- Manual testing only (no automated tests at MVP)
- Feedback: Post matches, chat usability, rating clarity

### Phase 2: Closed Beta (20-50 Users)
- Invite FPT University network
- Seed data: 10 driver offers, gather requests
- Measure: time-to-match, user retention, bugs

### Phase 3: Public Launch
- Open registration
- Simple landing page (no marketing spend)
- Growth: word-of-mouth, university Facebook groups
- Target: 500 users, 100 trips in month 1

---

## Future Roadmap (Phase 2+)

- **Map integration**: Visual route display (Google Maps, Mapbox)
- **Payments**: In-app booking + payment processing (Stripe/mPay)
- **Mobile app**: Expo (React Native) for iOS/Android
- **Matching algorithm**: Automatic match suggestions (ML)
- **Corporate partnerships**: Shuttle service for tech companies
- **Insurance**: Travel accident coverage integration
- **KYC/verification**: Driver verification, vehicle registration check

---

## Glossary

| Term | Definition |
|------|-----------|
| **Ride** | An offer ("I have a seat") or request ("I need a ride") |
| **Offer** | Ride type: driver offering a ride with available seats |
| **Request** | Ride type: passenger looking for a ride |
| **RideRequest** | Booking (passenger→driver) or offer (driver→passenger) with messaging thread |
| **Booking** | Direction: passenger creates RideRequest on driver's offer |
| **Offer (direction)** | Direction: driver creates RideRequest on passenger's request |
| **Contact Reveal** | Phone + Zalo link shown when RideRequest is created |
| **Rating** | 1-5 score + optional comment left after RideRequest accepted & ride expired |
| **Recurring** | Ride that auto-recreates daily (e.g., M-F commute) |
| **OTP** | One-time password (6 digits) sent via SMS for password reset |
| **PWA** | Progressive Web App (web app with offline, home screen icon) |
| **Flow A** | Driver posts offer → Passenger books → Driver accepts |
| **Flow B** | Passenger posts request → Driver offers → Passenger accepts |

---

## Sign-Off

**Document Version**: 1.0
**Last Updated**: 2026-03-16
**Author**: Cuong Nguyen (Solo Founder)
**Status**: APPROVED for Phase 1 implementation

See `/docs/project-roadmap.md` for detailed phase breakdown and `/docs/code-standards.md` for implementation standards.
