# Provider Integration Troubleshooting Guide

## Error: OP_21: Missing Required Parameters

This error occurs when the gaming provider sends a `CHANGEBALANCE` request but one or more required parameters are missing.

## Error: OP_21: Amount cannot be zero

This error occurs when the gaming provider sends a `CHANGEBALANCE` request with an amount of 0. This has been fixed to handle zero amounts as balance checks.

### Required Parameters for CHANGEBALANCE

The following parameters are required for a successful `CHANGEBALANCE` request:

- `token` - User session token (required)
- `user_id` - User identifier (required)  
- `amount` - Transaction amount (required)
- `transaction_id` - Unique transaction identifier (required)
- `game_id` - Game identifier (optional but recommended)
- `session_id` - Game session identifier (optional but recommended)

### Common Causes

1. **Invalid or Expired Token**
   - Token not generated properly during game launch
   - Token expired (default: 30 days)
   - Token not stored in database

2. **Missing User Information**
   - User not found in database
   - User balance not properly initialized
   - User currency not set

3. **Incorrect Game Launch URL**
   - Missing required parameters in launch URL
   - Incorrect callback URL configuration
   - Wrong operator ID or secret key

4. **Provider Configuration Issues**
   - Incorrect provider API endpoints
   - Wrong authentication headers
   - Hash validation failures

### Debugging Steps

#### 1. Check Environment Configuration

Run the debug script to check your configuration:

```bash
node debug-provider-config.js
```

Or use the API endpoint:

```bash
GET /api/debug/provider-config
```

#### 2. Monitor Server Logs

Enable detailed logging and monitor for CHANGEBALANCE requests:

```bash
# Monitor logs in real-time
tail -f /var/log/your-app.log | grep CHANGEBALANCE

# Check for provider callback requests
tail -f /var/log/your-app.log | grep "Provider callback received"
```

#### 3. Test Token Generation

Use the debug endpoint to test token generation:

```bash
GET /api/debug/test-token/{userId}
```

#### 4. Verify Database State

Check if tokens are properly stored:

```sql
-- Check user tokens
SELECT * FROM tokens WHERE user_id = <user_id> AND is_active = true;

-- Check user balance
SELECT u.id, u.username, ub.balance 
FROM users u 
LEFT JOIN user_balances ub ON u.id = ub.user_id 
WHERE u.id = <user_id>;
```

### Environment Variables Required

Make sure these environment variables are properly set:

```bash
# Provider Configuration
SUPPLIER_LAUNCH_HOST=https://your-provider.com/launch
SUPPLIER_OPERATOR_ID=your_operator_id
SUPPLIER_SECRET_KEY=your_secret_key
SUPPLIER_API_KEY=your_api_key

# Callback URLs
OPERATOR_HOME_URL=https://your-backend.com
```

### Game Launch URL Structure

The game launch URL should include all necessary parameters:

```
https://provider.com/launch?mode=real&game_id=GAME123&token=USER_TOKEN&user_id=123&currency=USD&language=en&operator_id=OP123&home_url=https://your-backend.com&callback_url=https://your-backend.com/api/provider-callback&balance=100.00&session_id=123_456_789
```

### Provider Callback Endpoints

Ensure these endpoints are accessible:

- `POST /api/provider-callback/authenticate`
- `POST /api/provider-callback/balance`
- `POST /api/provider-callback/changebalance`
- `POST /api/provider-callback/status`
- `POST /api/provider-callback/cancel`
- `POST /api/provider-callback/finishround`

### Testing the Integration

#### 1. Test Game Launch

1. Launch a game using the `/api/games/play` endpoint
2. Check the generated play URL contains all required parameters
3. Verify the token is stored in the database

#### 2. Test Provider Callbacks

1. Monitor logs for incoming callback requests
2. Check if all required parameters are present
3. Verify the response format matches provider expectations

#### 3. Test Balance Changes

1. Place a bet in the game
2. Monitor the CHANGEBALANCE callback
3. Verify balance is updated correctly

### Error Response Format

When parameters are missing, the system returns:

```json
{
  "status": "ERROR",
  "response_timestamp": "2024-01-15 10:30:00",
  "error_code": "OP_21",
  "error_message": "Missing required parameters: token, user_id"
}
```

### Zero Amount Handling

The system now properly handles zero amount CHANGEBALANCE requests:

- **Zero amounts** are treated as balance checks
- **Negative amounts** are processed as bets
- **Positive amounts** are processed as wins
- All zero amount transactions are logged for audit purposes

### Logging Improvements

The system now includes detailed logging for debugging:

- All provider callback requests are logged
- Parameter presence/absence is logged
- User validation results are logged
- Balance change operations are logged
- Response data is logged

### Common Fixes

1. **Token Issues**
   - Regenerate user token
   - Check token expiration
   - Verify token storage in database

2. **User Issues**
   - Ensure user exists in database
   - Initialize user balance if missing
   - Set user currency preference

3. **Configuration Issues**
   - Verify environment variables
   - Check callback URL accessibility
   - Confirm operator ID and secret key

4. **Network Issues**
   - Ensure provider can reach your callback URLs
   - Check firewall settings
   - Verify SSL certificates

### Support Information

When contacting support, provide:

1. Error ID (if available)
2. Complete error message
3. Server logs around the time of the error
4. Environment configuration (without sensitive data)
5. Steps to reproduce the issue

### Prevention

To prevent this error:

1. Always validate all required parameters before processing
2. Implement proper error handling and logging
3. Test the integration thoroughly before going live
4. Monitor logs regularly for early detection of issues
5. Keep environment configuration up to date 