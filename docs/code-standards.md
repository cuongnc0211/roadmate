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

### Association Definitions
```ruby
class User < ApplicationRecord
  # Associations (define first)
  has_many :posts, dependent: :destroy
  has_many :conversations_initiated, class_name: "Conversation", foreign_key: :initiator_id, dependent: :destroy
  has_many :conversations_received, class_name: "Conversation", foreign_key: :recipient_id, dependent: :destroy
  has_many :ratings_given, class_name: "Rating", foreign_key: :rater_id, dependent: :destroy
  has_many :ratings_received, class_name: "Rating", foreign_key: :ratee_id

  # Enums (after associations)
  enum vehicle_type: { none: 0, motorbike: 1, car: 2 }

  # Validations (after enums)
  validates :phone, presence: true, uniqueness: true, format: { with: /\A\+84\d{9,10}\z/ }
  validates :password_digest, presence: true
  validates :name, presence: true, length: { minimum: 2, maximum: 100 }

  # Scopes (after validations)
  scope :with_rating, -> { where("rating_count >= 3") }
  scope :drivers, -> { where(vehicle_type: %i[motorbike car]) }

  # Callbacks (after scopes)
  before_save :normalize_phone

  # Custom methods (last)
  def authenticate(password)
    BCrypt::Password.new(password_digest) == password
  end

  private

  def normalize_phone
    # Format: +84 or 0xx → +84xxxxxxxxx
    self.phone = phone.sub(/^0/, '+84').sub(/^\+?84/, '+84') if phone.present?
  end
end
```

### Validation Pattern
```ruby
class Post < ApplicationRecord
  validates :user_id, presence: true
  validates :post_type, inclusion: { in: post_types.keys }
  validates :vehicle_type, inclusion: { in: %i[motorbike car any] }
  validates :origin, :destination, presence: true
  validates :depart_at, presence: true
  validates :depart_at, comparison: { greater_than: Time.current, message: "must be in the future" }
  validates :price_suggestion, numericality: { greater_than: 0, less_than_or_equal_to: 500_000 }, allow_nil: true
  validates :seats_available, numericality: { greater_than: 0, less_than_or_equal_to: 8 }, if: :offer?
end
```

### Enum Usage
```ruby
# Good: Define with hash in model
class Post < ApplicationRecord
  enum post_type: { offer: 0, request: 1 }
  enum status: { active: 0, closed: 1, expired: 2 }
end

# Usage
post.offer?                  # true/false
post.post_type = :request
post.active?                 # t/f

# Bad: String enums, no validation
post.post_type = "offer"     # Invalid
```

---

## Controller Conventions

### RESTful Routes & Actions
```ruby
# config/routes.rb
Rails.application.routes.draw do
  root "posts#index"

  resources :users, only: %i[new create show edit update]
  resources :posts, only: %i[index new create show edit update destroy] do
    member do
      post :contact  # POST /posts/:id/contact → create conversation
    end
  end

  resources :conversations, only: %i[index show] do
    resources :messages, only: %i[create]  # POST /conversations/:conversation_id/messages
  end

  resources :ratings, only: %i[create]
end
```

### Controller Actions
```ruby
class PostsController < ApplicationController
  before_action :authenticate_user!, except: %i[index show]
  before_action :set_post, only: %i[show edit update destroy contact]
  before_action :authorize_user!, only: %i[edit update destroy]

  # Index: List all posts with filters
  def index
    @posts = Post.active
                  .where(origin_district: filter_params[:origin_district]) if filter_params[:origin_district]
                  .where(post_type: filter_params[:post_type]) if filter_params[:post_type]
                  .order(depart_at: :asc)
                  .page(params[:page])

    render :index
  end

  # New: Show form for new post
  def new
    @post = current_user.posts.build
    render :new
  end

  # Create: Save new post
  def create
    @post = current_user.posts.build(post_params)
    if @post.save
      redirect_to @post, notice: "Post created"
    else
      render :new, status: :unprocessable_entity
    end
  end

  # Show: Display single post
  def show
    render :show
  end

  # Edit: Show edit form
  def edit
    render :edit
  end

  # Update: Save changes
  def update
    if @post.update(post_params)
      redirect_to @post, notice: "Post updated"
    else
      render :edit, status: :unprocessable_entity
    end
  end

  # Destroy: Delete post
  def destroy
    @post.destroy
    redirect_to posts_url, notice: "Post deleted"
  end

  # Contact: Create conversation (custom action)
  def contact
    conversation = Conversation.find_or_create_by(post_id: @post.id, initiator_id: current_user.id)
    redirect_to conversation, notice: "Contact request sent"
  rescue StandardError => e
    redirect_to @post, alert: e.message
  end

  private

  def set_post
    @post = Post.find(params[:id])
  end

  def authorize_user!
    redirect_to @post, alert: "Unauthorized" unless @post.user_id == current_user.id
  end

  def post_params
    params.require(:post).permit(:post_type, :vehicle_type, :origin, :destination, :origin_district, :dest_district, :depart_at, :price_suggestion, :seats_available, :note, :recurring, :recurring_days)
  end

  def filter_params
    params.permit(:origin_district, :dest_district, :post_type, :vehicle_type)
  end
end
```

### Authentication & Authorization
```ruby
class ApplicationController < ActionController::Base
  helper_method :current_user, :logged_in?

  private

  def current_user
    @current_user ||= User.find(session[:user_id]) if session[:user_id]
  end

  def logged_in?
    current_user.present?
  end

  def authenticate_user!
    redirect_to new_session_path, alert: "Please log in" unless logged_in?
  end
end
```

---

## View Layer (ERB & Turbo)

### Template Organization
```erb
<!-- app/views/posts/index.html.erb -->
<main class="container mx-auto px-4 py-8">
  <h1>Find a Ride</h1>

  <%= render "shared/filters", posts_path: posts_path %>

  <div id="posts-list">
    <%= render @posts, locals: { user: current_user } %>
  </div>

  <%= paginate @posts %>
</main>
```

### Partial Usage
```erb
<!-- app/views/posts/_post.html.erb -->
<div class="card mb-4">
  <h3><%= post.destination %></h3>
  <p>From: <%= post.origin %> | Departure: <%= post.depart_at.strftime('%H:%M') %></p>
  <p>Price: <%= number_to_currency(post.price_suggestion, unit: "₫") %></p>

  <% if post.user == user %>
    <%= link_to "Edit", edit_post_path(post), class: "btn btn-secondary" %>
    <%= link_to "Close", post_path(post), method: :delete, class: "btn btn-danger" %>
  <% else %>
    <%= link_to "Contact", contact_post_path(post), method: :post, class: "btn btn-primary" %>
  <% end %>
</div>
```

### Turbo Frames
```erb
<!-- Turbo Frame for dynamic updates -->
<%= turbo_frame_tag "messages-#{@conversation.id}", src: messages_path(@conversation), loading: "lazy" do %>
  <p>Loading messages...</p>
<% end %>

<!-- Form with Turbo -->
<%= form_with model: @message, local: true, class: "mt-4" do |f| %>
  <%= f.hidden_field :conversation_id, value: @conversation.id %>
  <%= f.text_area :body, placeholder: "Type a message...", class: "form-control" %>
  <%= f.submit "Send", class: "btn btn-primary" %>
<% end %>
```

### Stimulus Integration
```erb
<!-- Message polling with Stimulus -->
<div data-controller="message-poll" data-message-poll-url="<%= messages_path(@conversation) %>">
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
    this.spinnerTarget.classList.remove("hidden")
  }

  disconnect() {
    console.log("Form controller disconnected")
  }
}
```

### Stimulus for Message Polling
```javascript
// app/javascript/controllers/message_poll_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { url: String, interval: Number }

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
        this.element.innerHTML = html
        this.scrollToBottom()
      })
  }

  scrollToBottom() {
    this.element.scrollTop = this.element.scrollHeight
  }
}
```

---

## Background Jobs (Solid Queue)

### Job Pattern
```ruby
# app/jobs/post_expiry_job.rb
class PostExpiryJob < ApplicationJob
  queue_as :default  # or :critical, :low

  def perform
    Post.where(status: :active)
        .where("created_at < ?", 24.hours.ago)
        .update_all(status: :expired)

    Rails.logger.info "Expired #{Post.expired.count} posts"
  rescue StandardError => e
    Rails.logger.error "PostExpiryJob failed: #{e.message}"
    raise
  end
end

# Schedule in config/recurring.yml
recurring_jobs:
  - class: PostExpiryJob
    schedule: every 1 hour
```

### Scheduling
```ruby
# Explicit scheduling in Rails.application.config.after_initialize
# app/config/environments/production.rb
config.after_initialize do
  scheduler = Solid::Queue::Schedule.new("db/queue_schedule.yml")
  scheduler.register
end

# Or use a cron task in lib/tasks/scheduler.rake
desc "Enqueue recurring jobs"
task enqueue_jobs: :environment do
  PostExpiryJob.perform_later
  RecurringPostCreatorJob.perform_later
  OtpCodeCleanupJob.perform_later
end
```

---

## Testing Strategy (Future)

### Test File Structure
```ruby
# spec/models/user_spec.rb
RSpec.describe User do
  describe "validations" do
    it { is_expected.to validate_presence_of(:phone) }
    it { is_expected.to validate_uniqueness_of(:phone) }
  end

  describe "#authenticate" do
    let(:user) { create(:user, password: "secret123") }

    it "returns true with correct password" do
      expect(user.authenticate("secret123")).to be true
    end

    it "returns false with incorrect password" do
      expect(user.authenticate("wrong")).to be false
    end
  end
end

# spec/requests/posts_spec.rb
RSpec.describe "Posts" do
  describe "GET /posts" do
    it "returns all active posts" do
      create(:post, status: :active)
      create(:post, status: :expired)

      get posts_path
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("active")
      expect(response.body).not_to include("expired")
    end
  end
end
```

### Factory Setup
```ruby
# spec/factories/users.rb
FactoryBot.define do
  factory :user do
    phone { "+84" + Faker::Number.number(digits: 9).to_s }
    password_digest { BCrypt::Password.create("password123") }
    name { Faker::Name.name }
    vehicle_type { :none }
  end
end

# spec/factories/posts.rb
FactoryBot.define do
  factory :post do
    user
    post_type { :offer }
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
