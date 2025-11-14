# JackpotX Backend Integration Guide

## Table of Contents
- [Overview](#overview)
- [Base Configuration](#base-configuration)
- [Authentication & Authorization](#authentication--authorization)
- [API Routes Reference](#api-routes-reference)
- [Database Schema](#database-schema)
- [Error Handling](#error-handling)
- [WebSocket Integration](#websocket-integration)
- [File Upload Guidelines](#file-upload-guidelines)
- [Testing Guidelines](#testing-guidelines)

## Overview

This document provides comprehensive integration information for the JackpotX backend API. It includes all routes, request/response formats, authentication mechanisms, and database schemas needed for frontend and admin panel development.

**Base URL:** `https://backend.jackpotx.net`
**API Documentation:** `https://backend.jackpotx.net/docs`
**Environment:** Production

## Base Configuration

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/jackpotx_db

# JWT
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# External APIs
QR_API_BASE_URL=http://54.151.247.5:86
CAPTCHA_SECRET=your_captcha_secret

# Frontend URLs
FRONTEND_URL=https://frontend.jackpotx.net
ADMIN_URL=https://admin.jackpotx.net

# Payment Gateways
STRIPE_SECRET_KEY=sk_test_...
PAYPAL_CLIENT_ID=your_paypal_client_id
RAZORPAY_KEY_ID=your_razorpay_key_id
```

### Common Headers
```javascript
// For authenticated requests
headers: {
  'Authorization': 'Bearer <access_token>',
  'Content-Type': 'application/json'
}

// For admin requests
headers: {
  'Authorization': 'Bearer <admin_access_token>',
  'X-API-Key': '<admin_api_key>',
  'Content-Type': 'application/json'
}
```

## Authentication & Authorization

### JWT Token Structure
```json
{
  "userId": 2,
  "username": "player1",
  "role": "Player",
  "roleId": 2,
  "iat": 1751618421,
  "exp": 1751619321
}
```

### Token Expiration
- **Access Token:** 15 minutes
- **Refresh Token:** 7 days

### User Roles
- `Admin` - Full system access
- `Player` - Regular user access
- `Moderator` - Limited admin access

## API Routes Reference

### Authentication Routes

#### 1. Get CAPTCHA
```http
GET /api/auth/captcha
```

**Response:**
```json
{
  "id": "captcha_1751680964037_h8y4qqfe1",
  "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\"...></svg>"
}
```

#### 2. User Registration
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "username": "player3",
  "email": "newuser@email.com",
  "password": "qwer1234",
  "type": "Player",
  "captcha_id": "captcha_1751680964037_h8y4qqfe1",
  "captcha_text": "h56e"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registered Successfully",
  "data": {
    "qr_code": "otpauth://totp/JackpotX:player3?secret=HPY5ETYS3DI623XX&issuer=JackpotX",
    "auth_secret": "STIIRABTLHHVDXW4"
  }
}
```

#### 3. User Login
```http
POST /api/auth/login
```

**Request Body (username or email):**
```json
{
  "username": "player1",
  "password": "qwer1234",
  "auth_code": "123456"
}
```

**OR**
```json
{
  "email": "user@live.com",
  "password": "qwer1234",
  "auth_code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logged in successfully",
  "token": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "role": {
    "id": 2,
    "name": "Player",
    "description": "Regular player account"
  }
}
```

#### 4. Refresh Token
```http
POST /api/auth/refresh
```

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "token": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### User Management Routes

#### 1. Get User Profile
```http
GET /api/user/profile
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "johndoe",
    "email": "johndoe@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "nationality": "United States",
    "phone_number": "+1234567890",
    "balance": 100.50,
    "level_name": "Silver",
    "verification_level": 1
  }
}
```

#### 2. Update User Profile
```http
PUT /api/user/profile/update
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "+1234567890",
  "date_of_birth": "1990-01-01",
  "nationality": "United States",
  "country": "United States",
  "city": "New York",
  "address": "123 Main St",
  "postal_code": "10001",
  "gender": "male",
  "timezone": "America/New_York",
  "language": "en",
  "currency": "USD"
}
```

#### 3. Change Password
```http
PUT /api/user/password/change
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "current_password": "oldpassword",
  "new_password": "newpassword123",
  "confirm_password": "newpassword123"
}
```

#### 4. Get User Balance
```http
GET /api/user/balance
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "username": "player1",
    "email": "user@live.com",
    "balance": "10.00"
  }
}
```

#### 5. Get User Activity Summary
```http
GET /api/user/activity-summary
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "username": "johndoe",
    "total_actions": 150,
    "active_days": 25,
    "last_activity": "2024-01-15T10:30:00Z",
    "unique_actions": 12,
    "login_count": 45,
    "gaming_actions": 80,
    "financial_actions": 25,
    "total_bets": 50,
    "total_wagered": 1250.75,
    "total_won": 1350.25,
    "games_played": 15,
    "total_transactions": 30,
    "deposit_count": 20,
    "withdrawal_count": 10,
    "total_deposited": 2000.00,
    "total_withdrawn": 500.00,
    "total_sessions": 45,
    "current_level": "Silver",
    "current_points": 2500,
    "balance": 150.50
  }
}
```

### 2FA Management Routes

#### 1. Get 2FA Status
```http
GET /api/user/2fa/status
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "is_enabled": false,
    "has_secret": true,
    "has_qr_code": true,
    "has_secret_setup": true,
    "can_skip": true
  }
}
```

#### 2. Enable 2FA
```http
POST /api/user/2fa/enable
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "2FA enabled successfully",
    "is_enabled": true,
    "qr_code": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<svg xmlns=\"http://www.w3.org/2000/svg\"...>",
    "auth_secret": "STIIRABTLHHVDXW4"
  }
}
```

#### 3. Disable 2FA
```http
POST /api/user/2fa/disable
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "2FA disabled successfully",
    "is_enabled": false
  }
}
```

#### 4. Skip 2FA Setup
```http
POST /api/user/2fa/skip
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "password": "currentpassword"
}
```

### Game Routes

#### 1. Get Available Games
```http
GET /api/games?category=slots&provider=NetEnt&limit=20&offset=0
```

**Query Parameters:**
- `category` (optional): Filter by game category
- `provider` (optional): Filter by game provider
- `is_featured` (optional): Filter featured games
- `is_new` (optional): Filter new games
- `is_hot` (optional): Filter hot games
- `search` (optional): Search games by name
- `limit` (optional): Number of games to return (default: 50)
- `offset` (optional): Number of games to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Starburst",
      "category": "slots",
      "provider": "NetEnt",
      "thumbnail_url": "https://example.com/starburst.jpg",
      "is_featured": true,
      "is_new": false,
      "is_hot": true,
      "min_bet": 0.10,
      "max_bet": 100.00,
      "rtp": 96.1
    }
  ]
}
```

#### 2. Get Game Categories
```http
GET /api/games/categories
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "slots",
      "display_name": "Slot Games",
      "description": "Classic and video slot games"
    }
  ]
}
```

#### 3. Get Game Providers
```http
GET /api/games/providers
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "NetEnt",
      "display_name": "NetEnt",
      "description": "Leading slot game provider"
    }
  ]
}
```

#### 4. Get Featured Games
```http
GET /api/games/featured?limit=10
```

#### 5. Get Game by ID
```http
GET /api/games/1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Starburst",
    "category": "slots",
    "provider": "NetEnt",
    "description": "A cosmic slot adventure",
    "thumbnail_url": "https://example.com/starburst.jpg",
    "image_url": "https://example.com/starburst-large.jpg",
    "min_bet": 0.10,
    "max_bet": 100.00,
    "rtp": 96.1,
    "is_featured": true,
    "is_new": false,
    "is_hot": true,
    "play_count": 1250,
    "favorite_count": 89
  }
}
```

#### 6. Toggle Game Favorite
```http
POST /api/games/favorite
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "game_id": 1
}
```

#### 7. Play Game
```http
POST /api/games/play
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "game_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "play_url": "https://game-provider.com/launch?token=abc123",
    "game": {
      "id": 1,
      "name": "Starburst"
    }
  }
}
```

#### 8. Place Bet
```http
POST /api/games/bet
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "game_id": 1,
  "bet_amount": 10.00,
  "game_data": {
    "bet_type": "straight",
    "numbers": [7]
  }
}
```

### Payment Routes

#### 1. Get Payment Gateways
```http
GET /api/payment/gateways?type=deposit&currency=USD
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `type` (required): `deposit`, `withdrawal`, or `both`
- `currency` (required): Currency code (e.g., USD, EUR)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Stripe",
      "code": "stripe",
      "type": "card",
      "description": "Credit/Debit card payments",
      "logo_url": "https://example.com/stripe-logo.png",
      "website_url": "https://stripe.com",
      "supported_currencies": ["USD", "EUR", "GBP"],
      "supported_countries": ["US", "CA", "GB"],
      "min_amount": 5.00,
      "max_amount": 10000.00,
      "processing_time": "instant",
      "fees_percentage": 2.9,
      "fees_fixed": 0.30,
      "auto_approval": true,
      "requires_kyc": false
    }
  ]
}
```

#### 2. Create Payment
```http
POST /api/payment/create
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "gateway_id": 1,
  "amount": 100.00,
  "currency": "USD",
  "type": "deposit",
  "description": "Account deposit",
  "return_url": "https://frontend.jackpotx.net/payment/success",
  "cancel_url": "https://frontend.jackpotx.net/payment/cancel"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction_id": "txn_123456789",
    "payment_url": "https://checkout.stripe.com/pay/cs_test_...",
    "status": "pending",
    "amount": 100.00,
    "currency": "USD",
    "gateway_name": "Stripe",
    "order_id": "stripe_2_1703123456789_abc123def"
  }
}
```

#### 3. Check Payment Status
```http
GET /api/payment/status/txn_123456789
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction_id": "txn_123456789",
    "status": "completed",
    "amount": 100.00,
    "currency": "USD",
    "gateway_name": "Stripe",
    "processed_at": "2024-01-15T10:30:00Z"
  }
}
```

### Home Dashboard

#### Get Home Data
```http
GET /api/home
Authorization: Bearer <access_token> (optional)
```

**Response:**
```json
{
  "success": true,
  "message": "Home data retrieved successfully",
  "data": {
    "featured_games": [...],
    "new_games": [...],
    "hot_games": [...],
    "popular_games": [...],
    "user_stats": {
      "total_balance": 150.50,
      "total_bets": 50,
      "total_wins": 1350.25,
      "favorite_games_count": 5,
      "level_name": "Silver",
      "level_progress": 75.5
    },
    "recent_activity": [...],
    "promotions": [...],
    "announcements": [...],
    "quick_stats": {
      "total_games": 500,
      "total_categories": 10,
      "total_providers": 25,
      "active_players": 1500
    }
  }
}
```

## Admin Routes

### Authentication

#### Admin Login
```http
POST /api/admin/auth/login
```

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123",
  "api_key": "admin_api_key_123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin login successful",
  "token": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "admin": {
    "id": 1,
    "username": "admin",
    "role": "Admin",
    "permissions": ["users", "games", "payments", "settings"]
  }
}
```

### User Management

#### Get All Users
```http
GET /api/admin/users?page=1&limit=20&search=john&role=Player&status=active
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search by username/email
- `role` (optional): Filter by role
- `status` (optional): Filter by status (active, suspended, banned)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "username": "johndoe",
        "email": "john@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "role": "Player",
        "status": "active",
        "balance": 150.50,
        "created_at": "2024-01-01T00:00:00Z",
        "last_login": "2024-01-15T10:30:00Z",
        "is_2fa_enabled": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "total_pages": 8
    }
  }
}
```

#### Get User Details
```http
GET /api/admin/users/1
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

#### Update User
```http
PUT /api/admin/users/1
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "status": "active",
  "balance": 200.00,
  "roles": [2]
}
```

#### Suspend User
```http
POST /api/admin/users/1/suspend
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Request Body:**
```json
{
  "reason": "Violation of terms of service",
  "duration_days": 30
}
```

### Game Management

#### Import Games by Category
```http
POST /api/admin/games/import
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Request Body:**
```json
{
  "category": "slots",
  "provider": "NetEnt",
  "api_key": "game_provider_api_key"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Games imported successfully",
  "data": {
    "imported_count": 25,
    "updated_count": 5,
    "failed_count": 2,
    "games": [
      {
        "id": 1,
        "name": "Starburst",
        "status": "imported"
      }
    ]
  }
}
```

#### Get All Games
```http
GET /api/admin/games?page=1&limit=20&category=slots&provider=NetEnt&status=active
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

#### Update Game
```http
PUT /api/admin/games/1
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Request Body:**
```json
{
  "name": "Starburst Deluxe",
  "category": "slots",
  "provider": "NetEnt",
  "is_featured": true,
  "is_new": false,
  "is_hot": true,
  "min_bet": 0.10,
  "max_bet": 100.00,
  "rtp": 96.1,
  "status": "active"
}
```

### Payment Gateway Management

#### Get Payment Gateways
```http
GET /api/admin/payment-gateways
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

#### Create Payment Gateway
```http
POST /api/admin/payment-gateways
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Request Body:**
```json
{
  "name": "Stripe",
  "code": "stripe",
  "type": "card",
  "description": "Credit/Debit card payments",
  "logo_url": "https://example.com/stripe-logo.png",
  "website_url": "https://stripe.com",
  "api_key": "sk_test_...",
  "api_secret": "sk_test_...",
  "api_endpoint": "https://api.stripe.com",
  "webhook_url": "https://backend.jackpotx.net/webhooks/stripe",
  "webhook_secret": "whsec_...",
  "supported_currencies": ["USD", "EUR", "GBP"],
  "supported_countries": ["US", "CA", "GB"],
  "min_amount": 5.00,
  "max_amount": 10000.00,
  "processing_time": "instant",
  "fees_percentage": 2.9,
  "fees_fixed": 0.30,
  "auto_approval": true,
  "requires_kyc": false,
  "is_active": true,
  "config": {
    "test_mode": true,
    "sandbox_url": "https://api.stripe.com/v1"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment gateway created successfully",
  "data": {
    "id": 1,
    "name": "Stripe",
    "code": "stripe",
    "is_active": true
  }
}
```

#### Update Payment Gateway
```http
PUT /api/admin/payment-gateways/1
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

#### Toggle Payment Gateway Status
```http
POST /api/admin/payment-gateways/1/toggle
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

### Transaction Management

#### Get All Transactions
```http
GET /api/admin/transactions?page=1&limit=20&type=deposit&status=completed&user_id=1
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `type` (optional): Filter by type (deposit, withdrawal)
- `status` (optional): Filter by status (pending, completed, failed, cancelled)
- `user_id` (optional): Filter by user ID
- `gateway_id` (optional): Filter by payment gateway
- `date_from` (optional): Filter from date (YYYY-MM-DD)
- `date_to` (optional): Filter to date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": 1,
        "user_id": 1,
        "gateway_id": 1,
        "gateway_name": "Stripe",
        "type": "deposit",
        "amount": 100.00,
        "currency": "USD",
        "status": "completed",
        "transaction_id": "txn_123456789",
        "payment_url": "https://checkout.stripe.com/pay/cs_test_...",
        "gateway_response": {...},
        "created_at": "2024-01-15T10:30:00Z",
        "processed_at": "2024-01-15T10:35:00Z",
        "user": {
          "id": 1,
          "username": "johndoe",
          "email": "john@example.com"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "total_pages": 8
    },
    "summary": {
      "total_deposits": 5000.00,
      "total_withdrawals": 2000.00,
      "pending_deposits": 500.00,
      "pending_withdrawals": 300.00
    }
  }
}
```

#### Approve Transaction
```http
POST /api/admin/transactions/1/approve
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Request Body:**
```json
{
  "notes": "Manual approval by admin"
}
```

#### Reject Transaction
```http
POST /api/admin/transactions/1/reject
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Request Body:**
```json
{
  "reason": "Insufficient documentation",
  "notes": "KYC documents required"
}
```

### Betting Management

#### Get All Bets
```http
GET /api/admin/bets?page=1&limit=20&user_id=1&game_id=1&status=completed
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `user_id` (optional): Filter by user ID
- `game_id` (optional): Filter by game ID
- `status` (optional): Filter by status (pending, completed, cancelled)
- `outcome` (optional): Filter by outcome (win, lose)
- `date_from` (optional): Filter from date (YYYY-MM-DD)
- `date_to` (optional): Filter to date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "bets": [
      {
        "id": 1,
        "user_id": 1,
        "game_id": 1,
        "game_name": "Starburst",
        "bet_amount": 10.00,
        "win_amount": 15.00,
        "outcome": "win",
        "status": "completed",
        "game_data": {
          "bet_type": "straight",
          "numbers": [7]
        },
        "created_at": "2024-01-15T10:30:00Z",
        "processed_at": "2024-01-15T10:35:00Z",
        "user": {
          "id": 1,
          "username": "johndoe"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "total_pages": 8
    },
    "summary": {
      "total_bets": 500,
      "total_wagered": 5000.00,
      "total_won": 5500.00,
      "total_lost": 4500.00,
      "profit": 1000.00
    }
  }
}
```

#### Process Bet Result
```http
POST /api/admin/bames/bet/result
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Request Body:**
```json
{
  "bet_id": 1,
  "outcome": "win",
  "win_amount": 15.00,
  "game_result": {
    "winning_numbers": [7, 11, 23],
    "multiplier": 1.5
  }
}
```

### System Settings

#### Get System Settings
```http
GET /api/admin/settings
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "site_name": "JackpotX",
    "site_description": "Premium online casino",
    "site_logo": "https://example.com/logo.png",
    "site_favicon": "https://example.com/favicon.ico",
    "maintenance_mode": false,
    "registration_enabled": true,
    "email_verification_required": false,
    "phone_verification_required": false,
    "kyc_required": false,
    "min_deposit": 5.00,
    "max_deposit": 10000.00,
    "min_withdrawal": 10.00,
    "max_withdrawal": 5000.00,
    "default_currency": "USD",
    "supported_currencies": ["USD", "EUR", "GBP"],
    "default_language": "en",
    "supported_languages": ["en", "es", "fr"],
    "timezone": "UTC",
    "contact_email": "support@jackpotx.net",
    "contact_phone": "+1234567890",
    "support_chat_enabled": true,
    "live_chat_url": "https://support.jackpotx.net/chat"
  }
}
```

#### Update System Settings
```http
PUT /api/admin/settings
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Request Body:**
```json
{
  "site_name": "JackpotX Premium",
  "maintenance_mode": false,
  "min_deposit": 10.00,
  "max_deposit": 15000.00,
  "contact_email": "support@jackpotx.net"
}
```

### Analytics & Reports

#### Get Dashboard Analytics
```http
GET /api/admin/analytics/dashboard
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_users": 1500,
      "active_users_today": 250,
      "new_users_today": 15,
      "total_revenue": 50000.00,
      "revenue_today": 2500.00,
      "total_bets": 5000,
      "bets_today": 300,
      "total_games": 500,
      "active_games": 450
    },
    "charts": {
      "user_growth": [
        {"date": "2024-01-01", "users": 1400},
        {"date": "2024-01-02", "users": 1420},
        {"date": "2024-01-03", "users": 1450}
      ],
      "revenue_trend": [
        {"date": "2024-01-01", "revenue": 48000.00},
        {"date": "2024-01-02", "revenue": 49000.00},
        {"date": "2024-01-03", "revenue": 50000.00}
      ],
      "top_games": [
        {"game": "Starburst", "plays": 1250},
        {"game": "Book of Dead", "plays": 1100},
        {"game": "Gonzo's Quest", "plays": 950}
      ]
    },
    "recent_activity": [
      {
        "type": "user_registration",
        "user": "johndoe",
        "timestamp": "2024-01-15T10:30:00Z"
      },
      {
        "type": "large_deposit",
        "user": "player123",
        "amount": 1000.00,
        "timestamp": "2024-01-15T10:25:00Z"
      }
    ]
  }
}
```

#### Get User Analytics
```http
GET /api/admin/analytics/users?period=30d
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Query Parameters:**
- `period` (optional): Time period (7d, 30d, 90d, 1y)

#### Get Revenue Analytics
```http
GET /api/admin/analytics/revenue?period=30d&currency=USD
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

#### Get Game Analytics
```http
GET /api/admin/analytics/games?period=30d
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone_number VARCHAR(20),
  date_of_birth DATE,
  nationality VARCHAR(100),
  country VARCHAR(100),
  city VARCHAR(100),
  address TEXT,
  postal_code VARCHAR(20),
  gender VARCHAR(10),
  timezone VARCHAR(50),
  language VARCHAR(10),
  currency VARCHAR(3),
  balance DECIMAL(15,2) DEFAULT 0.00,
  level_name VARCHAR(50) DEFAULT 'Bronze',
  verification_level INTEGER DEFAULT 0,
  auth_secret VARCHAR(32),
  qr_code TEXT,
  is_2fa_enabled BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### User Roles Table
```sql
CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  role_id INTEGER REFERENCES roles(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Roles Table
```sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Games Table
```sql
CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  provider VARCHAR(100),
  description TEXT,
  thumbnail_url VARCHAR(500),
  image_url VARCHAR(500),
  play_url VARCHAR(500),
  min_bet DECIMAL(10,2),
  max_bet DECIMAL(10,2),
  rtp DECIMAL(5,2),
  is_featured BOOLEAN DEFAULT FALSE,
  is_new BOOLEAN DEFAULT FALSE,
  is_hot BOOLEAN DEFAULT FALSE,
  play_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### User Game Favorites Table
```sql
CREATE TABLE user_game_favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  game_id INTEGER REFERENCES games(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, game_id)
);
```

### User Game Activity Table
```sql
CREATE TABLE user_game_activity (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  game_id INTEGER REFERENCES games(id),
  play_time_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Bets Table
```sql
CREATE TABLE bets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  game_id INTEGER REFERENCES games(id),
  bet_amount DECIMAL(15,2) NOT NULL,
  win_amount DECIMAL(15,2) DEFAULT 0.00,
  outcome VARCHAR(10),
  status VARCHAR(20) DEFAULT 'pending',
  game_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP
);
```

### Payment Gateways Table
```sql
CREATE TABLE payment_gateways (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  logo_url VARCHAR(500),
  website_url VARCHAR(500),
  api_key VARCHAR(255),
  api_secret VARCHAR(255),
  api_endpoint VARCHAR(500),
  webhook_url VARCHAR(500),
  webhook_secret VARCHAR(255),
  supported_currencies TEXT[],
  supported_countries TEXT[],
  min_amount DECIMAL(10,2),
  max_amount DECIMAL(10,2),
  processing_time VARCHAR(50),
  fees_percentage DECIMAL(5,2),
  fees_fixed DECIMAL(10,2),
  auto_approval BOOLEAN DEFAULT FALSE,
  requires_kyc BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  config JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Transactions Table
```sql
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  gateway_id INTEGER REFERENCES payment_gateways(id),
  type VARCHAR(20) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  transaction_id VARCHAR(255),
  payment_url VARCHAR(500),
  gateway_response JSONB,
  description TEXT,
  return_url VARCHAR(500),
  cancel_url VARCHAR(500),
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### CAPTCHA Table
```sql
CREATE TABLE captcha (
  id VARCHAR(100) PRIMARY KEY,
  text VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);
```

## Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ],
  "code": "VALIDATION_ERROR"
}
```

### Common Error Codes
- `VALIDATION_ERROR` - Input validation failed
- `AUTHENTICATION_ERROR` - Invalid credentials or token
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `DUPLICATE_ENTRY` - Resource already exists
- `INSUFFICIENT_BALANCE` - User doesn't have enough balance
- `PAYMENT_ERROR` - Payment gateway error
- `MAINTENANCE_MODE` - System is in maintenance mode
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_SERVER_ERROR` - Server error

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `429` - Too Many Requests
- `500` - Internal Server Error

## WebSocket Integration

### Connection
```javascript
const socket = io('https://backend.jackpotx.net', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### Events

#### User Events
- `user:balance_updated` - User balance changed
- `user:level_up` - User level increased
- `user:achievement_unlocked` - New achievement unlocked

#### Game Events
- `game:started` - Game session started
- `game:ended` - Game session ended
- `game:bet_placed` - New bet placed
- `game:result_processed` - Bet result processed

#### System Events
- `system:maintenance` - Maintenance mode activated/deactivated
- `system:announcement` - New announcement
- `system:promotion` - New promotion

### Example Usage
```javascript
// Listen for balance updates
socket.on('user:balance_updated', (data) => {
  console.log('New balance:', data.balance);
  updateUI(data.balance);
});

// Listen for game events
socket.on('game:result_processed', (data) => {
  console.log('Bet result:', data);
  showResult(data);
});
```

## File Upload Guidelines

### Supported Formats
- **Images:** JPG, PNG, GIF, WebP (max 5MB)
- **Documents:** PDF, DOC, DOCX (max 10MB)
- **Videos:** MP4, WebM (max 50MB)

### Upload Endpoints

#### Profile Picture
```http
POST /api/user/profile/picture
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body:**
```
picture: [file]
```

#### Game Assets
```http
POST /api/admin/games/1/assets
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
Content-Type: multipart/form-data
```

**Request Body:**
```
thumbnail: [file]
image: [file]
video: [file] (optional)
```

### Response Format
```json
{
  "success": true,
  "data": {
    "url": "https://cdn.jackpotx.net/images/profile/123.jpg",
    "filename": "profile_123.jpg",
    "size": 1024000,
    "mime_type": "image/jpeg"
  }
}
```

## Testing Guidelines

### API Testing
Use the provided Postman collection or curl commands for testing:

```bash
# Test authentication
curl -X POST https://backend.jackpotx.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'

# Test protected endpoint
curl -X GET https://backend.jackpotx.net/api/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Data
Use these test accounts for development:

**Regular User:**
- Username: `testuser`
- Email: `test@example.com`
- Password: `password123`

**Admin User:**
- Username: `admin`
- Email: `admin@jackpotx.net`
- Password: `admin123`
- API Key: `admin_api_key_123`

### Environment Variables for Testing
```bash
# Test Database
DATABASE_URL=postgresql://test:test@localhost:5432/jackpotx_test

# Test JWT Secrets
JWT_ACCESS_SECRET=test_access_secret
JWT_REFRESH_SECRET=test_refresh_secret

# Test External APIs
QR_API_BASE_URL=http://54.151.247.5:86
CAPTCHA_SECRET=test_captcha_secret

# Test Frontend URLs
FRONTEND_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001
```

## Security Considerations

### Rate Limiting
- Authentication endpoints: 5 requests per minute
- API endpoints: 100 requests per minute
- File uploads: 10 requests per minute

### Input Validation
- All inputs are validated using Zod schemas
- SQL injection protection through parameterized queries
- XSS protection through input sanitization

### CORS Configuration
```javascript
{
  origin: ['https://frontend.jackpotx.net', 'https://admin.jackpotx.net'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}
```

### Data Encryption
- Passwords are hashed using bcrypt
- Sensitive data is encrypted at rest
- API keys are stored securely
- JWT tokens are signed with strong secrets

## Deployment

### Production Environment
- **Backend:** Node.js 18+ with Express
- **Database:** PostgreSQL 14+
- **Cache:** Redis 6+
- **File Storage:** AWS S3 or similar
- **CDN:** CloudFront or similar

### Environment Setup
```bash
# Install dependencies
npm install

# Run database migrations
npm run migrate

# Seed initial data
npm run seed

# Start production server
npm start
```

### Monitoring
- Application logs via Winston
- Database performance monitoring
- API response time tracking
- Error tracking and alerting

## Support & Contact

For technical support or questions about integration:

- **Email:** dev-support@jackpotx.net
- **Documentation:** https://backend.jackpotx.net/docs
- **GitHub Issues:** https://github.com/jackpotx/backend/issues
- **Discord:** https://discord.gg/jackpotx-dev

---

**Last Updated:** January 15, 2024
**Version:** 1.0.0
**Backend Version:** 1.0.0
  // ... existing code ...
  "fees_percentage": 2.9,
  "fees_fixed": 0.30,
  "auto_approval": true,
  "requires_kyc": false,
  "is_active": true
}
```

#### Update Payment Gateway
```http
PUT /api/admin/payment-gateways/1
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

#### Delete Payment Gateway
```http
DELETE /api/admin/payment-gateways/1
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

### Transaction Management

#### Get All Transactions
```http
GET /api/admin/transactions?page=1&limit=20&type=deposit&status=completed&user_id=1
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `type` (optional): Filter by type (deposit, withdrawal)
- `status` (optional): Filter by status (pending, completed, failed, cancelled)
- `user_id` (optional): Filter by user ID
- `gateway_id` (optional): Filter by payment gateway
- `date_from` (optional): Filter from date (YYYY-MM-DD)
- `date_to` (optional): Filter to date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": 1,
        "user_id": 1,
        "gateway_id": 1,
        "type": "deposit",
        "amount": 100.00,
        "currency": "USD",
        "status": "completed",
        "transaction_id": "txn_123456789",
        "gateway_response": {...},
        "created_at": "2024-01-15T10:30:00Z",
        "processed_at": "2024-01-15T10:32:00Z",
        "user": {
          "id": 1,
          "username": "johndoe",
          "email": "john@example.com"
        },
        "gateway": {
          "id": 1,
          "name": "Stripe",
          "code": "stripe"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "total_pages": 8
    }
  }
}
```

#### Approve Transaction
```http
POST /api/admin/transactions/1/approve
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

#### Reject Transaction
```http
POST /api/admin/transactions/1/reject
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Request Body:**
```json
{
  "reason": "Insufficient funds"
}
```

### System Settings

#### Get System Settings
```http
GET /api/admin/settings
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "site_name": "JackpotX",
    "site_description": "Premium Online Casino",
    "maintenance_mode": false,
    "registration_enabled": true,
    "email_verification_required": false,
    "phone_verification_required": false,
    "kyc_required": false,
    "min_deposit": 10.00,
    "max_deposit": 10000.00,
    "min_withdrawal": 20.00,
    "max_withdrawal": 5000.00,
    "default_currency": "USD",
    "supported_currencies": ["USD", "EUR", "GBP"],
    "contact_email": "support@jackpotx.net",
    "support_phone": "+1-800-JACKPOT",
    "terms_url": "https://jackpotx.net/terms",
    "privacy_url": "https://jackpotx.net/privacy",
    "social_media": {
      "facebook": "https://facebook.com/jackpotx",
      "twitter": "https://twitter.com/jackpotx",
      "instagram": "https://instagram.com/jackpotx"
    }
  }
}
```

#### Update System Settings
```http
PUT /api/admin/settings
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Request Body:**
```json
{
  "site_name": "JackpotX Premium",
  "maintenance_mode": false,
  "registration_enabled": true,
  "min_deposit": 10.00,
  "max_deposit": 10000.00,
  "contact_email": "support@jackpotx.net"
}
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone_number VARCHAR(20),
  date_of_birth DATE,
  nationality VARCHAR(100),
  country VARCHAR(100),
  city VARCHAR(100),
  address TEXT,
  postal_code VARCHAR(20),
  gender VARCHAR(10),
  timezone VARCHAR(50),
  language VARCHAR(10) DEFAULT 'en',
  currency VARCHAR(3) DEFAULT 'USD',
  balance DECIMAL(15,2) DEFAULT 0.00,
  status VARCHAR(20) DEFAULT 'active',
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  kyc_verified BOOLEAN DEFAULT false,
  auth_secret VARCHAR(32),
  qr_code TEXT,
  is_2fa_enabled BOOLEAN DEFAULT false,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### User Roles Table
```sql
CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Roles Table
```sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Games Table
```sql
CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  provider VARCHAR(100) NOT NULL,
  description TEXT,
  thumbnail_url VARCHAR(500),
  image_url VARCHAR(500),
  play_url VARCHAR(500),
  min_bet DECIMAL(10,2) DEFAULT 0.10,
  max_bet DECIMAL(10,2) DEFAULT 1000.00,
  rtp DECIMAL(5,2),
  is_featured BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,
  is_hot BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'active',
  play_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Game Favorites Table
```sql
CREATE TABLE game_favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, game_id)
);
```

### Game Plays Table
```sql
CREATE TABLE game_plays (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  play_time_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Bets Table
```sql
CREATE TABLE bets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  bet_amount DECIMAL(10,2) NOT NULL,
  win_amount DECIMAL(10,2) DEFAULT 0.00,
  outcome VARCHAR(20) DEFAULT 'pending',
  game_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP
);
```

### Payment Gateways Table
```sql
CREATE TABLE payment_gateways (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  logo_url VARCHAR(500),
  website_url VARCHAR(500),
  api_key VARCHAR(255),
  api_secret VARCHAR(255),
  api_endpoint VARCHAR(500),
  webhook_url VARCHAR(500),
  webhook_secret VARCHAR(255),
  config JSONB,
  supported_currencies TEXT[],
  supported_countries TEXT[],
  min_amount DECIMAL(10,2),
  max_amount DECIMAL(10,2),
  processing_time VARCHAR(50),
  fees_percentage DECIMAL(5,2),
  fees_fixed DECIMAL(10,2),
  auto_approval BOOLEAN DEFAULT false,
  requires_kyc BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Transactions Table
```sql
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  gateway_id INTEGER REFERENCES payment_gateways(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  transaction_id VARCHAR(255) UNIQUE,
  order_id VARCHAR(255),
  payment_url VARCHAR(500),
  gateway_response JSONB,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP
);
```

### User Activity Table
```sql
CREATE TABLE user_activity (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  action_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### CAPTCHA Table
```sql
CREATE TABLE captcha (
  id VARCHAR(100) PRIMARY KEY,
  text VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "error_code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common Error Codes
- `AUTH_REQUIRED` - Authentication required
- `INVALID_TOKEN` - Invalid or expired token
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `VALIDATION_ERROR` - Request validation failed
- `RESOURCE_NOT_FOUND` - Requested resource not found
- `INSUFFICIENT_BALANCE` - User has insufficient balance
- `GAME_NOT_AVAILABLE` - Game is not available
- `PAYMENT_FAILED` - Payment processing failed
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `MAINTENANCE_MODE` - System is in maintenance mode

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `429` - Too Many Requests
- `500` - Internal Server Error

### Example Error Responses

#### Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "error_code": "VALIDATION_ERROR",
  "details": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  }
}
```

#### Authentication Error
```json
{
  "success": false,
  "message": "Invalid authentication code",
  "error_code": "AUTH_REQUIRED"
}
```

#### Insufficient Balance
```json
{
  "success": false,
  "message": "Insufficient balance for this bet",
  "error_code": "INSUFFICIENT_BALANCE",
  "details": {
    "required": 100.00,
    "available": 50.00
  }
}
```

## WebSocket Integration

### Connection
```javascript
const socket = io('https://backend.jackpotx.net', {
  auth: {
    token: 'your_access_token'
  }
});
```

### Events

#### Client to Server
- `join_game` - Join a game room
- `leave_game` - Leave a game room
- `place_bet` - Place a bet
- `game_action` - Perform game action

#### Server to Client
- `game_update` - Game state update
- `bet_result` - Bet result notification
- `balance_update` - Balance change notification
- `system_notification` - System-wide notification

### Example Usage
```javascript
// Join game room
socket.emit('join_game', { game_id: 1 });

// Listen for game updates
socket.on('game_update', (data) => {
  console.log('Game updated:', data);
});

// Listen for bet results
socket.on('bet_result', (data) => {
  console.log('Bet result:', data);
  if (data.outcome === 'win') {
    showWinNotification(data.win_amount);
  }
});

// Listen for balance updates
socket.on('balance_update', (data) => {
  updateUserBalance(data.new_balance);
});
```

## File Upload Guidelines

### Supported File Types
- **Images:** JPG, JPEG, PNG, GIF, WebP
- **Documents:** PDF, DOC, DOCX
- **Archives:** ZIP, RAR

### File Size Limits
- **Profile Pictures:** 5MB max
- **Game Images:** 10MB max
- **Documents:** 20MB max

### Upload Endpoints

#### Upload Profile Picture
```http
POST /api/user/profile/picture
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body:**
```
file: [binary file data]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://cdn.jackpotx.net/profiles/user_1_picture.jpg",
    "filename": "user_1_picture.jpg"
  }
}
```

#### Upload Game Image
```http
POST /api/admin/games/1/image
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
Content-Type: multipart/form-data
```

### File Storage
- Files are stored in cloud storage (AWS S3 or similar)
- CDN is used for fast delivery
- Automatic image optimization and resizing
- Backup and redundancy implemented

## Testing Guidelines

### API Testing

#### Authentication Tests
```javascript
describe('Authentication', () => {
  test('should register new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        type: 'Player',
        captcha_id: 'test_captcha',
        captcha_text: '1234'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test('should login user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'password123',
        auth_code: '123456'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });
});
```

#### Game Tests
```javascript
describe('Games', () => {
  test('should get available games', async () => {
    const response = await request(app)
      .get('/api/games?category=slots&limit=10');
    
    expect(response.status).toBe(200);
    expect(response.body.data).toBeInstanceOf(Array);
  });

  test('should place bet', async () => {
    const response = await request(app)
      .post('/api/games/bet')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        game_id: 1,
        bet_amount: 10.00
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

### Frontend Testing

#### Component Tests
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import LoginForm from '../components/LoginForm';

describe('LoginForm', () => {
  test('should handle login submission', async () => {
    render(<LoginForm />);
    
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'testuser' }
    });
    
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Login successful')).toBeInTheDocument();
    });
  });
});
```

### Integration Tests
```javascript
describe('Game Integration', () => {
  test('should complete full game flow', async () => {
    // 1. Login user
    const loginResponse = await loginUser('testuser', 'password123');
    const token = loginResponse.token.access_token;
    
    // 2. Get user balance
    const balanceResponse = await getUserBalance(token);
    const initialBalance = balanceResponse.data.balance;
    
    // 3. Place bet
    const betResponse = await placeBet(token, 1, 10.00);
    expect(betResponse.success).toBe(true);
    
    // 4. Check balance decreased
    const newBalanceResponse = await getUserBalance(token);
    expect(newBalanceResponse.data.balance).toBe(initialBalance - 10.00);
  });
});
```

## Security Guidelines

### Authentication Security
- JWT tokens with short expiration (15 minutes)
- Refresh tokens with longer expiration (7 days)
- Secure token storage in HTTP-only cookies
- CSRF protection implemented
- Rate limiting on authentication endpoints

### Data Protection
- All sensitive data encrypted at rest
- HTTPS enforced for all communications
- Input validation and sanitization
- SQL injection prevention
- XSS protection

### Payment Security
- PCI DSS compliance for payment processing
- Secure payment gateway integration
- Transaction logging and monitoring
- Fraud detection systems
- Secure webhook handling

### API Security
- API key authentication for admin endpoints
- Request signing for sensitive operations
- IP whitelisting for admin access
- Comprehensive audit logging
- Regular security assessments

## Performance Guidelines

### API Performance
- Response time target: < 200ms for most endpoints
- Database query optimization
- Caching for frequently accessed data
- Pagination for large datasets
- Rate limiting to prevent abuse

### Frontend Performance
- Lazy loading for game components
- Image optimization and compression
- CDN usage for static assets
- Progressive Web App features
- Offline functionality where possible

### Database Performance
- Indexed queries for fast lookups
- Connection pooling
- Query optimization
- Regular database maintenance
- Backup and recovery procedures

## Deployment Guidelines

### Environment Setup
```bash
# Production environment variables
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_ACCESS_SECRET=your_secure_secret
JWT_REFRESH_SECRET=your_secure_refresh_secret
FRONTEND_URL=https://frontend.jackpotx.net
ADMIN_URL=https://admin.jackpotx.net
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Monitoring
- Application performance monitoring (APM)
- Error tracking and alerting
- Uptime monitoring
- Database performance monitoring
- Payment transaction monitoring

## Support and Contact

### Technical Support
- **Email:** tech-support@jackpotx.net
- **Phone:** +1-800-JACKPOT

  "fees_percentage": 2.9,
  "fees_fixed": 0.30,
  "auto_approval": true,
  "requires_kyc": false,
  "is_active": true,
  "config": {
    "test_mode": true,
    "sandbox_url": "https://api.stripe.com/v1"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment gateway created successfully",
  "data": {
    "id": 1,
    "name": "Stripe",
    "code": "stripe",
    "is_active": true
  }
}
```

#### Update Payment Gateway
```http
PUT /api/admin/payment-gateways/1
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

#### Toggle Payment Gateway Status
```http
POST /api/admin/payment-gateways/1/toggle
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

### Transaction Management

#### Get All Transactions
```http
GET /api/admin/transactions?page=1&limit=20&type=deposit&status=completed&user_id=1
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `type` (optional): Filter by type (deposit, withdrawal)
- `status` (optional): Filter by status (pending, completed, failed, cancelled)
- `user_id` (optional): Filter by user ID
- `gateway_id` (optional): Filter by payment gateway
- `date_from` (optional): Filter from date (YYYY-MM-DD)
- `date_to` (optional): Filter to date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": 1,
        "user_id": 1,
        "gateway_id": 1,
        "gateway_name": "Stripe",
        "type": "deposit",
        "amount": 100.00,
        "currency": "USD",
        "status": "completed",
        "transaction_id": "txn_123456789",
        "payment_url": "https://checkout.stripe.com/pay/cs_test_...",
        "gateway_response": {...},
        "created_at": "2024-01-15T10:30:00Z",
        "processed_at": "2024-01-15T10:35:00Z",
        "user": {
          "id": 1,
          "username": "johndoe",
          "email": "john@example.com"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "total_pages": 8
    },
    "summary": {
      "total_deposits": 5000.00,
      "total_withdrawals": 2000.00,
      "pending_deposits": 500.00,
      "pending_withdrawals": 300.00
    }
  }
}
```

#### Approve Transaction
```http
POST /api/admin/transactions/1/approve
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Request Body:**
```json
{
  "notes": "Manual approval by admin"
}
```

#### Reject Transaction
```http
POST /api/admin/transactions/1/reject
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Request Body:**
```json
{
  "reason": "Insufficient documentation",
  "notes": "KYC documents required"
}
```

### Betting Management

#### Get All Bets
```http
GET /api/admin/bets?page=1&limit=20&user_id=1&game_id=1&status=completed
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `user_id` (optional): Filter by user ID
- `game_id` (optional): Filter by game ID
- `status` (optional): Filter by status (pending, completed, cancelled)
- `outcome` (optional): Filter by outcome (win, lose)
- `date_from` (optional): Filter from date (YYYY-MM-DD)
- `date_to` (optional): Filter to date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "bets": [
      {
        "id": 1,
        "user_id": 1,
        "game_id": 1,
        "game_name": "Starburst",
        "bet_amount": 10.00,
        "win_amount": 15.00,
        "outcome": "win",
        "status": "completed",
        "game_data": {
          "bet_type": "straight",
          "numbers": [7]
        },
        "created_at": "2024-01-15T10:30:00Z",
        "processed_at": "2024-01-15T10:35:00Z",
        "user": {
          "id": 1,
          "username": "johndoe"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "total_pages": 8
    },
    "summary": {
      "total_bets": 500,
      "total_wagered": 5000.00,
      "total_won": 5500.00,
      "total_lost": 4500.00,
      "profit": 1000.00
    }
  }
}
```

#### Process Bet Result
```http
POST /api/admin/games/bet/result
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Request Body:**
```json
{
  "bet_id": 1,
  "outcome": "win",
  "win_amount": 15.00,
  "game_result": {
    "winning_numbers": [7, 11, 23],
    "multiplier": 1.5
  }
}
```

### System Settings

#### Get System Settings
```http
GET /api/admin/settings
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "site_name": "JackpotX",
    "site_description": "Premium online casino",
    "site_logo": "https://example.com/logo.png",
    "site_favicon": "https://example.com/favicon.ico",
    "maintenance_mode": false,
    "registration_enabled": true,
    "email_verification_required": false,
    "phone_verification_required": false,
    "kyc_required": false,
    "min_deposit": 5.00,
    "max_deposit": 10000.00,
    "min_withdrawal": 10.00,
    "max_withdrawal": 5000.00,
    "default_currency": "USD",
    "supported_currencies": ["USD", "EUR", "GBP"],
    "default_language": "en",
    "supported_languages": ["en", "es", "fr"],
    "timezone": "UTC",
    "contact_email": "support@jackpotx.net",
    "contact_phone": "+1234567890",
    "support_chat_enabled": true,
    "live_chat_url": "https://support.jackpotx.net/chat"
  }
}
```

#### Update System Settings
```http
PUT /api/admin/settings
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Request Body:**
```json
{
  "site_name": "JackpotX Premium",
  "maintenance_mode": false,
  "min_deposit": 10.00,
  "max_deposit": 15000.00,
  "contact_email": "support@jackpotx.net"
}
```

### Analytics & Reports

#### Get Dashboard Analytics
```http
GET /api/admin/analytics/dashboard
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_users": 1500,
      "active_users_today": 250,
      "new_users_today": 15,
      "total_revenue": 50000.00,
      "revenue_today": 2500.00,
      "total_bets": 5000,
      "bets_today": 300,
      "total_games": 500,
      "active_games": 450
    },
    "charts": {
      "user_growth": [
        {"date": "2024-01-01", "users": 1400},
        {"date": "2024-01-02", "users": 1420},
        {"date": "2024-01-03", "users": 1450}
      ],
      "revenue_trend": [
        {"date": "2024-01-01", "revenue": 48000.00},
        {"date": "2024-01-02", "revenue": 49000.00},
        {"date": "2024-01-03", "revenue": 50000.00}
      ],
      "top_games": [
        {"game": "Starburst", "plays": 1250},
        {"game": "Book of Dead", "plays": 1100},
        {"game": "Gonzo's Quest", "plays": 950}
      ]
    },
    "recent_activity": [
      {
        "type": "user_registration",
        "user": "johndoe",
        "timestamp": "2024-01-15T10:30:00Z"
      },
      {
        "type": "large_deposit",
        "user": "player123",
        "amount": 1000.00,
        "timestamp": "2024-01-15T10:25:00Z"
      }
    ]
  }
}
```

#### Get User Analytics
```http
GET /api/admin/analytics/users?period=30d
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Query Parameters:**
- `period` (optional): Time period (7d, 30d, 90d, 1y)

#### Get Revenue Analytics
```http
GET /api/admin/analytics/revenue?period=30d&currency=USD
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

#### Get Game Analytics
```http
GET /api/admin/analytics/games?period=30d
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone_number VARCHAR(20),
  date_of_birth DATE,
  nationality VARCHAR(100),
  country VARCHAR(100),
  city VARCHAR(100),
  address TEXT,
  postal_code VARCHAR(20),
  gender VARCHAR(10),
  timezone VARCHAR(50),
  language VARCHAR(10),
  currency VARCHAR(3),
  balance DECIMAL(15,2) DEFAULT 0.00,
  level_name VARCHAR(50) DEFAULT 'Bronze',
  verification_level INTEGER DEFAULT 0,
  auth_secret VARCHAR(32),
  qr_code TEXT,
  is_2fa_enabled BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### User Roles Table
```sql
CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  role_id INTEGER REFERENCES roles(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Roles Table
```sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Games Table
```sql
CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  provider VARCHAR(100),
  description TEXT,
  thumbnail_url VARCHAR(500),
  image_url VARCHAR(500),
  play_url VARCHAR(500),
  min_bet DECIMAL(10,2),
  max_bet DECIMAL(10,2),
  rtp DECIMAL(5,2),
  is_featured BOOLEAN DEFAULT FALSE,
  is_new BOOLEAN DEFAULT FALSE,
  is_hot BOOLEAN DEFAULT FALSE,
  play_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### User Game Favorites Table
```sql
CREATE TABLE user_game_favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  game_id INTEGER REFERENCES games(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, game_id)
);
```

### User Game Activity Table
```sql
CREATE TABLE user_game_activity (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  game_id INTEGER REFERENCES games(id),
  play_time_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Bets Table
```sql
CREATE TABLE bets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  game_id INTEGER REFERENCES games(id),
  bet_amount DECIMAL(15,2) NOT NULL,
  win_amount DECIMAL(15,2) DEFAULT 0.00,
  outcome VARCHAR(10),
  status VARCHAR(20) DEFAULT 'pending',
  game_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP
);
```

### Payment Gateways Table
```sql
CREATE TABLE payment_gateways (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  logo_url VARCHAR(500),
  website_url VARCHAR(500),
  api_key VARCHAR(255),
  api_secret VARCHAR(255),
  api_endpoint VARCHAR(500),
  webhook_url VARCHAR(500),
  webhook_secret VARCHAR(255),
  supported_currencies TEXT[],
  supported_countries TEXT[],
  min_amount DECIMAL(10,2),
  max_amount DECIMAL(10,2),
  processing_time VARCHAR(50),
  fees_percentage DECIMAL(5,2),
  fees_fixed DECIMAL(10,2),
  auto_approval BOOLEAN DEFAULT FALSE,
  requires_kyc BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  config JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Transactions Table
```sql
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  gateway_id INTEGER REFERENCES payment_gateways(id),
  type VARCHAR(20) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  transaction_id VARCHAR(255),
  payment_url VARCHAR(500),
  gateway_response JSONB,
  description TEXT,
  return_url VARCHAR(500),
  cancel_url VARCHAR(500),
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### CAPTCHA Table
```sql
CREATE TABLE captcha (
  id VARCHAR(100) PRIMARY KEY,
  text VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);
```

## Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ],
  "code": "VALIDATION_ERROR"
}
```

### Common Error Codes
- `VALIDATION_ERROR` - Input validation failed
- `AUTHENTICATION_ERROR` - Invalid credentials or token
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `DUPLICATE_ENTRY` - Resource already exists
- `INSUFFICIENT_BALANCE` - User doesn't have enough balance
- `PAYMENT_ERROR` - Payment gateway error
- `MAINTENANCE_MODE` - System is in maintenance mode
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_SERVER_ERROR` - Server error

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `429` - Too Many Requests
- `500` - Internal Server Error

## WebSocket Integration

### Connection
```javascript
const socket = io('https://backend.jackpotx.net', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### Events

#### User Events
- `user:balance_updated` - User balance changed
- `user:level_up` - User level increased
- `user:achievement_unlocked` - New achievement unlocked

#### Game Events
- `game:started` - Game session started
- `game:ended` - Game session ended
- `game:bet_placed` - New bet placed
- `game:result_processed` - Bet result processed

#### System Events
- `system:maintenance` - Maintenance mode activated/deactivated
- `system:announcement` - New announcement
- `system:promotion` - New promotion

### Example Usage
```javascript
// Listen for balance updates
socket.on('user:balance_updated', (data) => {
  console.log('New balance:', data.balance);
  updateUI(data.balance);
});

// Listen for game events
socket.on('game:result_processed', (data) => {
  console.log('Bet result:', data);
  showResult(data);
});
```

## File Upload Guidelines

### Supported Formats
- **Images:** JPG, PNG, GIF, WebP (max 5MB)
- **Documents:** PDF, DOC, DOCX (max 10MB)
- **Videos:** MP4, WebM (max 50MB)

### Upload Endpoints

#### Profile Picture
```http
POST /api/user/profile/picture
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body:**
```
picture: [file]
```

#### Game Assets
```http
POST /api/admin/games/1/assets
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
Content-Type: multipart/form-data
```

**Request Body:**
```
thumbnail: [file]
image: [file]
video: [file] (optional)
```

### Response Format
```json
{
  "success": true,
  "data": {
    "url": "https://cdn.jackpotx.net/images/profile/123.jpg",
    "filename": "profile_123.jpg",
    "size": 1024000,
    "mime_type": "image/jpeg"
  }
}
```

## Testing Guidelines

### API Testing
Use the provided Postman collection or curl commands for testing:

```bash
# Test authentication
curl -X POST https://backend.jackpotx.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'

# Test protected endpoint
curl -X GET https://backend.jackpotx.net/api/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Data
Use these test accounts for development:

**Regular User:**
- Use