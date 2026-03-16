# Plan: Devise Authentication (Login + Sign Up)

**Plan dir**: `plans/260316-1728-devise-auth/`
**Branch**: master
**Status**: Complete
**Priority**: P0 — Phase 1 foundation

---

## Overview

Switch from custom `has_secure_password` auth to **Devise** for login/signup.
Phone-based auth (no email). `devise-api` gem added now, dormant until mobile phase.

**Key decisions:**
- Phone replaces email as Devise's `authentication_keys`
- Skip Devise `validatable` (requires email) → custom validations
- Skip Devise `recoverable` (uses mailer/email) → keep ESMS OTP flow
- `devise-api` gem added to Gemfile + commented in User model (mobile phase 2)
- No phone OTP verification on signup — show inline notice only

---

## Phases

| # | Phase | Status | File |
|---|-------|--------|------|
| 1 | Gems + Devise install | Complete| [phase-01-gems-setup.md](phase-01-gems-setup.md) |
| 2 | User model migration | Complete| [phase-02-user-migration.md](phase-02-user-migration.md) |
| 3 | Devise initializer config | Complete| [phase-03-devise-config.md](phase-03-devise-config.md) |
| 4 | Controller overrides | Complete| [phase-04-controllers.md](phase-04-controllers.md) |
| 5 | Views (signup/login forms) | Complete| [phase-05-views.md](phase-05-views.md) |
| 6 | Routes + ApplicationController | Complete| [phase-06-routes-appcontroller.md](phase-06-routes-appcontroller.md) |
| 7 | Docs update | Complete| [phase-07-docs-update.md](phase-07-docs-update.md) |

---

## Key Dependencies

- Rails 8.1.1 (already installed)
- PostgreSQL (already installed)
- `devise` ~> 4.9
- `devise-api` ~> 0.1 (dormant, mobile phase 2)

---

## Success Criteria

- [ ] User can sign up with phone + name + password
- [ ] Inline notice on signup reminding exact phone for contact
- [ ] User can log in with phone + password
- [ ] Session persists 60 days (rememberable)
- [ ] User can log out
- [ ] `current_user` helper available in controllers/views
- [ ] Devise helpers (`authenticate_user!`, `user_signed_in?`) work
- [ ] All docs updated to reflect Devise
