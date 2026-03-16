# Phase 5: Views (Signup + Login Forms)

**Status**: Complete
**Priority**: P0

---

## Overview

Customize the Devise-generated views in `app/views/users/` for phone-based auth. Mobile-first, Tailwind CSS, Vietnamese UI. Remove all email references.

---

## File: app/views/users/registrations/new.html.erb (Sign Up)

```erb
<div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
  <div class="w-full max-w-md">
    <div class="text-center mb-8">
      <h1 class="text-2xl font-bold text-gray-900">Tạo tài khoản</h1>
      <p class="text-gray-500 mt-1">Bắt đầu đi chung xe ngay hôm nay</p>
    </div>

    <%= form_for(resource, as: resource_name, url: registration_path(resource_name), html: { class: "space-y-4" }) do |f| %>
      <%= render "devise/shared/error_messages", resource: resource %>

      <%# Phone number field %>
      <div>
        <%= f.label :phone, "Số điện thoại", class: "block text-sm font-medium text-gray-700 mb-1" %>
        <%= f.telephone_field :phone,
              autofocus: true,
              autocomplete: "tel",
              placeholder: "0912 345 678",
              class: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-base" %>
        <p class="mt-1 text-xs text-gray-400">Nhập đúng số — người khác sẽ liên hệ bạn qua số này</p>
      </div>

      <%# Name field %>
      <div>
        <%= f.label :name, "Họ và tên", class: "block text-sm font-medium text-gray-700 mb-1" %>
        <%= f.text_field :name,
              autocomplete: "name",
              placeholder: "Nguyễn Văn A",
              class: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-base" %>
      </div>

      <%# Password field %>
      <div>
        <%= f.label :password, "Mật khẩu", class: "block text-sm font-medium text-gray-700 mb-1" %>
        <%= f.password_field :password,
              autocomplete: "new-password",
              placeholder: "Tối thiểu 6 ký tự",
              class: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-base" %>
      </div>

      <%# Password confirmation %>
      <div>
        <%= f.label :password_confirmation, "Xác nhận mật khẩu", class: "block text-sm font-medium text-gray-700 mb-1" %>
        <%= f.password_field :password_confirmation,
              autocomplete: "new-password",
              placeholder: "Nhập lại mật khẩu",
              class: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-base" %>
      </div>

      <%# Submit %>
      <div class="pt-2">
        <%= f.submit "Đăng ký", class: "w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-base cursor-pointer" %>
      </div>
    <% end %>

    <div class="mt-6 text-center text-sm text-gray-600">
      Đã có tài khoản?
      <%= link_to "Đăng nhập", new_user_session_path, class: "text-green-600 font-medium hover:underline" %>
    </div>
  </div>
</div>
```

---

## File: app/views/users/sessions/new.html.erb (Login)

```erb
<div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
  <div class="w-full max-w-md">
    <div class="text-center mb-8">
      <h1 class="text-2xl font-bold text-gray-900">Đăng nhập</h1>
      <p class="text-gray-500 mt-1">Chào mừng trở lại</p>
    </div>

    <%= form_for(resource, as: resource_name, url: session_path(resource_name), html: { class: "space-y-4" }) do |f| %>
      <%= render "devise/shared/error_messages", resource: resource %>

      <div>
        <%= f.label :phone, "Số điện thoại", class: "block text-sm font-medium text-gray-700 mb-1" %>
        <%= f.telephone_field :phone,
              autofocus: true,
              autocomplete: "tel",
              placeholder: "0912 345 678",
              class: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-base" %>
      </div>

      <div>
        <%= f.label :password, "Mật khẩu", class: "block text-sm font-medium text-gray-700 mb-1" %>
        <%= f.password_field :password,
              autocomplete: "current-password",
              placeholder: "Mật khẩu của bạn",
              class: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-base" %>
      </div>

      <div class="flex items-center justify-between">
        <label class="flex items-center gap-2 text-sm text-gray-600">
          <%= f.check_box :remember_me, class: "rounded border-gray-300" %>
          Ghi nhớ đăng nhập
        </label>
        <%# Forgot password link — OTP flow handled separately %>
        <%= link_to "Quên mật khẩu?", new_otp_code_path, class: "text-sm text-green-600 hover:underline" %>
      </div>

      <div class="pt-2">
        <%= f.submit "Đăng nhập", class: "w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-base cursor-pointer" %>
      </div>
    <% end %>

    <div class="mt-6 text-center text-sm text-gray-600">
      Chưa có tài khoản?
      <%= link_to "Đăng ký", new_user_registration_path, class: "text-green-600 font-medium hover:underline" %>
    </div>
  </div>
</div>
```

---

## File: app/views/devise/shared/_error_messages.html.erb

Create this partial since Devise generates it but we should ensure it works with our styling:

```erb
<% if resource.errors.any? %>
  <div class="bg-red-50 border border-red-200 rounded-lg p-4">
    <p class="text-sm font-medium text-red-800 mb-1">
      <%= pluralize(resource.errors.count, "lỗi") %> cần sửa:
    </p>
    <ul class="list-disc list-inside space-y-1">
      <% resource.errors.full_messages.each do |message| %>
        <li class="text-sm text-red-700"><%= message %></li>
      <% end %>
    </ul>
  </div>
<% end %>
```

---

## Flash Messages in Layout

Ensure `app/views/layouts/application.html.erb` renders flash:

```erb
<%# Add inside <body>, before yield %>
<% if notice.present? %>
  <div class="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg text-sm max-w-sm text-center"
       data-controller="flash" data-flash-target="message">
    <%= notice %>
  </div>
<% end %>

<% if alert.present? %>
  <div class="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg text-sm max-w-sm text-center">
    <%= alert %>
  </div>
<% end %>
```

---

## Todo

- [ ] Replace `app/views/users/registrations/new.html.erb` with phone form
- [ ] Replace `app/views/users/sessions/new.html.erb` with phone form
- [ ] Create `app/views/devise/shared/_error_messages.html.erb`
- [ ] Add flash message rendering to `app/views/layouts/application.html.erb`
- [ ] Delete unused Devise views (confirmations, mailer, passwords, unlocks) to keep codebase clean
