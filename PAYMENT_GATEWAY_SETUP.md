# Payment Gateway System Setup Guide

## Overview
The payment gateway system allows you to dynamically connect multiple payment gateways using API keys stored in the database.

## Features
- Dynamic gateway management via database
- Support for Stripe, PayPal, Razorpay, and Crypto payments
- API key management and connection testing
- Webhook support for payment notifications
- User-facing payment creation and status checking

## Database Setup
The system automatically creates the `payment_gateways` table with the following structure:

```sql
CREATE TABLE payment_gateways (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'both')),
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  api_endpoint TEXT,
  api_key TEXT,
  api_secret TEXT,
  webhook_url TEXT,
  webhook_secret TEXT,
  is_active BOOLEAN DEFAULT true,
  supported_currencies TEXT[],
  supported_countries TEXT[],
  min_amount DECIMAL(15,2),
  max_amount DECIMAL(15,2),
  processing_time VARCHAR(100),
  fees_percentage DECIMAL(5,2) DEFAULT 0,
  fees_fixed DECIMAL(15,2) DEFAULT 0,
  auto_approval BOOLEAN DEFAULT false,
  requires_kyc BOOLEAN DEFAULT false,
  config JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Admin Endpoints (Admin Only)
- `POST /api/admin/payment-gateways` - Create payment gateway
- `GET /api/admin/payment-gateways` - List all gateways
- `GET /api/admin/payment-gateways/{id}` - Get gateway details
- `PUT /api/admin/payment-gateways/{id}` - Update gateway
- `DELETE /api/admin/payment-gateways/{id}` - Delete gateway
- `POST /api/admin/payment-gateways/{id}/test` - Test connection
- `GET /api/admin/payment-gateways/{id}/stats` - Get statistics

### User Endpoints (Authenticated Users)
- `GET /api/payment/gateways` - Get available gateways
- `POST /api/payment/create` - Create payment
- `GET /api/payment/status/{transaction_id}` - Check payment status

## Quick Setup

### 1. Install Dependencies
```bash
npm install stripe @paypal/checkout-server-sdk razorpay coinbase-commerce-node
```

### 2. Create Payment Gateway (via Admin API)
```bash
curl -X POST http://localhost:3000/api/admin/payment-gateways \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Stripe",
    "code": "stripe",
    "type": "both",
    "api_endpoint": "https://api.stripe.com/v1",
    "api_key": "pk_test_YOUR_STRIPE_KEY",
    "api_secret": "sk_test_YOUR_STRIPE_SECRET",
    "supported_currencies": ["USD", "EUR"],
    "min_amount": 1.00,
    "max_amount": 10000.00,
    "fees_percentage": 2.9,
    "fees_fixed": 0.30
  }'
```

### 3. Test Connection
```bash
curl -X POST http://localhost:3000/api/admin/payment-gateways/1/test \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 4. Create Payment (User)
```bash
curl -X POST http://localhost:3000/api/payment/create \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "gateway_id": 1,
    "amount": 100.00,
    "currency": "USD",
    "type": "deposit"
  }'
```

## Supported Gateways

### Stripe
- Code: `stripe`
- Currencies: Multiple
- Features: Cards, digital wallets

### PayPal
- Code: `paypal`
- Currencies: Multiple
- Features: PayPal accounts, cards

### Razorpay
- Code: `razorpay`
- Currencies: INR, USD
- Features: UPI, cards, net banking

### Crypto (Coinbase)
- Code: `crypto`
- Currencies: BTC, ETH, LTC, etc.
- Features: Cryptocurrency payments

## Configuration Examples

### Stripe
```json
{
  "name": "Stripe",
  "code": "stripe",
  "type": "both",
  "api_key": "pk_test_...",
  "api_secret": "sk_test_...",
  "supported_currencies": ["USD", "EUR"],
  "config": {"sandbox_mode": true}
}
```

### PayPal
```json
{
  "name": "PayPal",
  "code": "paypal",
  "type": "both",
  "api_key": "client_id",
  "api_secret": "client_secret",
  "supported_currencies": ["USD", "EUR"],
  "config": {"sandbox_mode": true}
}
```

## Security Notes
- API keys are stored in database (consider encryption)
- All endpoints require authentication
- Admin endpoints require admin role
- Webhooks should be verified with signatures
- Implement rate limiting for production

## Next Steps
1. Set up webhook endpoints for payment notifications
2. Implement transaction storage in database
3. Add payment status tracking
4. Set up monitoring and logging
5. Configure production API keys 