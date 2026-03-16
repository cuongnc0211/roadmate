# Phase 7: Docs Update

**Status**: Pending
**Priority**: P1

---

## Overview

Update all affected docs to reflect the switch from `has_secure_password` + manual session to Devise.

---

## Files to Update

### 1. docs/system-architecture.md

**Section: Key Gems** — add Devise:
```
- `devise` (4.9): Authentication framework (login, signup, session management)
- `devise-api` (0.1): Token auth for mobile app (Phase 2, currently dormant)
```

**Section: Services** — remove `UserAuthenticator`:
```
# Remove:
- UserAuthenticator

# Keep:
- ConversationInitiator
- RatingCalculator
```

**Section: Data Flow — User Registration & Login** — replace the manual session flow diagram with Devise flow:
```
POST /users/sign_in
  → Users::SessionsController (Devise)
  → User.find_for_database_authentication(phone:)
  → BCrypt verify → set Devise session cookie
  → redirect root_path

POST /users (sign_up)
  → Users::RegistrationsController (Devise)
  → User.create(phone, name, password)
  → auto sign in → redirect root_path
```

**Section: Session Management** — update to Devise:
```
Cookie name: _roadmate_session (Rails encrypted)
Set by: Devise rememberable module
Duration: 60 days (config.remember_for = 60.days)
current_user: provided by Devise helper
```

**Section: Password Security** — update:
```
Handled by Devise :database_authenticatable
BCrypt cost: 12 (config.stretches = 12)
Password stored in: users.encrypted_password
```

---

### 2. docs/code-standards.md

**Section: Authentication & Authorization** — replace manual helpers with Devise:

```ruby
# Remove the manual implementation:
# def current_user
#   @current_user ||= User.find(session[:user_id]) if session[:user_id]
# end

# Replace with: Devise provides these automatically:
# current_user         → the logged-in User (or nil)
# user_signed_in?      → boolean
# authenticate_user!   → before_action that redirects to login
```

**Section: Controllers example** — update `before_action`:
```ruby
# Devise-provided (no manual implementation needed)
before_action :authenticate_user!, except: %i[index show]
```

---

### 3. docs/project-roadmap.md

**Phase 1 Key Features** — update checklist to reflect Devise:

```markdown
- [ ] User model + Devise phone-based auth (database_authenticatable, registerable, rememberable)
- [ ] Sign up form: phone, name, password (no OTP verification — inline notice only)
- [ ] Login form: phone + password
- [ ] Session management via Devise rememberable (60-day cookie)
- [ ] Logout (DELETE /users/sign_out)
- [ ] Profile view (show user info + rating)
- [ ] Profile edit (name, avatar, vehicle, Zalo link)
- [ ] Password reset via SMS OTP (ESMS) — separate OtpCodesController
- [ ] OTP code generation, validation, cleanup job
```

**Phase 1 Controllers** — update:
```markdown
- `Users::RegistrationsController` (Devise override: new, create)
- `Users::SessionsController` (Devise override: new, create, destroy)
- `PasswordResetController` (new, create)
- `OtpCodesController` (create, verify)
```

**Decision Log** — add new entry:
```markdown
### Decision 6: Devise vs has_secure_password
**Chosen**: Devise (4.9)
**Rationale**: Provides complete auth infrastructure (session, remember me, helpers, views), reduces boilerplate, future-proof for mobile token auth via devise-api. Phone replaces email as authentication key.
```

---

### 4. CLAUDE.md

**Section: Tech stack** — no change needed (Rails full-stack is unchanged).

**Section: Database schema — Users** — update `password_digest` note:
```ruby
# Change:
t.string   :password_digest,  null: false  # has_secure_password

# To:
t.string   :encrypted_password, null: false  # Devise database_authenticatable
```

**Section: Auth flow** — replace entire section with Devise flow:
```markdown
### Auth flow (Devise — phone + password)

**Đăng ký:**
1. POST /users → Users::RegistrationsController#create
2. Devise creates User (phone normalized to +84xxxxxxxxx)
3. Auto sign in → redirect to feed
4. Flash notice: "Nhớ điền đúng số điện thoại"

**Đăng nhập:**
1. POST /users/sign_in → Users::SessionsController#create
2. User.find_for_database_authentication(phone:) → BCrypt verify
3. Devise sets session cookie (60 days via rememberable)
4. Redirect to feed

**Đăng xuất:**
- DELETE /users/sign_out → clears Devise session

**Quên mật khẩu (ESMS OTP — separate flow, not Devise recoverable):**
1–8. Same ESMS OTP flow as before (OtpCodesController)

**Helpers (provided by Devise — no manual impl):**
- current_user
- user_signed_in?
- authenticate_user! (before_action)
```

---

## Todo

- [ ] Update `docs/system-architecture.md` (gems, services, data flow, session, password sections)
- [ ] Update `docs/code-standards.md` (auth helpers section)
- [ ] Update `docs/project-roadmap.md` (Phase 1 checklist, controllers, add decision log entry)
- [ ] Update `CLAUDE.md` (schema comment, auth flow section)
