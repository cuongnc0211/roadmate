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
