# frozen_string_literal: true

class DeviseCreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      ## Database authenticatable
      t.string :phone,              null: false, default: ""  # replaces :email
      t.string :encrypted_password, null: false, default: ""

      ## Rememberable
      t.datetime :remember_created_at

      ## App-specific fields
      t.string  :name,            null: false, default: ""
      t.string  :avatar_url
      t.string  :zalo_link                      # https://zalo.me/...
      t.integer :vehicle_type,    default: 0    # enum: 0=none, 1=motorbike, 2=car
      t.string  :vehicle_plate
      t.integer :available_seats
      t.float   :avg_rating,      default: 0.0
      t.integer :rating_count,    default: 0

      t.timestamps null: false
    end

    add_index :users, :phone, unique: true
  end
end
