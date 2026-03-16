# Phase 6: Routes + ApplicationController

**Status**: Complete
**Priority**: P0

---

## Overview

Wire Devise routes with custom controllers. Update `ApplicationController` to replace manual `current_user` / `authenticate_user!` helpers with Devise-provided ones. Remove `UserAuthenticator` service (no longer needed).

---

## config/routes.rb

```ruby
Rails.application.routes.draw do
  # Devise auth routes — custom controllers for phone-based auth
  devise_for :users,
    controllers: {
      registrations: "users/registrations",
      sessions:      "users/sessions"
    }

  # Future: API token routes for mobile (Phase 2)
  # devise_for :users, defaults: { format: :json }, path: "api/v1/users", only: []
  # use_doorkeeper  # or devise_api routes here

  # App routes
  root "landing#index"

  # Health check
  get "up" => "rails/health#show", as: :rails_health_check

  # PWA
  get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker
end
```

**Key Devise route helpers generated:**
```
new_user_registration_path  → GET  /users/sign_up
user_registration_path      → POST /users
new_user_session_path       → GET  /users/sign_in
user_session_path           → POST /users/sign_in
destroy_user_session_path   → DELETE /users/sign_out
```

---

## app/controllers/application_controller.rb

Devise provides `current_user`, `user_signed_in?`, and `authenticate_user!` automatically. We just need to add Turbo Stream CSRF protection and any app-wide helpers.

```ruby
class ApplicationController < ActionController::Base
  # Protect against CSRF — required for Devise + Turbo
  protect_from_forgery with: :exception

  # Devise + Turbo: handle auth redirects properly
  before_action :configure_permitted_parameters, if: :devise_controller?

  protected

  def configure_permitted_parameters
    devise_parameter_sanitizer.permit(:sign_up,         keys: [:name, :phone])
    devise_parameter_sanitizer.permit(:account_update,  keys: [:name, :phone, :avatar_url, :zalo_link,
                                                                :vehicle_type, :vehicle_plate, :available_seats])
  end
end
```

**Note**: `current_user`, `user_signed_in?`, `authenticate_user!` are all provided by Devise — no manual implementation needed. Remove any previous `current_user` / `logged_in?` / `authenticate_user!` methods if they exist.

---

## Remove: app/services/user_authenticator.rb

The `UserAuthenticator` service object (listed in system-architecture.md) is no longer needed — Devise handles this. Delete the file when it is created, or simply don't create it.

---

## Nav / Layout: sign in/out links

Add to `app/views/layouts/application.html.erb`:

```erb
<nav>
  <% if user_signed_in? %>
    <%= link_to "Trang chủ", root_path %>
    <%= link_to "Tài khoản", edit_user_registration_path %>
    <%= button_to "Đăng xuất", destroy_user_session_path, method: :delete,
          class: "text-sm text-gray-600 hover:text-red-600" %>
  <% else %>
    <%= link_to "Đăng nhập", new_user_session_path %>
    <%= link_to "Đăng ký", new_user_registration_path %>
  <% end %>
</nav>
```

---

## Todo

- [ ] Update `config/routes.rb` with `devise_for` block pointing to custom controllers
- [ ] Update `app/controllers/application_controller.rb` — use Devise helpers, add `configure_permitted_parameters`
- [ ] Remove any manual `current_user`, `logged_in?`, `authenticate_user!` from ApplicationController
- [ ] Add nav sign-in/sign-out links to application layout
- [ ] Verify routes with `rails routes | grep user`
