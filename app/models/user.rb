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

  # ==> Active Storage
  has_one_attached :avatar do |attachable|
    attachable.variant :thumb, resize_to_limit: [ 400, 400 ]
  end

  # ==> Associations
  has_many :rides, dependent: :destroy
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
  validates :zalo_link,
            format: { with: /\Ahttps:\/\/zalo\.me\/.+\z/, message: "phải có dạng https://zalo.me/..." },
            allow_blank: true
  # available_seats required when user has a vehicle (max 8 seats covers largest passenger vans)
  validates :available_seats,
            presence: { message: "bắt buộc khi có xe" },
            numericality: { only_integer: true, greater_than: 0, less_than_or_equal_to: 8 },
            if: -> { motorbike? || car? }
  validate :avatar_content_type_and_size, if: -> { avatar.attached? && avatar.changed? }

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

  # Returns Active Storage avatar variant if attached, nil otherwise
  def avatar_thumb
    avatar.attached? ? avatar.variant(:thumb) : nil
  end

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

  def avatar_content_type_and_size
    allowed_types = %w[image/jpeg image/png image/webp]
    unless allowed_types.include?(avatar.blob.content_type)
      errors.add(:avatar, "phải là ảnh JPG, PNG hoặc WebP")
    end
    if avatar.blob.byte_size > 5.megabytes
      errors.add(:avatar, "không được vượt quá 5MB")
    end
  end
end
