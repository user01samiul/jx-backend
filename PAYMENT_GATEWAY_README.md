# Payment Gateway System Documentation

## Overview

The payment gateway system provides a dynamic, database-driven approach to integrate multiple payment gateways into your application. It allows you to easily add, configure, and manage different payment providers through API keys stored in the database.

## Features

- **Dynamic Gateway Management**: Add/remove payment gateways without code changes
- **Multiple Gateway Support**: Built-in support for Stripe, PayPal, Razorpay, and Crypto payments
- **Database Configuration**: All gateway settings stored in database
- **API Key Management**: Secure storage and management of API keys
- **Connection Testing**: Test gateway connections before going live
- **Statistics & Analytics**: Track gateway performance and usage
- **Webhook Support**: Handle payment notifications from gateways
- **Currency & Country Support**: Configure supported currencies and countries per gateway
- **Fee Management**: Set percentage and fixed fees per gateway
- **Auto-approval**: Configure automatic transaction approval
- **KYC Requirements**: Set KYC requirements per gateway

## Database Schema

### Payment Gateways Table

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

## Supported Payment Gateways

### 1. Stripe
- **Code**: `stripe`
- **Features**: Credit/debit cards, digital wallets
- **Currencies**: Multiple currencies supported
- **Webhooks**: Yes
- **Sandbox**: Yes

### 2. PayPal
- **Code**: `paypal`
- **Features**: PayPal accounts, credit cards
- **Currencies**: Multiple currencies supported
- **Webhooks**: Yes
- **Sandbox**: Yes

### 3. Razorpay
- **Code**: `razorpay`
- **Features**: UPI, cards, net banking (India)
- **Currencies**: INR, USD
- **Webhooks**: Yes
- **Sandbox**: Yes

### 4. Crypto (Coinbase Commerce)
- **Code**: `crypto`
- **Features**: Cryptocurrency payments
- **Currencies**: BTC, ETH, LTC, etc.
- **Webhooks**: Yes
- **Sandbox**: Yes

## API Endpoints

### Admin Endpoints

#### Create Payment Gateway
```http
POST /api/admin/payment-gateways
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Stripe Payments",
  "code": "stripe",
  "type": "both",
  "description": "Secure online payment processing",
  "api_endpoint": "https://api.stripe.com/v1",
  "api_key": "pk_test_...",
  "api_secret": "sk_test_...",
  "webhook_url": "https://yourdomain.com/webhooks/stripe",
  "webhook_secret": "whsec_...",
  "supported_currencies": ["USD", "EUR", "GBP"],
  "supported_countries": ["US", "CA", "UK"],
  "min_amount": 1.00,
  "max_amount": 10000.00,
  "fees_percentage": 2.9,
  "fees_fixed": 0.30,
  "auto_approval": false,
  "requires_kyc": true,
  "config": {
    "sandbox_mode": true
  }
}
```

#### Get All Payment Gateways
```http
GET /api/admin/payment-gateways?type=deposit&is_active=true&supported_currency=USD
Authorization: Bearer <admin_token>
```

#### Get Payment Gateway by ID
```http
GET /api/admin/payment-gateways/{id}
Authorization: Bearer <admin_token>
```

#### Update Payment Gateway
```http
PUT /api/admin/payment-gateways/{id}
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "is_active": false,
  "fees_percentage": 3.0
}
```

#### Delete Payment Gateway
```http
DELETE /api/admin/payment-gateways/{id}
Authorization: Bearer <admin_token>
```

#### Test Gateway Connection
```http
POST /api/admin/payment-gateways/{id}/test
Authorization: Bearer <admin_token>
```

#### Get Gateway Statistics
```http
GET /api/admin/payment-gateways/{id}/stats?start_date=2024-01-01&end_date=2024-12-31
Authorization: Bearer <admin_token>
```

### User Endpoints

#### Get Available Gateways
```http
GET /api/payment/gateways?type=deposit&currency=USD
Authorization: Bearer <user_token>
```

#### Create Payment
```http
POST /api/payment/create
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "gateway_id": 1,
  "amount": 100.00,
  "currency": "USD",
  "type": "deposit",
  "description": "Account deposit",
  "return_url": "https://yourdomain.com/payment/success",
  "cancel_url": "https://yourdomain.com/payment/cancel"
}
```

#### Check Payment Status
```http
GET /api/payment/status/{transaction_id}
Authorization: Bearer <user_token>
```

## Configuration Examples

### Stripe Configuration
```json
{
  "name": "Stripe",
  "code": "stripe",
  "type": "both",
  "api_endpoint": "https://api.stripe.com/v1",
  "api_key": "pk_test_51ABC123...",
  "api_secret": "sk_test_51ABC123...",
  "webhook_secret": "whsec_ABC123...",
  "supported_currencies": ["USD", "EUR", "GBP"],
  "min_amount": 0.50,
  "max_amount": 10000.00,
  "fees_percentage": 2.9,
  "fees_fixed": 0.30,
  "config": {
    "sandbox_mode": true
  }
}
```

### PayPal Configuration
```json
{
  "name": "PayPal",
  "code": "paypal",
  "type": "both",
  "api_endpoint": "https://api-m.paypal.com",
  "api_key": "client_id_here",
  "api_secret": "client_secret_here",
  "supported_currencies": ["USD", "EUR", "GBP"],
  "min_amount": 1.00,
  "max_amount": 5000.00,
  "fees_percentage": 3.5,
  "fees_fixed": 0.35,
  "config": {
    "sandbox_mode": true
  }
}
```

### Razorpay Configuration
```json
{
  "name": "Razorpay",
  "code": "razorpay",
  "type": "both",
  "api_endpoint": "https://api.razorpay.com/v1",
  "api_key": "rzp_test_ABC123...",
  "api_secret": "secret_key_here",
  "supported_currencies": ["INR", "USD"],
  "min_amount": 1.00,
  "max_amount": 100000.00,
  "fees_percentage": 2.0,
  "fees_fixed": 3.00,
  "config": {
    "payment_url": "https://checkout.razorpay.com/v1/checkout.html"
  }
}
```

## Integration Steps

### 1. Install Dependencies
```bash
npm install stripe @paypal/checkout-server-sdk razorpay coinbase-commerce-node
```

### 2. Set Environment Variables
```env
FRONTEND_URL=https://yourdomain.com
STRIPE_SECRET_KEY=sk_test_...
PAYPAL_CLIENT_ID=client_id_here
PAYPAL_CLIENT_SECRET=client_secret_here
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=secret_key_here
COINBASE_API_KEY=api_key_here
```

### 3. Create Payment Gateway via Admin API
Use the admin API to create payment gateways with your API keys.

### 4. Test Connection
Use the test connection endpoint to verify your gateway configuration.

### 5. Start Processing Payments
Use the user-facing API endpoints to create and manage payments.

## Webhook Handling

### Webhook Endpoints
Create webhook endpoints for each gateway:

```javascript
// Example webhook handler for Stripe
app.post('/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const { PaymentIntegrationService } = require('./services/payment/payment-integration.service');
  
  try {
    const paymentService = PaymentIntegrationService.getInstance();
    const gateway = await getPaymentGatewayByCode('stripe');
    
    const config = {
      api_key: gateway.api_key,
      api_secret: gateway.api_secret,
      webhook_secret: gateway.webhook_secret,
      // ... other config
    };
    
    const webhookData = await paymentService.processWebhook('stripe', config, req.body, sig);
    
    // Process the webhook data
    await processPaymentWebhook(webhookData);
    
    res.json({received: true});
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});
```

## Security Considerations

1. **API Key Storage**: API keys are stored encrypted in the database
2. **Webhook Verification**: All webhooks are verified using signatures
3. **Input Validation**: All inputs are validated using Zod schemas
4. **Authentication**: All endpoints require proper authentication
5. **Authorization**: Admin endpoints require admin role
6. **Rate Limiting**: Implement rate limiting for payment endpoints
7. **Logging**: Log all payment activities for audit trails

## Error Handling

The system includes comprehensive error handling:

- **Validation Errors**: Invalid input data
- **Authentication Errors**: Missing or invalid tokens
- **Authorization Errors**: Insufficient permissions
- **Gateway Errors**: Payment gateway specific errors
- **Network Errors**: Connection issues
- **Database Errors**: Database operation failures

## Monitoring & Analytics

### Available Metrics
- Total transactions per gateway
- Success/failure rates
- Average transaction amounts
- Processing times
- Revenue per gateway
- User activity patterns

### Dashboard Integration
The admin dashboard provides:
- Real-time gateway status
- Transaction monitoring
- Performance analytics
- Error tracking
- Revenue reports

## Troubleshooting

### Common Issues

1. **Connection Test Fails**
   - Verify API keys are correct
   - Check gateway is active
   - Ensure proper permissions

2. **Payment Creation Fails**
   - Validate amount limits
   - Check currency support
   - Verify gateway configuration

3. **Webhook Not Received**
   - Check webhook URL is accessible
   - Verify webhook secret
   - Check gateway webhook settings

4. **Status Check Fails**
   - Verify transaction ID format
   - Check gateway API status
   - Validate authentication

## Future Enhancements

1. **Additional Gateways**: Support for more payment providers
2. **Multi-currency**: Enhanced multi-currency support
3. **Recurring Payments**: Subscription and recurring payment support
4. **Advanced Analytics**: More detailed reporting and analytics
5. **Mobile SDK**: Native mobile payment integration
6. **Fraud Detection**: Built-in fraud detection and prevention
7. **Compliance**: Enhanced compliance and regulatory features

## Support

For technical support or questions about the payment gateway system, please refer to the API documentation or contact the development team. 