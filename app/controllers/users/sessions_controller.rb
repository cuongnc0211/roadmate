class Users::SessionsController < Devise::SessionsController
  # Phone auth key is handled by Devise config (authentication_keys: [:phone]).

  protected

  def after_sign_in_path_for(resource)
    root_path
  end

  def after_sign_out_path_for(resource_or_scope)
    new_user_session_path
  end
end
