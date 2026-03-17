class ProfilesController < ApplicationController
  before_action :authenticate_user!
  before_action :set_profile_user, only: [:show]

  # GET /profile/:id — public profile of any user
  def show
  end

  # GET /profile/edit — edit own profile
  def edit
    @user = current_user
  end

  # PATCH /profile — update own profile
  def update
    @user = current_user
    if @user.update(profile_params)
      redirect_to user_profile_path(@user), notice: "Hồ sơ đã được cập nhật."
    else
      render :edit, status: :unprocessable_entity
    end
  end

  private

  def set_profile_user
    @user = User.find(params[:id])
  end

  def profile_params
    params.require(:user).permit(
      :name, :avatar, :zalo_link,
      :vehicle_type, :vehicle_plate, :available_seats
    )
  end
end
