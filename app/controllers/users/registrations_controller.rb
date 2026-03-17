class Users::RegistrationsController < Devise::RegistrationsController
  before_action :configure_sign_up_params, only: [:create]
  before_action :configure_account_update_params, only: [:update]

  # POST /users
  def create
    super do |resource|
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
    devise_parameter_sanitizer.permit(:account_update, keys: [:name, :phone, :zalo_link,
                                                               :vehicle_type, :vehicle_plate, :available_seats])
  end

  # After sign up, redirect to profile edit so user completes their profile
  def after_sign_up_path_for(resource)
    edit_profile_path
  end

  def after_inactive_sign_up_path_for(resource)
    root_path
  end
end
