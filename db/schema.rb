# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_03_16_103928) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "otp_codes", force: :cascade do |t|
    t.string "code", null: false
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.string "phone", null: false
    t.datetime "updated_at", null: false
    t.boolean "used", default: false
    t.index ["phone"], name: "index_otp_codes_on_phone"
  end

  create_table "users", force: :cascade do |t|
    t.integer "available_seats"
    t.string "avatar_url"
    t.float "avg_rating", default: 0.0
    t.datetime "created_at", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "name", default: "", null: false
    t.string "phone", default: "", null: false
    t.integer "rating_count", default: 0
    t.datetime "remember_created_at"
    t.datetime "updated_at", null: false
    t.string "vehicle_plate"
    t.integer "vehicle_type", default: 0
    t.string "zalo_link"
    t.index ["phone"], name: "index_users_on_phone", unique: true
  end
end
