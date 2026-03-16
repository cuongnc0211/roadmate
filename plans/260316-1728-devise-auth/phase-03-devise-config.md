# Phase 3: Devise Initializer Config

**Status**: Complete
**Priority**: P0

---

## Overview

Configure Devise to use phone instead of email. Edit `config/initializers/devise.rb` and update `config/application.rb` for the action mailer host (required by Devise even if unused).

---

## config/initializers/devise.rb (key changes)

```ruby
Devise.setup do |config|
  # Mailer config — unused for now (no email features), but Devise requires it
  config.mailer_sender = "noreply@roadmate.vn"

  # ==> ORM
  require "devise/orm/active_record"

  # ==> Authentication keys
  # Use phone instead of email
  config.authentication_keys = [:phone]
  config.request_keys = []
  config.case_insensitive_keys = []    # phone numbers are already normalized
  config.strip_whitespace_keys = [:phone]

  # ==> Password
  config.password_length = 6..128
  config.reset_password_within = 6.hours   # unused but keep for safety

  # ==> Session
  config.expire_all_remember_me_on_sign_out = true
  config.remember_for = 60.days             # 60-day session as per spec

  # ==> Security
  config.stretches = Rails.env.test? ? 1 : 12   # bcrypt cost

  # ==> Sign out
  config.sign_out_via = :delete

  # ==> Navigation formats
  # Tell Devise which formats to redirect vs render JSON for
  config.navigational_formats = ["*/*", :html, :turbo_stream]

  # ==> Scoped views
  config.scoped_views = true  # uses app/views/users/ for our custom forms
end
```

---

## config/application.rb

Add action mailer host (Devise needs it for URL helpers in mailers, even unused):

```ruby
config.action_mailer.default_url_options = { host: "localhost", port: 3000 }
```

Put inside `config/environments/development.rb` and `config/environments/production.rb` (with correct host).

---

## config/environments/production.rb

```ruby
config.action_mailer.default_url_options = { host: ENV["APP_HOST"] }
```

---

## Important: `config.navigational_formats`

Adding `:turbo_stream` here is **critical** for Hotwire/Turbo to work correctly with Devise redirects. Without it, Devise returns 401/redirect that Turbo can't handle.

---

## Todo

- [ ] Edit `config/initializers/devise.rb`:
  - Set `authentication_keys = [:phone]`
  - Set `case_insensitive_keys = []`
  - Set `strip_whitespace_keys = [:phone]`
  - Set `remember_for = 60.days`
  - Add `:turbo_stream` to `navigational_formats`
  - Set `scoped_views = true`
- [ ] Add `action_mailer.default_url_options` to development.rb and production.rb
- [ ] Verify app boots without errors: `rails runner "puts 'OK'"`
