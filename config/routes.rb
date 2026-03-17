Rails.application.routes.draw do
  # Devise auth routes — custom controllers for phone-based auth
  devise_for :users,
    controllers: {
      registrations: "users/registrations",
      sessions:      "users/sessions"
    }

  # Profile routes — edit before :id to avoid "edit" matching as ID param
  get  "profile/edit",  to: "profiles#edit",   as: :edit_profile
  patch "profile",      to: "profiles#update",  as: :profile
  get  "profile/:id",   to: "profiles#show",    as: :user_profile

  # Health check
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  root "landing#index"
end
