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
  enum :vehicle_type, { no_vehicle: 0, motorbike: 1, car: 2 }

  # ==> Validations (custom, replaces Devise :validatable)
  validates :phone, presence: true,
                    uniqueness: { case_sensitive: false },
                    format: { with: /\A\+84\d{9,10}\z/, message: "không hợp lệ (vd: +84912345678)" }
  validates :name,  presence: true, length: { minimum: 2, maximum: 100 }
  validates :password, length: { minimum: 6 }, if: :password_required?

  # ==> Scopes
  scope :with_rating, -> { where("rating_count >= 3") }
  scope :drivers, -> { where(vehicle_type: %i[motorbike car]) }

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
    digits = phone.strip.gsub(/\D/, "")
    case digits
    when /\A84(\d{9,10})\z/  then "+84#{$1}"
    when /\A0(\d{9,10})\z/   then "+84#{$1}"
    else phone.strip
    end
  end

  private

  def normalize_phone
    self.phone = self.class.normalize_phone_number(phone) if phone.present?
  end

  def password_required?
    !persisted? || !password.nil? || !password_confirmation.nil?
  end
end
