# RoadMate — Code Standards & Conventions

## Overview

This document defines the coding standards, naming conventions, and architectural patterns for RoadMate. All code should follow these standards unless there's a strong reason to deviate.

**Guiding Principles**: YAGNI (You Aren't Gonna Need It) — KISS (Keep It Simple, Stupid) — DRY (Don't Repeat Yourself)

---

## Language & File Naming

### Ruby Files
- **Convention**: snake_case
- **Models**: `app/models/user.rb`, `app/models/post.rb`
- **Controllers**: `app/controllers/sessions_controller.rb`, `app/controllers/posts_controller.rb`
- **Jobs**: `app/jobs/post_expiry_job.rb`, `app/jobs/recurring_post_creator_job.rb`
- **Mailers**: `app/mailers/password_reset_mailer.rb`
- **Services**: `app/services/user_authenticator.rb`, `app/services/post_creator.rb`
- **Tests**: `spec/models/user_spec.rb`, `spec/requests/posts_spec.rb`

### JavaScript Files
- **Convention**: PascalCase for Stimulus controllers, snake_case for utilities
- **Stimulus Controllers**: `app/javascript/controllers/form_controller.js`, `app/javascript/controllers/message_poll_controller.js`
- **Utilities**: `app/javascript/utils/phone_formatter.js`

### ERB Templates
- **Convention**: snake_case, match controller/action names
- **Routes**: `app/views/posts/index.html.erb`, `app/views/conversations/show.html.erb`
- **Partials**: `app/views/posts/_form.html.erb`, `app/views/messages/_message.html.erb`

---

## Naming Conventions

### Models & Classes
- **Case**: PascalCase
- **Singular**: `class User`, `class Post`, `class Conversation`
- **Suffixes**: Append `Error` for exceptions, `Service` for service objects (optional)
- **Avoid**: Generic names (`Handler`, `Manager`, `Processor` without context)

```ruby
# Good
class User < ApplicationRecord
  # ...
end

class PostCreator
  def initialize(params, user)
    # ...
  end
end

class AuthenticationError < StandardError
  # ...
end

# Avoid
class UserHandler
  # ...
end

class DoStuff
  # ...
end
```

### Methods & Variables
- **Case**: snake_case
- **Predicates**: Start with `is_`, `has_`, `can_` for boolean methods
- **Avoid**: Single-letter variables except in loops (`i`, `j`), use meaningful names

```ruby
# Good
def authenticate(phone, password)
  # ...
end

def can_contact_user?(current_user, target_user)
  # ...
end

def post_expired?
  created_at < 24.hours.ago
end

posts.each do |post|
  # ...
end

# Avoid
def auth
  # ...
end

def x
  # ...
end

def process
  # ...
end
```

### Constants
- **Case**: UPPER_SNAKE_CASE
- **Placement**: At top of class, grouped by concern

```ruby
class Post < ApplicationRecord
  # Post types
  POST_TYPES = {
    offer: 0,
    request: 1
  }.freeze

  # Status values
  STATUSES = {
    active: 0,
    closed: 1,
    expired: 2
  }.freeze

  # Validation constants
  MAX_NOTE_LENGTH = 500
  MIN_PRICE = 5_000  # VNĐ
  MAX_PRICE = 500_000
  POST_EXPIRY_HOURS = 24
end
```

### Database & Migrations
- **Tables**: Plural, snake_case: `users`, `posts`, `conversations`, `messages`
- **Columns**: snake_case, singular: `user_id`, `post_id`, `sender_id`
- **Foreign Keys**: Explicit naming with `_id`: `post_id`, `user_id`, `conversation_id`
- **Timestamps**: Rails defaults (`created_at`, `updated_at`)
- **Booleans**: Prefix with `is_` or `has_` if ambiguous: `is_recurring`, `has_avatar`
- **Indexes**: Name for clarity: `index_users_on_phone`, `index_posts_on_user_id_and_status`

---

## Model Conventions

### Association Definitions (with has_secure_password)
```ruby
class User < ApplicationRecord
  # Password hashing (define first)
  has_secure_password

  # Associations
  has_many :rides, dependent: :destroy
  has_many :ride_requests, foreign_key: :requester_id, dependent: :destroy
  has_many :ratings_given, class_name: "Rating", foreign_key: :rater_id, dependent: :destroy
  has_many :ratings_received, class_name: "Rating", foreign_key: :ratee_id

  # Enums
  enum vehicle_type: { none: 0, motorbike: 1, car: 2 }

  # Validations
  validates :phone, presence: true, uniqueness: true, format: { with: /\A(\+84|0)\d{9,10}\z/ }
  validates :name, presence: true, length: { minimum: 2, maximum: 100 }
  validates :password, presence: true, on: :create
  validates :password, length: { minimum: 6 }, allow_nil: true

  # Scopes
  scope :with_rating, -> { where("rating_count >= 3") }
  scope :drivers, -> { where(vehicle_type: %i[motorbike car]) }

  # Callbacks
  before_save :normalize_phone

  # Notes:
  # - has_secure_password provides: password=, password_digest, authenticate(password)
  # - Session managed via session[:user_id] (60 days via Rails.application.config.session_options)
  # - No Devise complexity: just phone + password + session

  private

  def normalize_phone
    # Format: +84 or 0xx → +84xxxxxxxxx
    if phone.present?
      self.phone = phone.sub(/^0/, '+84') if phone.start_with?('0')
      self.phone = '+84' + phone.sub(/^\+84/, '') if phone.start_with?('+84')
    end
  end
end
```

### Validation Pattern
```ruby
class Ride < ApplicationRecord
  validates :user_id, presence: true
  validates :ride_type, inclusion: { in: ride_types.keys }
  validates :vehicle_type, inclusion: { in: %i[motorbike car any] }
  validates :origin, :destination, presence: true
  validates :depart_at, presence: true
  validates :depart_at, comparison: { greater_than: Time.current, message: "must be in the future" }
  validates :price_suggestion, numericality: { greater_than: 0, less_than_or_equal_to: 500_000 }, allow_nil: true
  validates :seats_available, numericality: { greater_than: 0, less_than_or_equal_to: 8 }, if: :offer?
  validates :origin_district, :dest_district, presence: true
end
```

### Enum Usage
```ruby
# Good: Define with hash in model
class Ride < ApplicationRecord
  enum ride_type: { offer: 0, request: 1 }
  enum status: { active: 0, matched: 1, full: 2, expired: 3, cancelled: 4 }
end

class RideRequest < ApplicationRecord
  enum direction: { booking: 0, offer: 1 }
  enum status: { pending: 0, accepted: 1, declined: 2, cancelled: 3 }
end

# Usage
ride.offer?                  # true/false
ride.ride_type = :request
ride.active?                 # true/false
ride_request.booking?        # true/false

# Bad: String enums, no validation
ride.ride_type = "offer"     # Invalid
```

---

## Controller Conventions

### RESTful Routes & Actions
```ruby
# config/routes.rb
Rails.application.routes.draw do
  root "rides#index"

  resources :users, only: %i[new create show edit update]
  resources :rides, only: %i[index new create show edit update destroy] do
    resources :ride_requests, only: %i[index create] do
      member do
        patch :accept   # PATCH /rides/:ride_id/ride_requests/:id/accept
        patch :decline  # PATCH /rides/:ride_id/ride_requests/:id/decline
      end
      resources :messages, only: %i[index create], controller: 'ride_request_messages'
    end
  end

  resources :ratings, only: %i[new create]
end
```

### Controller Actions
```ruby
class RidesController < ApplicationController
  before_action :authenticate_user!, except: %i[index show]
  before_action :set_ride, only: %i[show edit update destroy]
  before_action :authorize_user!, only: %i[edit update destroy]

  # Index: List all rides with filters
  def index
    @rides = Ride.active
                  .where(origin_district: filter_params[:origin_district])
                  .where(dest_district: filter_params[:dest_district])
                  .order(depart_at: :asc)
                  .page(params[:page])

    render :index
  end

  # New: Show form for new ride
  def new
    @ride = current_user.rides.build
    render :new
  end

  # Create: Save new ride
  def create
    @ride = current_user.rides.build(ride_params)
    if @ride.save
      redirect_to @ride, notice: "Ride created"
    else
      render :new, status: :unprocessable_entity
    end
  end

  # Show: Display single ride
  def show
    @ride_requests = @ride.ride_requests.pending
    render :show
  end

  # Edit: Show edit form
  def edit
    render :edit
  end

  # Update: Save changes
  def update
    if @ride.update(ride_params)
      redirect_to @ride, notice: "Ride updated"
    else
      render :edit, status: :unprocessable_entity
    end
  end

  # Destroy: Delete ride
  def destroy
    @ride.destroy
    redirect_to rides_url, notice: "Ride deleted"
  end

  private

  def set_ride
    @ride = Ride.find(params[:id])
  end

  def authorize_user!
    redirect_to @ride, alert: "Unauthorized" unless @ride.user_id == current_user.id
  end

  def ride_params
    params.require(:ride).permit(:ride_type, :vehicle_type, :origin, :destination,
                                   :origin_district, :dest_district, :depart_at,
                                   :price_suggestion, :seats_available, :note,
                                   :recurring, :recurring_days)
  end

  def filter_params
    params.permit(:origin_district, :dest_district, :ride_type, :vehicle_type)
  end
end
```

### Authentication & Authorization (with has_secure_password)
```ruby
class ApplicationController < ActionController::Base
  helper_method :current_user, :user_signed_in?

  private

  def current_user
    return @current_user if defined?(@current_user)
    @current_user = session[:user_id] ? User.find_by(id: session[:user_id]) : nil
  end

  def user_signed_in?
    current_user.present?
  end

  def authenticate_user!
    redirect_to new_session_path, alert: "Sign in required" unless user_signed_in?
  end

  def authorize_user!(user)
    redirect_to root_path, alert: "Unauthorized" unless current_user == user
  end
end

# Manual routes (no Devise generators):
# GET    /users/new (signup form)
# POST   /users (create account)
# GET    /sessions/new (login form)
# POST   /sessions (create session)
# DELETE /sessions (logout)
# GET    /users/edit (edit profile)
# PATCH  /users (update profile)
```

---

## View Layer (ERB & Turbo)

### Template Organization
```erb
<!-- app/views/rides/index.html.erb -->
<main class="container mx-auto px-4 py-8">
  <h1>Find a Ride</h1>

  <%= render "shared/filters" %>

  <div id="rides-list">
    <%= render @rides, locals: { user: current_user } %>
  </div>

  <%= paginate @rides %>
</main>
```

### Partial Usage
```erb
<!-- app/views/rides/_ride.html.erb -->
<div class="card mb-4">
  <h3><%= ride.destination %></h3>
  <p>From: <%= ride.origin %> | Departure: <%= ride.depart_at.strftime('%H:%M') %></p>
  <p>Price: <%= number_to_currency(ride.price_suggestion, unit: "₫") %></p>

  <% if ride.user == user %>
    <%= link_to "Edit", edit_ride_path(ride), class: "btn btn-secondary" %>
    <%= link_to "Close", ride_path(ride), method: :delete, class: "btn btn-danger" %>
  <% else %>
    <%= link_to "Book/Offer", ride_ride_requests_path(ride), method: :post, class: "btn btn-primary" %>
  <% end %>
</div>
```

### Turbo Frames
```erb
<!-- Turbo Frame for ride request messages -->
<%= turbo_frame_tag "messages-#{@ride_request.id}", src: ride_ride_request_messages_path(@ride, @ride_request), loading: "lazy" do %>
  <p>Loading messages...</p>
<% end %>

<!-- Form with Turbo -->
<%= form_with model: [@ride, @ride_request, @message], local: true, class: "mt-4" do |f| %>
  <%= f.text_area :body, placeholder: "Type a message...", class: "form-control" %>
  <%= f.submit "Send", class: "btn btn-primary" %>
<% end %>
```

### Stimulus Integration
```erb
<!-- Message polling with Stimulus -->
<div data-controller="ride-message-poll"
     data-ride-message-poll-url="<%= ride_ride_request_messages_path(@ride, @ride_request) %>">
  <div id="messages">
    <%= render @messages %>
  </div>
</div>
```

---

## JavaScript & Stimulus

### Stimulus Controller Pattern
```javascript
// app/javascript/controllers/form_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["submit", "spinner"]
  static values = { submitUrl: String }

  connect() {
    console.log("Form controller connected")
  }

  submit(event) {
    this.submitTarget.disabled = true
    this.spinnerTarget?.classList.remove("hidden")
  }

  disconnect() {
    console.log("Form controller disconnected")
  }
}
```

### Stimulus for Ride Message Polling (10s interval)
```javascript
// app/javascript/controllers/ride_message_poll_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { url: String, interval: { type: Number, default: 10 } }

  connect() {
    this.poll()
    this.intervalId = setInterval(() => this.poll(), this.intervalValue * 1000)
  }

  disconnect() {
    clearInterval(this.intervalId)
  }

  poll() {
    fetch(this.urlValue)
      .then(response => response.text())
      .then(html => {
        // Update via Turbo Frame
        Turbo.connectStreamSource({
          send: (data) => { /* noop */ }
        })
        this.element.innerHTML = html
        this.scrollToBottom()
      })
  }

  scrollToBottom() {
    const messages = this.element.querySelector('[id*="messages"]')
    if (messages) messages.scrollTop = messages.scrollHeight
  }
}
```

---

## Background Jobs (Sidekiq + Redis)

### Job Pattern
```ruby
# app/jobs/expire_rides_job.rb
class ExpireRidesJob < ApplicationJob
  queue_as :default

  def perform
    # Expire rides: depart_at < 1 hour ago
    Ride.where(status: %i[active matched])
        .where("depart_at < ?", 1.hour.ago)
        .update_all(status: :expired)

    # Mark full rides if no seats left
    Ride.active.where(seats_available: 0)
        .update_all(status: :full)

    Rails.logger.info "Expired #{Ride.expired.count} rides"
  rescue StandardError => e
    Rails.logger.error "ExpireRidesJob failed: #{e.message}"
    raise
  end
end

# app/jobs/recurring_ride_job.rb
class RecurringRideJob < ApplicationJob
  def perform(ride_id)
    ride = Ride.find(ride_id)
    return unless ride.recurring? && ride.expired?

    # Create next day's ride if matches recurring_days
    tomorrow = ride.depart_at + 1.day
    if ride.recurring_days.include?(tomorrow.wday)
      Ride.create(
        user_id: ride.user_id,
        ride_type: ride.ride_type,
        vehicle_type: ride.vehicle_type,
        origin: ride.origin,
        destination: ride.destination,
        origin_district: ride.origin_district,
        dest_district: ride.dest_district,
        depart_at: tomorrow,
        price_suggestion: ride.price_suggestion,
        seats_available: ride.seats_available,
        note: ride.note,
        recurring: true,
        recurring_days: ride.recurring_days
      )
    end
  end
end

# app/jobs/otp_cleanup_job.rb
class OtpCleanupJob < ApplicationJob
  def perform
    OtpCode.where("expires_at < ?", Time.current)
           .or(OtpCode.where(used: true))
           .delete_all
  end
end
```

### Scheduling (Sidekiq)
```ruby
# config/sidekiq.yml
:concurrency: 3
:timeout: 25
:verbose: false
:queues:
  - default
  - critical

# Or use Sidekiq::Cron (gem 'sidekiq-cron')
Sidekiq::Cron::Job.create(
  name: 'ExpireRides',
  cron: '*/15 * * * *',  # Every 15 min
  class: 'ExpireRidesJob'
)
```

---

## Testing Strategy (Minimal at MVP)

**Note:** No automated tests at MVP. Manual testing only. When tests added, follow RSpec + FactoryBot.

### Test File Structure Example
```ruby
# spec/models/user_spec.rb
RSpec.describe User do
  describe "validations" do
    it { is_expected.to validate_presence_of(:phone) }
    it { is_expected.to validate_uniqueness_of(:phone) }
  end

  describe "#authenticate" do
    let(:user) { create(:user, password: "secret123") }

    it "authenticates with correct password" do
      expect(user.authenticate("secret123")).to be_truthy
    end

    it "returns false with incorrect password" do
      expect(user.authenticate("wrong")).to be_falsy
    end
  end
end

# spec/requests/rides_spec.rb
RSpec.describe "Rides" do
  describe "GET /rides" do
    it "returns all active rides" do
      create(:ride, status: :active)
      create(:ride, status: :expired)

      get rides_path
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("active")
    end
  end
end
```

### Factory Setup (has_secure_password)
```ruby
# spec/factories/users.rb
FactoryBot.define do
  factory :user do
    phone { "+84" + Faker::Number.number(digits: 9).to_s }
    password { "password123" }
    password_confirmation { "password123" }
    name { Faker::Name.name }
    vehicle_type { :none }
  end
end

# spec/factories/rides.rb
FactoryBot.define do
  factory :ride do
    user
    ride_type { :offer }
    vehicle_type { :car }
    origin { "Hà Nội, Đống Đa" }
    destination { "Hoà Lạc" }
    origin_district { "Đống Đa" }
    dest_district { "Hoà Lạc" }
    depart_at { 1.day.from_now }
    price_suggestion { 50_000 }
    seats_available { 3 }
    status { :active }
  end
end
```

---

## Security Best Practices

### Strong Parameters
```ruby
def create
  user = User.new(user_params)
  user.save!
end

private

def user_params
  params.require(:user).permit(:phone, :password, :name, :avatar_url)
end
```

### SQL Injection Prevention
```ruby
# Good: Parameterized queries
User.where("phone = ?", phone)
User.where(phone: phone)

# Avoid: String interpolation
User.where("phone = '#{phone}'")  # VULNERABLE
```

### XSS Prevention
```erb
<!-- ERB auto-escapes HTML -->
<%= post.note %>            <!-- Safe: &lt;script&gt; rendered as text -->
<%= link_to post.title, post_path(post) %>  <!-- Safe: auto-escaped -->

<!-- Use .html_safe only for generated HTML, never user input -->
<%= sanitize(post.note, tags: %w[b i], attributes: %w[class]) %>
```

### Rate Limiting (OTP)
```ruby
class OtpCodesController < ApplicationController
  before_action :rate_limit_otp_request

  private

  def rate_limit_otp_request
    cache_key = "otp_requests:#{request_params[:phone]}"
    count = Rails.cache.increment(cache_key, 1, expires_in: 1.hour)

    if count > 3
      render json: { error: "Too many requests. Try again later." }, status: :too_many_requests
    end
  end
end
```

---

## Performance Considerations

### N+1 Query Prevention
```ruby
# Bad: Loads user for each conversation
conversations.each { |c| puts c.initiator.name }

# Good: Use includes
Conversation.includes(:initiator, :recipient).each { |c| puts c.initiator.name }
```

### Caching
```ruby
def show
  @post = Post.find(params[:id])
  @rating = Rails.cache.fetch("post:#{@post.id}:rating", expires_in: 1.hour) do
    @post.ratings.average(:score)
  end
end
```

---

## Comments & Documentation

### When to Comment
- **Why**, not what: Explain business logic, non-obvious decisions
- **Before complex algorithms**: Add pseudocode if logic spans 10+ lines
- **On constants**: Document magic numbers

```ruby
# Good: Explains business decision
# Expire posts after 24h to encourage fresh listings
POST_EXPIRY_HOURS = 24

# Avoid: Obvious comments
user.save  # Save the user
```

### Method Documentation
```ruby
# For complex methods, add a brief summary
#
# Finds or creates a conversation between two users on a post.
# Ensures only one conversation per (post, initiator) pair exists.
#
# Args:
#   post_id - The post ID (Integer)
#   initiator_id - The user initiating contact (Integer)
#
# Returns:
#   Conversation object
#
def self.find_or_create_conversation(post_id, initiator_id)
  # ...
end
```

---

## Linting & Formatting

### RuboCop
```bash
# Auto-format code
bundle exec rubocop -A

# Check only
bundle exec rubocop

# Use omakase preset (no custom config needed)
# See .rubocop.yml
```

### Brakeman (Security)
```bash
bundle exec brakeman --quiet
```

### Bundler Audit
```bash
bundle exec bundler-audit check
```

---

## File Organization Rules

### Keep Files Small
- Models: <300 lines
- Controllers: <200 lines
- Services: <150 lines
- Split large files into separate classes/modules

### Services for Complex Logic
Extract to service object when:
- Logic spans multiple models
- Would add >50 lines to controller
- Needs testing independently

```ruby
# app/services/conversation_initiator.rb
class ConversationInitiator
  def initialize(post, user)
    @post = post
    @user = user
  end

  def call
    raise "Cannot contact yourself" if @post.user_id == @user.id

    Conversation.find_or_create_by(
      post_id: @post.id,
      initiator_id: @user.id,
      recipient_id: @post.user_id
    )
  end
end

# Usage in controller
conversation = ConversationInitiator.new(post, current_user).call
```

---

## Summary Checklist

Before committing code:
- [ ] Follows snake_case/PascalCase naming
- [ ] No N+1 queries in features
- [ ] Validations on model layer
- [ ] Controllers are thin (<200 lines)
- [ ] Views don't have complex logic
- [ ] No sensitive data in logs
- [ ] Tests pass (if applicable)
- [ ] Runs `rubocop -A` locally
- [ ] Runs `brakeman --quiet` locally
