# Phase 4: Controller Overrides

**Status**: Complete
**Priority**: P0

---

## Overview

Devise's default controllers assume email. We override `RegistrationsController` and `SessionsController` to handle phone-based auth and add app-specific logic (name field, phone normalization, signup notice).

---

## File: app/controllers/users/registrations_controller.rb

```ruby
class Users::RegistrationsController < Devise::RegistrationsController
  before_action :configure_sign_up_params, only: [:create]
  before_action :configure_account_update_params, only: [:update]

  # POST /users
  def create
    super do |resource|
      # After successful registration, flash a reminder about phone accuracy
      if resource.persisted?
        flash[:notice] = "Chào mừng #{resource.name}! Nhớ điền đúng số điện thoại để người dùng khác có thể liên hệ bạn."
      end
    end
  end

  protected

  def configure_sign_up_params
    devise_parameter_sanitizer.permit(:sign_up, keys: [:name, :phone])
  end

  def configure_account_update_params
    devise_parameter_sanitizer.permit(:account_update, keys: [:name, :phone, :avatar_url, :zalo_link, :vehicle_type, :vehicle_plate, :available_seats])
  end

  # After sign up, go to root (feed) — not the default edit profile path
  def after_sign_up_path_for(resource)
    root_path
  end

  def after_inactive_sign_up_path_for(resource)
    root_path
  end
end
```

---

## File: app/controllers/users/sessions_controller.rb

```ruby
class Users::SessionsController < Devise::SessionsController
  # Override only if custom behavior needed.
  # For now, default Devise session behavior is sufficient.
  # Phone auth key is handled by Devise config (authentication_keys: [:phone]).

  protected

  def after_sign_in_path_for(resource)
    root_path
  end

  def after_sign_out_path_for(resource_or_scope)
    new_user_session_path
  end
end
```

---

## File: app/models/user.rb

Full User model with Devise modules + phone normalization + custom validations:

```ruby
class User < ApplicationRecord
  # ==> Devise modules
  # :recoverable omitted — use ESMS OTP flow instead
  # :validatable omitted — requires email, use custom validations below
  # :trackable omitted — not needed at MVP
  # :confirmable omitted — no email confirmation
  # :lockable omitted — no account locking at MVP
  # :api_authenticatable — UNCOMMENT when building mobile app (Phase 2)
  devise :database_authenticatable,
         :registerable,
         :rememberable

  # ==> Associations
  has_many :posts, dependent: :destroy
  has_many :conversations_initiated, class_name: "Conversation",
           foreign_key: :initiator_id, dependent: :destroy
  has_many :conversations_received, class_name: "Conversation",
           foreign_key: :recipient_id, dependent: :destroy
  has_many :ratings_given,    class_name: "Rating", foreign_key: :rater_id, dependent: :destroy
  has_many :ratings_received, class_name: "Rating", foreign_key: :ratee_id

  # ==> Enums
  enum :vehicle_type, { none: 0, motorbike: 1, car: 2 }

  # ==> Validations (custom, replaces Devise :validatable)
  validates :phone, presence: true,
                    uniqueness: { case_sensitive: false },
                    format: { with: /\A\+84\d{9,10}\z/, message: "không hợp lệ (vd: +84912345678)" }
  validates :name,  presence: true, length: { minimum: 2, maximum: 100 }
  validates :password, length: { minimum: 6 }, if: :password_required?

  # ==> Scopes
  scope :with_rating, -> { where("rating_count >= 3") }
  scope :drivers,     -> { where(vehicle_type: %i[motorbike car]) }

  # ==> Callbacks
  before_validation :normalize_phone

  # ==> Override Devise login key to be phone
  def self.find_for_database_authentication(warden_conditions)
    conditions = warden_conditions.dup
    phone = conditions.delete(:phone)
    where(conditions).where(phone: normalize_phone_number(phone)).first
  end

  # ==> Helpers
  def display_rating
    return "Chưa đủ đánh giá" if rating_count < 3
    "#{avg_rating.round(1)} ★ (#{rating_count})"
  end

  def self.normalize_phone_number(phone)
    return phone if phone.blank?
    phone.strip
         .sub(/^0/, "+84")
         .sub(/^\+?84/, "+84")
  end

  private

  def normalize_phone
    self.phone = self.class.normalize_phone_number(phone) if phone.present?
  end

  def password_required?
    !persisted? || !password.nil? || !password_confirmation.nil?
  end
end
```

---

## Notes

- `find_for_database_authentication` is the Devise hook for looking up a user by auth key. We normalize the phone here so `0912345678` and `+84912345678` both work at login.
- `password_required?` mirrors Devise's `validatable` behavior for updates.
- The `# :api_authenticatable` comment is intentional — serves as a reminder for the mobile phase.

---

## Todo

- [ ] Create `app/controllers/users/registrations_controller.rb`
- [ ] Create `app/controllers/users/sessions_controller.rb`
- [ ] Write `app/models/user.rb` with Devise modules + validations + phone normalization
- [ ] Verify model loads: `rails runner "User.new.valid?; puts 'OK'"`
