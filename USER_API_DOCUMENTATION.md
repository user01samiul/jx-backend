# JackpotX User API Documentation

## 🔐 Authentication APIs

### 1. Get CAPTCHA
```http
GET /api/auth/captcha
```
**Response:** `{ id: string, svg: string }`

### 2. User Registration
```http
POST /api/auth/register
```
**Request Body:**
```json
{
  "username": "string",
  "email": "string", 
  "password": "string",
  "type": "string",
  "captcha_id": "string",
  "captcha_text": "string"
}
```
**Response:** `{ success, message, data: { qr_code, auth_secret } }`

### 3. User Login
```http
POST /api/auth/login
```
**Request Body:**
```json
{
  "username": "string", // or "email": "string"
  "password": "string",
  "auth_code": "string" // optional for 2FA
}
```
**Response:** `{ success, message, token: { access_token, refresh_token }, role }`

### 4. Refresh Token
```http
POST /api/auth/refresh
```
**Request Body:**
```json
{
  "refresh_token": "string"
}
```
**Response:** `{ success, token: { access_token, refresh_token } }`

### 5. Get User Roles
```http
GET /api/auth/user-roles?username=string
```
**Response:** `{ success, data: [{ id, name, description }] }`

---

## 👤 User Profile APIs

### 1. Get User Profile
```http
GET /api/user/profile
Authorization: Bearer <token>
```
**Response:** `{ success, data: { id, username, email, balance, level_name, etc } }`

### 2. Update User Profile
```http
PUT /api/user/profile/update
Authorization: Bearer <token>
```
**Request Body:**
```json
{
  "first_name": "string", // optional
  "last_name": "string", // optional
  "nationality": "string", // optional
  "phone_number": "string" // optional
}
```

### 3. Change Password
```http
PUT /api/user/password/change
Authorization: Bearer <token>
```
**Request Body:**
```json
{
  "current_password": "string",
  "new_password": "string"
}
```

### 4. Get User Balance
```http
GET /api/user/balance
Authorization: Bearer <token>
```
**Response:** `{ success, data: { balance, currency } }`

### 5. Get User Activity Summary
```http
GET /api/user/activity-summary
Authorization: Bearer <token>
```
**Response:** `{ success, data: { total_bets, total_wins, total_deposits, etc } }`

---

## 🎮 Game APIs

### 1. Get Game Categories
```http
GET /api/games/categories
```
**Response:** `{ success, data: [{ id, name, description, icon_url }] }`

### 2. Get Game Providers
```http
GET /api/games/providers
```
**Response:** `{ success, data: [{ id, name, logo_url, game_count }] }`

### 3. Get Available Games
```http
GET /api/games?category_id?&provider_id?&search?&limit?&offset?
```
**Query Parameters:**
- `category_id` (optional): Filter by category ID
- `provider_id` (optional): Filter by provider ID  
- `search` (optional): Search term for game names
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:** `{ success, data: [{ id, name, provider, thumbnail_url, etc }] }`

### 4. Get Game by ID
```http
GET /api/games/:id
```
**Response:** `{ success, data: { id, name, provider, description, etc } }`

### 5. Get Featured Games
```http
GET /api/games/featured
```
**Response:** `{ success, data: [{ id, name, provider, thumbnail_url }] }`

### 6. Get New Games
```http
GET /api/games/new
```
**Response:** `{ success, data: [{ id, name, provider, thumbnail_url }] }`

### 7. Get Hot Games
```http
GET /api/games/hot
```
**Response:** `{ success, data: [{ id, name, provider, thumbnail_url }] }`

### 8. Get Popular Games
```http
GET /api/games/popular
```
**Response:** `{ success, data: [{ id, name, provider, thumbnail_url }] }`

### 9. Get Games by Category
```http
GET /api/games/cate?category_id&limit?&offset?
```
**Query Parameters:**
- `category_id` (required): Category ID to filter by
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:** `{ success, data: [{ id, name, provider, thumbnail_url }] }`

### 10. Get Game Statistics
```http
GET /api/games/:id/statistics
```
**Response:** `{ success, data: { play_count, win_rate, avg_bet, etc } }`

### 11. Toggle Game Favorite
```http
POST /api/games/favorite
Authorization: Bearer <token>
```
**Request Body:**
```json
{
  "game_id": "string"
}
```

### 12. Get User Favorite Games
```http
GET /api/user/favorite-games
Authorization: Bearer <token>
```
**Response:** `{ success, data: [{ id, name, provider, play_count, is_favorite }] }`

### 13. Play Game
```http
POST /api/games/play
Authorization: Bearer <token>
```
**Request Body:**
```json
{
  "game_id": "string",
  "bet_amount": "number" // optional
}
```
**Response:** `{ success, data: { game_url, session_id, etc } }`

### 14. Get Game Data Sample
```http
GET /api/games/:id/game-data-sample
```
**Response:** `{ success, data: { sample_data } }`

---

## 🎲 Betting APIs

### 1. Place Bet
```http
POST /api/games/bet
Authorization: Bearer <token>
```
**Request Body:**
```json
{
  "game_id": "string",
  "bet_amount": "number",
  "bet_type": "string" // optional
}
```
**Response:** `{ success, data: { bet_id, balance_after, etc } }`

### 2. Get Bet Results
```http
GET /api/games/bet/result?bet_id?&game_id?&limit?&offset?
Authorization: Bearer <token>
```
**Query Parameters:**
- `bet_id` (optional): Specific bet ID
- `game_id` (optional): Filter by game ID
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:** `{ success, data: [{ bet_id, game_id, amount, result, win_amount, etc }] }`

### 3. Get User Bets
```http
GET /api/user/bets?limit?&offset?&game_id?
Authorization: Bearer <token>
```
**Query Parameters:**
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)
- `game_id` (optional): Filter by game ID

**Response:** `{ success, data: [{ bet_id, game_id, amount, result, created_at, etc }] }`

### 4. Get User Game Bets
```http
GET /api/user/game-bets?game_id&limit?&offset?
Authorization: Bearer <token>
```
**Query Parameters:**
- `game_id` (required): Game ID to filter by
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:** `{ success, data: [{ bet_id, amount, result, win_amount, created_at }] }`

---

## 💰 Payment APIs

### 1. Get Payment Gateways
```http
GET /api/payment/gateways?type?&is_active?
Authorization: Bearer <token>
```
**Query Parameters:**
- `type` (optional): "deposit" or "withdrawal"
- `is_active` (optional): Filter by active status

**Response:** `{ success, data: [{ id, name, type, logo_url, min_amount, max_amount }] }`

### 2. Create Payment (Deposit)
```http
POST /api/payment/create
Authorization: Bearer <token>
```
**Request Body:**
```json
{
  "gateway_id": "string",
  "amount": "number",
  "currency": "string" // optional, defaults to USD
}
```
**Response:** `{ success, data: { transaction_id, payment_url, etc } }`

### 3. Withdraw Payment
```http
POST /api/payment/withdraw
Authorization: Bearer <token>
```
**Request Body:**
```json
{
  "gateway_id": "string",
  "amount": "number",
  "account_details": {
    "account_number": "string",
    "bank_name": "string",
    "account_holder": "string"
  }
}
```
**Response:** `{ success, data: { transaction_id, status } }`

### 4. Get Payment Status
```http
GET /api/payment/status/:transaction_id
Authorization: Bearer <token>
```
**Response:** `{ success, data: { status, amount, created_at, etc } }`

---

## 🎁 Promotion APIs

### 1. Get Available Promotions
```http
GET /api/promotions
Authorization: Bearer <token>
```
**Response:** `{ success, data: [{ id, name, type, bonus_percentage, max_bonus_amount, etc }] }`

### 2. Claim Promotion
```http
POST /api/promotions/claim
Authorization: Bearer <token>
```
**Request Body:**
```json
{
  "promotion_id": "string"
}
```
**Response:** `{ success, message, data: { bonus_amount, wagering_requirement } }`

### 3. Get User Promotions
```http
GET /api/promotions/my
Authorization: Bearer <token>
```
**Response:** `{ success, data: [{ id, name, status, claimed_at, etc }] }`

### 4. Get Daily Spin
```http
GET /api/promotions/daily-spin
Authorization: Bearer <token>
```
**Response:** `{ success, data: { can_spin, last_spin_date, spin_count } }`

### 5. Perform Daily Spin
```http
POST /api/promotions/daily-spin
Authorization: Bearer <token>
```
**Response:** `{ success, data: { prize_type, prize_amount, message } }`

### 6. Get Wagering Progress
```http
GET /api/promotions/wagering-progress
Authorization: Bearer <token>
```
**Response:** `{ success, data: { current_wagered, required_wagered, progress_percentage } }`

### 7. Get Bonus Balance Summary
```http
GET /api/promotions/bonus-summary
Authorization: Bearer <token>
```
**Response:** `{ success, data: { bonus_balance, wagering_requirement, progress } }`

### 8. Transfer Bonus to Main
```http
POST /api/promotions/transfer-bonus
Authorization: Bearer <token>
```
**Request Body:**
```json
{
  "amount": "number"
}
```
**Response:** `{ success, message, data: { transferred_amount, new_balance } }`

### 9. Check Promotion Eligibility
```http
GET /api/promotions/:promotion_id/eligibility
Authorization: Bearer <token>
```
**Response:** `{ success, data: { is_eligible, reason?, requirements } }`

---

## 🔔 Notification APIs

### 1. Get User Notifications
```http
GET /api/notifications?type?&category?&is_read?&limit?&offset?
Authorization: Bearer <token>
```
**Query Parameters:**
- `type` (optional): "info", "warning", "success", "error"
- `category` (optional): "system", "promotion", "payment", "game"
- `is_read` (optional): "true" or "false"
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:** `{ success, data: [{ id, title, message, type, is_read, created_at }] }`

### 2. Get Unread Count
```http
GET /api/notifications/unread-count
Authorization: Bearer <token>
```
**Response:** `{ success, data: { count } }`

### 3. Get Notification by ID
```http
GET /api/notifications/:id
Authorization: Bearer <token>
```
**Response:** `{ success, data: { id, title, message, type, is_read, created_at } }`

### 4. Mark as Read
```http
POST /api/notifications/:id/read
Authorization: Bearer <token>
```
**Response:** `{ success, message }`

### 5. Mark All as Read
```http
POST /api/notifications/mark-read
Authorization: Bearer <token>
```
**Response:** `{ success, message }`

### 6. Delete Notification
```http
DELETE /api/notifications/:id
Authorization: Bearer <token>
```
**Response:** `{ success, message }`

### 7. Delete Read Notifications
```http
DELETE /api/notifications/delete-read
Authorization: Bearer <token>
```
**Response:** `{ success, message }`

---

## 🔐 2FA APIs

### 1. Get 2FA Status
```http
GET /api/user/2fa/status
Authorization: Bearer <token>
```
**Response:** `{ success, data: { is_enabled, qr_code?, auth_secret? } }`

### 2. Enable 2FA
```http
POST /api/user/2fa/enable
Authorization: Bearer <token>
```
**Response:** `{ success, data: { qr_code, auth_secret } }`

### 3. Disable 2FA
```http
POST /api/user/2fa/disable
Authorization: Bearer <token>
```
**Request Body:**
```json
{
  "auth_code": "string"
}
```
**Response:** `{ success, message }`

### 4. Skip 2FA
```http
POST /api/user/2fa/skip
Authorization: Bearer <token>
```
**Request Body:**
```json
{
  "auth_code": "string"
}
```
**Response:** `{ success, message }`

---

## 📊 Transaction & Activity APIs

### 1. Get User Transactions
```http
GET /api/user/transactions?type?&limit?&offset?
Authorization: Bearer <token>
```
**Query Parameters:**
- `type` (optional): "deposit", "withdrawal", "bet", "win", "bonus"
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:** `{ success, data: [{ id, type, amount, balance_after, created_at, etc }] }`

### 2. Get User Recent Activity
```http
GET /api/user/activity?limit?&offset?
Authorization: Bearer <token>
```
**Query Parameters:**
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:** `{ success, data: [{ id, type, description, created_at }] }`

### 3. Get User Category Balances
```http
GET /api/user/category-balances
Authorization: Bearer <token>
```
**Response:** `{ success, data: [{ category, balance, currency }] }`

### 4. Transfer Category Balance
```http
POST /api/user/category-balance/transfer
Authorization: Bearer <token>
```
**Request Body:**
```json
{
  "from_category": "string",
  "to_category": "string", 
  "amount": "number"
}
```
**Response:** `{ success, message, data: { transferred_amount } }`

---

## 🏠 Home & General APIs

### 1. Get Home Data
```http
GET /api/home
```
**Response:** `{ success, data: { featured_games, promotions, announcements, etc } }`

---

## 📋 Template APIs

### 1. Get Templates by Type
```http
GET /api/templates/:type
```
**Response:** `{ success, data: [{ id, name, type, config }] }`

### 2. Get Template by ID
```http
GET /api/templates/id/:id
```
**Response:** `{ success, data: { id, name, type, config, etc } }`

### 3. Get Template Configs
```http
GET /api/templates/:id/configs
```
**Response:** `{ success, data: [{ id, name, value, type }] }`

### 4. Get User Template
```http
GET /api/user/template
Authorization: Bearer <token>
```
**Response:** `{ success, data: { template_id, config } }`

### 5. Set User Template
```http
POST /api/user/template
Authorization: Bearer <token>
```
**Request Body:**
```json
{
  "template_id": "string",
  "config": "object" // optional
}
```
**Response:** `{ success, message }`

### 6. Get Available User Templates
```http
GET /api/user/templates/available
Authorization: Bearer <token>
```
**Response:** `{ success, data: [{ id, name, type, is_active }] }`

### 7. Load User Template
```http
GET /api/user/template/load
Authorization: Bearer <token>
```
**Response:** `{ success, data: { template, config } }`

---

## ⚙️ Settings APIs

### 1. Get Maintenance Status
```http
GET /api/settings/maintenance
```
**Response:** `{ success, data: { is_maintenance, message, estimated_time? } }`

---

## 📝 Implementation Status

### ✅ **COMPLETED APIs**
- Authentication (Login, Register, Refresh Token)
- User Profile Management
- Game Listing & Details
- Basic Betting System
- Payment Gateway Integration
- Promotion System
- Notification System
- 2FA Implementation
- Transaction History
- Template System

### 🔄 **NEEDS FRONTEND IMPLEMENTATION**
1. **Game Favorites** - Toggle and display favorite games
2. **Daily Spin** - Implement spin wheel UI
3. **Wagering Progress** - Show progress bars for bonus requirements
4. **Category Balance Transfer** - UI for transferring between balance types
5. **2FA Setup** - QR code display and verification
6. **Payment Flow** - Complete deposit/withdrawal UI
7. **Notification Center** - Real-time notification display
8. **Game Statistics** - Charts and analytics display
9. **Template Customization** - User preference settings
10. **Activity Feed** - Real-time activity tracking

### 🚧 **PENDING FEATURES**
1. **Real-time Updates** - WebSocket integration for live data
2. **Game Search** - Advanced filtering and search
3. **Social Features** - Friend system, leaderboards
4. **Achievement System** - Badges and rewards
5. **Chat System** - In-game communication
6. **Tournament System** - Competitive gameplay
7. **Live Betting** - Real-time betting features
8. **Multi-language Support** - Internationalization
9. **Dark/Light Theme** - UI customization
10. **Mobile Optimization** - Responsive design improvements

---

## 🔧 **Technical Notes**

### Authentication
- JWT tokens with 15min access, 7-day refresh
- Bearer token in Authorization header
- 2FA support with Google Authenticator

### Error Handling
- All APIs return `{ success: boolean, message: string, data?: any }`
- HTTP status codes: 200 (success), 400 (bad request), 401 (unauthorized), 500 (server error)

### Rate Limiting
- Implemented via Cloudflare
- Respect rate limits in frontend implementation

### Pagination
- Use `limit` and `offset` parameters
- Default: 20 items per page

### File Uploads
- Supported for profile pictures and documents
- Max size: 5MB
- Formats: JPG, PNG, PDF

---

## 📋 **Frontend Request Patterns**

### Authentication Flow
```javascript
// 1. Get CAPTCHA
const captcha = await fetch('/api/auth/captcha').then(r => r.json());

// 2. Register User
const register = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'user123',
    email: 'user@example.com',
    password: 'password123',
    type: 'regular',
    captcha_id: captcha.id,
    captcha_text: 'ABC123'
  })
}).then(r => r.json());

// 3. Login User
const login = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'user123',
    password: 'password123',
    auth_code: '123456' // if 2FA enabled
  })
}).then(r => r.json());

// 4. Store tokens
localStorage.setItem('access_token', login.token.access_token);
localStorage.setItem('refresh_token', login.token.refresh_token);
```

### API Request Helper
```javascript
// Helper function for authenticated requests
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('access_token');
  
  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });

  if (response.status === 401) {
    // Token expired, try refresh
    const refreshResult = await refreshToken();
    if (refreshResult.success) {
      // Retry original request
      return apiRequest(endpoint, options);
    } else {
      // Redirect to login
      window.location.href = '/login';
    }
  }

  return response.json();
}

// Refresh token function
async function refreshToken() {
  const refresh_token = localStorage.getItem('refresh_token');
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token })
  });
  
  const result = await response.json();
  if (result.success) {
    localStorage.setItem('access_token', result.token.access_token);
    localStorage.setItem('refresh_token', result.token.refresh_token);
  }
  
  return result;
}
```

### Game Management
```javascript
// Get games with filters
const games = await apiRequest('/games?category_id=1&provider_id=2&limit=20&offset=0');

// Toggle favorite
const toggleFavorite = await apiRequest('/games/favorite', {
  method: 'POST',
  body: JSON.stringify({ game_id: 'game123' })
});

// Play game
const playGame = await apiRequest('/games/play', {
  method: 'POST',
  body: JSON.stringify({ game_id: 'game123', bet_amount: 10 })
});
```

### Payment Flow
```javascript
// Get available gateways
const gateways = await apiRequest('/payment/gateways?type=deposit');

// Create deposit
const deposit = await apiRequest('/payment/create', {
  method: 'POST',
  body: JSON.stringify({
    gateway_id: 'gateway123',
    amount: 100,
    currency: 'USD'
  })
});

// Redirect to payment URL
if (deposit.success) {
  window.location.href = deposit.data.payment_url;
}
```

### Promotion System
```javascript
// Get available promotions
const promotions = await apiRequest('/promotions');

// Claim promotion
const claim = await apiRequest('/promotions/claim', {
  method: 'POST',
  body: JSON.stringify({ promotion_id: 'promo123' })
});

// Get wagering progress
const progress = await apiRequest('/promotions/wagering-progress');
```

### Notification System
```javascript
// Get notifications
const notifications = await apiRequest('/notifications?limit=10');

// Mark as read
const markRead = await apiRequest('/notifications/123/read', {
  method: 'POST'
});

// Get unread count
const unreadCount = await apiRequest('/notifications/unread-count');
``` 