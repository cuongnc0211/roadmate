# Code Review: Devise Authentication

**Date:** 2026-03-16
**Scope:** Phone-based Devise auth implementation (10 files)
**Branch:** master

---

## Overall Assessment

Solid foundation. The Devise-for-phone setup is done correctly — no email column in schema,
`authentication_keys: [:phone]`, custom `find_for_database_authentication`, Turbo/Hotwire
status codes configured. The main concerns are one regex bug and a duplicate param sanitizer
registration, plus a few medium-priority hardening items.

---

## Critical Issues

None.

---

## High Priority

### 1. Phone normalization regex has a logic flaw (`user.rb:56`)

```ruby
def self.normalize_phone_number(phone)
  phone.strip
       .sub(/^0/, "+84")
       .sub(/^\+?84/, "+84")
end
```

These two `sub` calls run sequentially on the same string. If the input is `0912345678`:
- After line 1: `+84912345678` (correct so far)
- Line 2 then matches `+84` again (since `\+?84` matches) → **no change** this time, but the
  match is redundant and confusing.

If the input is `84912345678` (no leading `+`):
- Line 1: no match (no leading `0`) → `84912345678`
- Line 2: matches `84` at start → `+84912345678` ✓

If the input is `+84912345678`:
- Line 1: no match → `+84912345678`
- Line 2: matches `+84` → `+84912345678` ✓ (idempotent, fine)

**Actual bug:** input `00084...` or `+840912...` (malformed) would produce garbage silently.
More critically, `084912345678` (extra leading zero before a valid 84-prefix) would produce
`+8484912345678` after line 2 — 13+ digits, passes the regex and lands in DB as invalid.

The real issue is that the two subs are **not mutually exclusive**. A single clean pass is
safer:

```ruby
def self.normalize_phone_number(phone)
  return phone if phone.blank?
  cleaned = phone.strip.gsub(/\D/, "")  # strip non-digits first
  case cleaned
  when /\A84(\d{9,10})\z/  then "+84#{$1}"
  when /\A0(\d{9,10})\z/   then "+84#{$1}"
  else phone.strip          # return original; validation will reject it
  end
end
```

The current implementation will pass validation for some malformed inputs.

### 2. `configure_permitted_parameters` is registered twice

`ApplicationController#configure_permitted_parameters` (line 14-16) and
`Users::RegistrationsController#configure_sign_up_params` / `configure_account_update_params`
(lines 16-22) both call `devise_parameter_sanitizer.permit` for the same keys.

Devise's `permit` appends to the list rather than replacing it, so the keys end up registered
twice. This is harmless today but will cause double-permit warnings if Devise ever tightens
this behavior, and is misleading to future maintainers.

**Fix:** Pick one place. Since the custom controllers already exist, remove the
`configure_permitted_parameters` method from `ApplicationController` entirely. The
`before_action :configure_permitted_parameters, if: :devise_controller?` guard can be removed
too.

---

## Medium Priority

### 3. No rate limiting on registration endpoint

Anyone can enumerate whether a phone number is registered via the registration endpoint (Devise
returns a uniqueness error). For an MVP this is acceptable, but worth noting: add `rack-attack`
or similar before production launch to throttle `POST /users` by IP.

### 4. `remember_me` cookie has no `secure:` flag set

`config.rememberable_options = {}` is commented out. In production over HTTPS the remember-me
cookie should be `secure: true`. Add to `devise.rb`:

```ruby
config.rememberable_options = { secure: Rails.env.production? }
```

### 5. `config.reconfirmable = true` with no email configured

`devise.rb:160` has `config.reconfirmable = true`. Since `:confirmable` is not in the Devise
modules and there is no email column, this setting is inert but confusing. Comment it out or
set to `false` to avoid confusion when onboarding collaborators.

### 6. Password confirmation field sends `password_confirmation` to server

The registration form includes `:password_confirmation` (view line 43) but the permitted
params in the controller only list `[:name, :phone]` — Devise handles `:password` and
`:password_confirmation` internally via `sign_up` permit. This is correct; just noting it
explicitly so no one "fixes" it by adding `:password_confirmation` to the explicit keys (which
would not be needed).

---

## Low Priority

### 7. Flash messages have no auto-dismiss

`application.html.erb` renders flash notices and alerts as fixed-position banners but has no
Stimulus controller or timeout to dismiss them. On Turbo navigation the banner from the
previous page will persist until the next full render. Consider a simple Stimulus controller
with `setTimeout` to fade out after ~3s.

### 8. `pluralize(resource.errors.count, "lỗi")` — Vietnamese pluralization

Rails `pluralize` uses English plural rules (appends "s"). `pluralize(2, "lỗi")` outputs
`"2 lỗis"`. Vietnamese doesn't pluralize, so use:

```erb
<%= resource.errors.count %> lỗi cần sửa:
```

---

## Positive Observations

- No `email` column in schema — clean phone-only setup, no vestigial email fields.
- `find_for_database_authentication` correctly normalizes before lookup.
- `before_validation :normalize_phone` ensures DB always receives normalized form.
- Turbo/Hotwire status codes (`unprocessable_entity` / `see_other`) correctly configured.
- `config.navigational_formats` includes `:turbo_stream` — correct for Devise + Turbo.
- `expire_all_remember_me_on_sign_out = true` — good session hygiene.
- CSRF meta tags present in layout; Devise's default CSRF cleanup on authentication is active.
- Schema has `unique: true` index on `phone` as DB-level constraint backing the AR validation.
- `vehicle_type` default `0` in migration matches `no_vehicle: 0` enum — no mismatch.

---

## Recommended Actions (ordered)

1. **Fix phone normalization regex** (High) — current two-step sub can produce 13-digit garbage
   for edge-case inputs like `+840xxxxxxxxx`.
2. **Remove duplicate param sanitizer registration** from `ApplicationController` (High).
3. **Add `rememberable_options secure: true` for production** (Medium).
4. **Set `reconfirmable = false`** or comment the line (Low — cosmetic).
5. **Fix `pluralize` with Vietnamese string** (Low).
6. **Add Stimulus flash-dismiss controller** (Low).
7. Pre-launch: add `rack-attack` throttle on auth endpoints.

---

## Unresolved Questions

- Is `available_seats` on the `users` table still needed now that it exists on `posts`? It
  appears in `configure_account_update_params` but there is no corresponding UI field in the
  reviewed views. If it duplicates `posts.seats_available`, one of them should be removed.
- The `forgot password` link in `sessions/new.html.erb` (line 34) is commented out and
  references `new_otp_code_path`. Is the OTP reset flow implemented? If not, users cannot
  recover accounts — worth flagging for the next sprint.
