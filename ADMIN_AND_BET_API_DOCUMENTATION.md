# Admin and Bet API Documentation

## Overview
This document provides comprehensive documentation for all admin and bet-related APIs in the JackpotX backend system. These APIs are essential for implementing the admin frontend and managing betting operations.

## Base URLs
- **Admin API**: `https://backend.jackpotx.net/api/admin`
- **User API**: `https://backend.jackpotx.net/api`
- **Game API**: `https://backend.jackpotx.net/api/games`

## Authentication
All endpoints require:
- **Authorization**: Bearer token in header
- **Role**: Admin access required for admin endpoints

```
Authorization: Bearer <admin_token>
```

---

## Table of Contents
1. [Admin Dashboard APIs](#admin-dashboard-apis)
2. [Admin User Management APIs](#admin-user-management-apis)
3. [Admin Game Management APIs](#admin-game-management-apis)
4. [Admin Transaction Management APIs](#admin-transaction-management-apis)
5. [Admin Bet Management APIs](#admin-bet-management-apis)
6. [Admin Analytics APIs](#admin-analytics-apis)
7. [Admin RTP Management APIs](#admin-rtp-management-apis)
8. [Admin Payment Gateway APIs](#admin-payment-gateway-apis)
9. [Admin Provider Management APIs](#admin-provider-management-apis)
10. [Admin Settings APIs](#admin-settings-apis)
11. [User Bet APIs](#user-bet-apis)
12. [Game Bet APIs](#game-bet-apis)
13. [Error Responses](#error-responses)

---

## Admin Dashboard APIs

### Get Dashboard Statistics
```http
GET /api/admin/dashboard/stats
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1500,
    "totalGames": 500,
    "todayTransactions": 45,
    "todayAmount": 12500.50,
    "pendingTransactions": 12,
    "pendingAmount": 3500.75,
    "todayWagered": 25000.00
  }
}
```

---

## Admin User Management APIs

### Get All Users
```http
GET /api/admin/users?status=Active&verification_level=2&search=john&page=1&limit=20
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "johndoe",
      "email": "johndoe@example.com",
      "registration_date": "2024-01-01T12:00:00Z",
      "status_name": "Active",
      "first_name": "John",
      "last_name": "Doe",
      "phone_number": "+1234567890",
      "date_of_birth": "1990-01-01",
      "nationality": "US",
      "country": "US",
      "city": "New York",
      "address": "123 Main St",
      "postal_code": "10001",
      "gender": "male",
      "timezone": "America/New_York",
      "language": "en",
      "currency": "USD",
      "verification_level": 2,
      "is_verified": true,
      "avatar_url": "https://example.com/avatar.jpg",
      "role_name": "Player",
      "level_name": "Silver",
      "current_points": 2500,
      "total_points_earned": 5000,
      "cashback_percentage": 2.5,
      "withdrawal_limit": 10000,
      "kyc_documents_count": 3,
      "kyc_approved_count": 2,
      "last_login": "2024-02-01T10:00:00Z",
      "balance": 150.50,
      "total_deposited": 2000.00,
      "total_withdrawn": 500.00,
      "total_bets": 50,
      "total_wagered": 1250.75,
      "total_won": 1350.25
    }
  ],
  "pagination": {
    "total": 1500,
    "page": 1,
    "limit": 20,
    "totalPages": 75
  }
}
```

### Update User Status
```http
PUT /api/admin/users/1/status
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "Suspended",
  "reason": "Suspicious activity detected"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "Suspended",
    "updated_at": "2024-01-15T10:40:00Z"
  }
}
```

### Update User Balance
```http
PUT /api/admin/users/1/balance
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": 100.00,
  "type": "adjustment",
  "reason": "Bonus credit for loyalty"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "new_balance": 250.50,
    "transaction_id": 12345,
    "updated_at": "2024-01-15T10:45:00Z"
  }
}
```

### Top Up User Balance
```http
POST /api/admin/users/1/topup
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": 1000,
  "description": "Admin top-up"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction_id": 12346,
    "new_balance": 1150.50
  }
}
```

---

## Admin Game Management APIs

### Get All Games
```http
GET /api/admin/games?provider=netent&category=slots&is_active=true&search=starburst&page=1&limit=20
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Starburst",
      "provider": "NetEnt",
      "category": "slots",
      "subcategory": "video_slots",
      "image_url": "https://example.com/starburst.jpg",
      "game_code": "starburst",
      "rtp_percentage": 96.1,
      "volatility": "medium",
      "min_bet": 0.10,
      "max_bet": 100.00,
      "max_win": 50000.00,
      "is_featured": true,
      "is_new": false,
      "is_hot": true,
      "is_active": true,
      "features": ["Free Spins", "Multiplier"],
      "rating": 4.5,
      "popularity": 85.2,
      "description": "Popular slot game with expanding wilds"
    }
  ],
  "pagination": {
    "total": 500,
    "page": 1,
    "limit": 20,
    "totalPages": 25
  }
}
```

### Create Game
```http
POST /api/admin/games
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "New Slot Game",
  "provider": "NetEnt",
  "category": "slots",
  "subcategory": "video_slots",
  "image_url": "https://example.com/game.jpg",
  "game_code": "new_slot",
  "rtp_percentage": 96.5,
  "volatility": "high",
  "min_bet": 0.20,
  "max_bet": 200.00,
  "max_win": 100000.00,
  "is_featured": false,
  "is_new": true,
  "is_hot": false,
  "is_active": true,
  "features": ["Free Spins", "Bonus Round"],
  "rating": 0,
  "popularity": 0,
  "description": "New exciting slot game"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 501,
    "name": "New Slot Game",
    "provider": "NetEnt",
    "category": "slots",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### Update Game
```http
PUT /api/admin/games/1
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Game Name",
  "rtp_percentage": 97.0,
  "is_featured": true,
  "rating": 4.8
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Updated Game Name",
    "rtp_percentage": 97.0,
    "updated_at": "2024-01-15T10:35:00Z"
  }
}
```

### Delete Game
```http
DELETE /api/admin/games/1
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Game deleted successfully"
}
```

### Update Game Status
```http
PUT /api/admin/games/1/status
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "is_active": false,
  "reason": "Maintenance"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "is_active": false,
    "updated_at": "2024-01-15T10:50:00Z"
  }
}
```

---

## Admin Transaction Management APIs

### Get All Transactions
```http
GET /api/admin/transactions?type=deposit&status=pending&start_date=2024-01-01&end_date=2024-01-15&page=1&limit=20
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "username": "johndoe",
      "type": "deposit",
      "amount": 100.00,
      "status": "pending",
      "currency": "USD",
      "gateway": "Stripe",
      "description": "Deposit via Stripe",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

### Approve Transaction
```http
PUT /api/admin/transactions/1/approve
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "completed",
  "reason": "Payment verified"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "completed",
    "updated_at": "2024-01-15T11:15:00Z"
  }
}
```

---

## Admin Bet Management APIs

### Get All Users' Bet Histories
```http
GET /api/admin/bets?user_id=1&limit=50
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "bet_id": 1,
      "user_id": 1,
      "username": "johndoe",
      "game_id": 53,
      "game_name": "American Roulette",
      "category": "table_games",
      "bet_amount": 100.00,
      "win_amount": 350.00,
      "outcome": "win",
      "placed_at": "2024-01-15T10:00:00Z",
      "result_at": "2024-01-15T10:05:00Z"
    }
  ]
}
```

### Get Bet Results (Admin)
```http
GET /api/games/bet/result?user_id=1&limit=50
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "bet_id": 1,
      "user_id": 1,
      "username": "johndoe",
      "game_id": 53,
      "game_name": "American Roulette",
      "category": "table_games",
      "bet_amount": 100.00,
      "win_amount": 350.00,
      "outcome": "win",
      "placed_at": "2024-01-15T10:00:00Z",
      "result_at": "2024-01-15T10:05:00Z"
    }
  ]
}
```

### Process Bet Result (Admin Only)
```http
POST /api/games/bet/result
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "bet_id": 1,
  "outcome": "win",
  "win_amount": 350.00,
  "game_result": {
    "winning_number": 17,
    "bet_type": "straight"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bet_id": 1,
    "outcome": "win",
    "win_amount": 350.00,
    "processed_at": "2024-01-15T10:05:00Z"
  }
}
```

---

## Admin Analytics APIs

### Get Revenue Analytics
```http
GET /api/admin/analytics/revenue?start_date=2024-01-01&end_date=2024-01-15
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_revenue": 50000.00,
    "total_deposits": 75000.00,
    "total_withdrawals": 25000.00,
    "net_revenue": 25000.00,
    "daily_revenue": [
      {
        "date": "2024-01-01",
        "revenue": 3500.00,
        "deposits": 5000.00,
        "withdrawals": 1500.00
      }
    ],
    "by_gateway": [
      {
        "gateway": "Stripe",
        "revenue": 30000.00,
        "transactions": 150
      }
    ]
  }
}
```

### Get User Analytics
```http
GET /api/admin/analytics/users?start_date=2024-01-01&end_date=2024-01-15
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_users": 1500,
    "new_users": 45,
    "active_users": 850,
    "premium_users": 120,
    "daily_registrations": [
      {
        "date": "2024-01-01",
        "registrations": 5,
        "active_users": 45
      }
    ],
    "by_country": [
      {
        "country": "US",
        "users": 500,
        "percentage": 33.33
      }
    ]
  }
}
```

### Get Profit Analytics
```http
GET /api/admin/analytics/profit?start_date=2024-01-01&end_date=2024-01-15
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_bets": 50000.00,
    "total_wins": 47500.00,
    "profit": 2500.00
  }
}
```

---

## Admin RTP Management APIs

### Get RTP Settings
```http
GET /api/admin/rtp/settings
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "settings": {
      "default_rtp": 96.0,
      "rtp_ranges": {
        "netent": {
          "min": 94.0,
          "max": 98.0
        },
        "microgaming": {
          "min": 93.0,
          "max": 97.0
        }
      },
      "rtp_categories": {
        "slots": 96.5,
        "table_games": 97.0,
        "live_casino": 96.8
      }
    },
    "analytics": {
      "summary": {
        "average_rtp": "96.25",
        "min_rtp": "94.50",
        "max_rtp": "97.80",
        "total_games": 150,
        "high_rtp_games": 45,
        "low_rtp_games": 12
      },
      "by_category": [
        {
          "category": "slots",
          "avg_rtp": 96.5,
          "game_count": 50
        }
      ],
      "by_provider": [
        {
          "provider": "NetEnt",
          "avg_rtp": 96.8,
          "game_count": 25
        }
      ],
      "recent_changes": [
        {
          "id": 1,
          "name": "Starburst",
          "provider": "NetEnt",
          "category": "slots",
          "rtp_percentage": 96.1,
          "updated_at": "2024-01-15T12:10:00Z"
        }
      ]
    }
  }
}
```

### Update RTP Settings
```http
PUT /api/admin/rtp/settings
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "default_rtp": 96.5,
  "rtp_ranges": {
    "netent": {
      "min": 94.5,
      "max": 98.5
    }
  },
  "rtp_categories": {
    "slots": 96.8,
    "table_games": 97.2
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "default_rtp": 96.5,
    "rtp_ranges": {
      "netent": {
        "min": 94.5,
        "max": 98.5
      }
    },
    "rtp_categories": {
      "slots": 96.8,
      "table_games": 97.2
    },
    "updated_at": "2024-01-15T12:15:00Z"
  }
}
```

### Get RTP Target Profit
```http
GET /api/admin/rtp/target-profit
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "target_profit_percent": 20,
    "effective_rtp": 80.0,
    "adjustment_mode": "manual"
  }
}
```

### Set RTP Target Profit
```http
POST /api/admin/rtp/target-profit
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "target_profit_percent": 20
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "target_profit_percent": 20,
    "effective_rtp": 80.0,
    "adjustment_mode": "manual"
  }
}
```

### Bulk Update RTP
```http
POST /api/admin/rtp/bulk-update
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "game_ids": [1, 2, 3, 4, 5],
  "rtp_percentage": 96.5,
  "category": "slots",
  "provider": "NetEnt"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "updated_count": 25,
    "updated_games": [
      {
        "id": 1,
        "name": "Starburst",
        "rtp_percentage": 96.5,
        "updated_at": "2024-01-15T12:25:00Z"
      }
    ],
    "rtp_percentage": 96.5,
    "filters": {
      "game_ids": [1, 2, 3, 4, 5],
      "category": "slots",
      "provider": "NetEnt"
    }
  }
}
```

---

## Admin Payment Gateway APIs

### Get All Payment Gateways
```http
GET /api/admin/payment-gateways?type=deposit&is_active=true&supported_currency=USD&search=stripe&page=1&limit=20
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Stripe",
      "code": "stripe",
      "type": "both",
      "description": "Popular payment processor",
      "logo_url": "https://example.com/stripe-logo.png",
      "is_active": true,
      "supported_currencies": ["USD", "EUR", "GBP"],
      "min_amount": 1.00,
      "max_amount": 10000.00,
      "fees_percentage": 2.9,
      "fees_fixed": 0.30,
      "created_at": "2024-01-15T11:30:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### Create Payment Gateway
```http
POST /api/admin/payment-gateways
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Stripe",
  "code": "stripe",
  "type": "both",
  "description": "Popular payment processor",
  "logo_url": "https://example.com/stripe-logo.png",
  "website_url": "https://stripe.com",
  "api_endpoint": "https://api.stripe.com",
  "api_key": "sk_test_...",
  "api_secret": "sk_test_...",
  "webhook_url": "https://backend.jackpotx.net/api/webhooks/stripe",
  "webhook_secret": "whsec_...",
  "is_active": true,
  "supported_currencies": ["USD", "EUR", "GBP"],
  "supported_countries": ["US", "CA", "GB"],
  "min_amount": 1.00,
  "max_amount": 10000.00,
  "processing_time": "Instant",
  "fees_percentage": 2.9,
  "fees_fixed": 0.30,
  "auto_approval": true,
  "requires_kyc": false,
  "config": {
    "publishable_key": "pk_test_..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Stripe",
    "code": "stripe",
    "created_at": "2024-01-15T11:30:00Z"
  }
}
```

### Update Payment Gateway
```http
PUT /api/admin/payment-gateways/1
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "fees_percentage": 3.2,
  "max_amount": 15000.00,
  "is_active": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "updated_at": "2024-01-15T11:35:00Z"
  }
}
```

### Test Payment Gateway Connection
```http
POST /api/admin/payment-gateways/1/test
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "connected",
    "response_time": 150,
    "test_transaction_id": "txn_test_123",
    "message": "Connection successful"
  }
}
```

---

## Admin Provider Management APIs

### Get All Providers
```http
GET /api/admin/providers
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "provider_name": "thinkcode_stg",
      "api_key": "thinkcode_stg",
      "base_url": "https://staging-wallet.semper7.net/api/generic/games/list/all",
      "is_active": true,
      "metadata": {
        "callback_url": "https://backend.jackpotx.net/api/innova/"
      },
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Create Provider
```http
POST /api/admin/providers
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "provider_name": "new_provider",
  "api_key": "new_api_key",
  "api_secret": "new_api_secret",
  "base_url": "https://api.newprovider.com",
  "is_active": true,
  "metadata": {
    "callback_url": "https://backend.jackpotx.net/api/newprovider/"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "provider_name": "new_provider",
    "created_at": "2024-01-15T11:00:00Z"
  }
}
```

### Update Provider
```http
PUT /api/admin/providers/1
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "api_secret": "updated_secret",
  "is_active": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "updated_at": "2024-01-15T11:05:00Z"
  }
}
```

---

## Admin Settings APIs

### Get System Settings
```http
GET /api/admin/settings
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "site_name": "JackpotX",
    "maintenance_mode": false,
    "default_currency": "USD",
    "min_deposit": 10.00,
    "max_deposit": 10000.00,
    "auto_approval_limit": 1000.00,
    "kyc_required": true,
    "updated_at": "2024-01-15T11:20:00Z"
  }
}
```

### Update System Settings
```http
PUT /api/admin/settings
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "maintenance_mode": true,
  "auto_approval_limit": 500.00,
  "kyc_required": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "updated_at": "2024-01-15T11:25:00Z"
  }
}
```

---

## User Bet APIs

### Get User Betting History
```http
GET /api/user/bets?limit=50
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "bet_id": 1,
      "game_id": 53,
      "game_name": "American Roulette",
      "category": "table_games",
      "bet_amount": 100.00,
      "win_amount": 350.00,
      "outcome": "win",
      "placed_at": "2024-01-15T10:00:00Z",
      "result_at": "2024-01-15T10:05:00Z"
    }
  ]
}
```

### Get User Game Bets (Per-Game Stats)
```http
GET /api/user/game-bets
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "game_id": 53,
      "game_name": "American Roulette",
      "total_bet": 1000,
      "total_win": 500,
      "total_loss": 500,
      "last_bet_at": "2024-01-15T10:00:00Z",
      "last_result_at": "2024-01-15T10:05:00Z"
    }
  ]
}
```

---

## Game Bet APIs

### Place Bet
```http
POST /api/games/bet
Authorization: Bearer <user_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "game_id": 53,
  "bet_amount": 100,
  "game_data": {
    "bets": [
      {
        "bet_type": "straight",
        "number": 17,
        "chips": 5
      },
      {
        "bet_type": "red",
        "chips": 10
      }
    ],
    "session_id": "roul-YYYYMMDD-001"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bet_id": 1,
    "game_id": 53,
    "bet_amount": 100,
    "new_balance": 900.00,
    "placed_at": "2024-01-15T10:00:00Z"
  }
}
```

### Get Bet Results (User)
```http
GET /api/games/bet/result?limit=50
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "bet_id": 1,
      "game_id": 53,
      "game_name": "American Roulette",
      "category": "table_games",
      "bet_amount": 100.00,
      "win_amount": 350.00,
      "outcome": "win",
      "placed_at": "2024-01-15T10:00:00Z",
      "result_at": "2024-01-15T10:05:00Z"
    }
  ]
}
```

---

## Error Responses

### Authentication Error
```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "INVALID_TOKEN"
}
```

### Authorization Error
```json
{
  "success": false,
  "message": "Forbidden - Admin access required",
  "error": "INSUFFICIENT_PERMISSIONS"
}
```

### Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### Not Found Error
```json
{
  "success": false,
  "message": "Resource not found",
  "error": "NOT_FOUND"
}
```

### Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "INTERNAL_ERROR"
}
```

---

## Rate Limiting
- **Standard endpoints**: 100 requests per minute
- **Analytics endpoints**: 20 requests per minute
- **Bulk operations**: 10 requests per minute

## Pagination
Most list endpoints support pagination with the following parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

Response includes pagination metadata:
```json
{
  "pagination": {
    "total": 1500,
    "page": 1,
    "limit": 20,
    "totalPages": 75,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Filtering and Search
Most endpoints support filtering and search:
- **Search**: Text search across relevant fields
- **Date ranges**: `start_date` and `end_date` parameters
- **Status filters**: Filter by status values
- **Category filters**: Filter by categories
- **Provider filters**: Filter by providers

## Webhooks
Some operations trigger webhooks for real-time notifications:
- User status changes
- Transaction approvals
- System settings updates
- RTP changes
- Bet placements and results

Webhook endpoints are configured per operation and include authentication headers.

## Frontend Implementation Notes

### Key Features to Implement:
1. **Dashboard**: Real-time statistics and charts
2. **User Management**: CRUD operations with filtering and search
3. **Game Management**: Game CRUD with RTP settings
4. **Transaction Management**: Approval workflows
5. **Bet Management**: Bet history and result processing
6. **Analytics**: Revenue, user, and profit analytics
7. **RTP Management**: Settings and bulk updates
8. **Payment Gateway Management**: Gateway configuration
9. **Provider Management**: Provider CRUD operations
10. **Settings**: System configuration

### Authentication Flow:
1. Admin login to get bearer token
2. Include token in all API requests
3. Handle token expiration and refresh
4. Implement role-based access control

### Error Handling:
1. Display user-friendly error messages
2. Handle network errors gracefully
3. Implement retry mechanisms for failed requests
4. Show loading states during API calls

### Real-time Updates:
1. Use WebSocket connections for live data
2. Implement polling for critical data
3. Show notifications for important events
4. Auto-refresh dashboard statistics 