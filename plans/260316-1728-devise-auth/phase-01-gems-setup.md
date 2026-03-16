# Phase 1: Gems + Devise Install

**Status**: Complete
**Priority**: P0

---

## Overview

Add Devise and devise-api gems, run Devise generator to produce initializer and locale files.

---

## Changes

### Gemfile

Add to main gem section (not grouped):

```ruby
# Authentication
gem "devise", "~> 4.9"
gem "devise-api", "~> 0.1"  # Token auth for future mobile app (Phase 2)
```

Also uncomment bcrypt (Devise uses it):
```ruby
gem "bcrypt", "~> 3.1.7"
```

### Install

```bash
bundle install
bundle exec rails generate devise:install
bundle exec rails generate devise:views users
```

**Note**: `devise:views users` generates into `app/views/users/` (scoped). We will heavily customize these views.

---

## Todo

- [ ] Add `devise` and `devise-api` to Gemfile
- [ ] Uncomment `bcrypt` in Gemfile
- [ ] Run `bundle install`
- [ ] Run `rails generate devise:install`
- [ ] Run `rails generate devise:views users`
- [ ] Verify no compile errors after install

---

## Notes

- `devise-api` gem homepage: https://github.com/nejdetkadir/devise-api
- The `devise-api` module will be commented out in User model until mobile phase
- Do NOT run `rails generate devise:install --skip-mailer` — mailer config is fine to have, just unused
