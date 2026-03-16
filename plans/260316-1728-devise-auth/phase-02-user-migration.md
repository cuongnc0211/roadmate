# Phase 2: User Model Migration

**Status**: Complete
**Priority**: P0

---

## Overview

Generate User model with Devise. Since we use phone (not email), we need a custom migration that replaces Devise's email column with phone.

---

## Generator Command

```bash
bundle exec rails generate devise User
```

This produces `db/migrate/YYYYMMDD_devise_create_users.rb` and `app/models/user.rb`.

---

## Migration

Edit the generated migration to replace email with phone and add app-specific fields:

```ruby
# db/migrate/YYYYMMDD_devise_create_users.rb
class DeviseCreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      ## Database authenticatable
      t.string :phone,            null: false, default: ""  # replaces :email
      t.string :encrypted_password, null: false, default: ""

      ## Rememberable
      t.datetime :remember_created_at

      ## App-specific fields
      t.string  :name,            null: false, default: ""
      t.string  :avatar_url
      t.string  :zalo_link                      # https://zalo.me/...
      t.integer :vehicle_type,    default: 0    # enum: 0=none, 1=motorbike, 2=car
      t.string  :vehicle_plate
      t.integer :available_seats
      t.float   :avg_rating,      default: 0.0
      t.integer :rating_count,    default: 0

      t.timestamps null: false
    end

    add_index :users, :phone, unique: true
    # NOTE: Devise normally adds index on :email — we use :phone instead
  end
end
```

**What we OMIT from default Devise migration:**
- `:email` → replaced by `:phone`
- `Recoverable` columns (`reset_password_token`, `reset_password_sent_at`) → using ESMS OTP instead
- `Trackable` columns (`sign_in_count`, `current_sign_in_at`, etc.) → not needed at MVP
- `Confirmable` columns → no email confirmation
- `Lockable` columns → no account locking at MVP

**What we KEEP:**
- `encrypted_password` — core auth
- `remember_created_at` — for 60-day session

---

## OtpCodes Table (separate migration)

```bash
bundle exec rails generate migration CreateOtpCodes
```

```ruby
class CreateOtpCodes < ActiveRecord::Migration[8.1]
  def change
    create_table :otp_codes do |t|
      t.string   :phone,      null: false
      t.string   :code,       null: false   # 6-digit plain text (short-lived)
      t.datetime :expires_at, null: false   # 10 minutes TTL
      t.boolean  :used,       default: false

      t.timestamps
    end

    add_index :otp_codes, :phone
  end
end
```

---

## Run Migrations

```bash
bundle exec rails db:migrate
```

---

## Todo

- [ ] Run `rails generate devise User`
- [ ] Edit migration: replace email with phone, add app fields, strip unused Devise columns
- [ ] Generate OtpCodes migration
- [ ] Run `rails db:migrate`
- [ ] Verify schema with `rails db:schema:dump` or check `db/schema.rb`
