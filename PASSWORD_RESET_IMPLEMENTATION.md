# Password Reset Implementation Guide

## Overview

This document describes the complete implementation of the forgot password and reset password functionality for the JackpotX authentication system.

## Features Implemented

- **Forgot Password**: Users can request a password reset link via email
- **Reset Password**: Users can set a new password using a secure token
- **Email Notifications**: Automated emails for password reset requests and confirmations
- **Security Features**:
  - Cryptographically secure tokens (64 characters hex)
  - Token expiration (1 hour)
  - Single-use tokens
  - Rate limiting (3 requests per hour per IP)
  - Session invalidation after password reset
  - Email enumeration protection
  - Activity logging

## Database Schema

### Table: `password_reset_tokens`

```sql
CREATE TABLE password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP DEFAULT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT
);
```

**Indexes:**
- `idx_password_reset_tokens_token` on `token`
- `idx_password_reset_tokens_email` on `email`
- `idx_password_reset_tokens_user_id` on `user_id`
- `idx_password_reset_tokens_expires_at` on `expires_at`
- `idx_password_reset_tokens_used_at` on `used_at`

## API Endpoints

### 1. POST `/api/auth/forgot-password`

Request a password reset link.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "If the email exists, reset instructions have been sent"
}
```

**Rate Limit:** 3 requests per hour per IP

**Security Notes:**
- Always returns success, even if email doesn't exist (prevents email enumeration)
- Token expires in 1 hour
- Email contains reset link with secure token

### 2. POST `/api/auth/reset-password`

Reset password using the token from email.

**Request Body:**
```json
{
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
  "password": "newSecurePassword123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Invalid or expired reset token"
}
```

**Security Notes:**
- Validates token exists and hasn't expired
- Ensures token is single-use only
- Password must be at least 8 characters
- Invalidates all active sessions after password reset
- Sends confirmation email to user

## Email Templates

### Password Reset Email

**Subject:** "Reset Your Password - JackpotX"

**Content:**
- Personalized greeting with username
- Reset link with token
- 1-hour expiration notice
- Security warnings
- Support contact information

### Password Changed Confirmation Email

**Subject:** "Your Password Has Been Changed - JackpotX"

**Content:**
- Confirmation of successful password change
- Timestamp of change
- Security alert if change wasn't made by user
- Contact support instructions

## Configuration

### SMTP Settings (.env)

Add the following configuration to your `.env` file:

```bash
# SMTP Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM="JackpotX <noreply@jackpotx.net>"
FRONTEND_URL=https://jackpotx.net
```

### Gmail Setup (Example)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App-Specific Password:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password in `SMTP_PASS`

### Alternative SMTP Providers

**SendGrid:**
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

**Mailgun:**
```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password
```

**AWS SES:**
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-aws-smtp-username
SMTP_PASS=your-aws-smtp-password
```

## Files Modified/Created

### New Files

1. **`src/services/email/email.service.ts`**
   - Email service with nodemailer integration
   - HTML email templates
   - Password reset and confirmation email methods

2. **`migration-password-reset-tokens.sql`**
   - Database migration for password reset tokens table

### Modified Files

1. **`src/api/auth/auth.schema.ts`**
   - Added `ForgotPasswordSchema`
   - Added `ResetPasswordSchema`

2. **`src/api/auth/auth.controller.ts`**
   - Added `forgotPassword` controller
   - Added `resetPassword` controller

3. **`src/services/auth/auth.service.ts`**
   - Added `forgotPasswordService` method
   - Added `resetPasswordService` method

4. **`src/routes/auth.routes.ts`**
   - Added `/forgot-password` route with rate limiting
   - Added `/reset-password` route
   - Added Swagger documentation

5. **`package.json`**
   - Added `nodemailer` dependency
   - Added `@types/nodemailer` dev dependency

6. **`.env`**
   - Added SMTP configuration variables

## Testing

### Manual Testing

1. **Test Forgot Password:**
```bash
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

2. **Check Email Inbox:**
   - Look for email with subject "Reset Your Password - JackpotX"
   - Copy the token from the reset link

3. **Test Reset Password:**
```bash
curl -X POST http://localhost:3001/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your-token-from-email",
    "password": "newPassword123"
  }'
```

4. **Verify Login with New Password:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "newPassword123"
  }'
```

### Testing Checklist

- [ ] User can request password reset with valid email
- [ ] Reset email is sent with valid token
- [ ] Token expires after 1 hour
- [ ] Token can only be used once
- [ ] Password is successfully updated
- [ ] Old sessions are invalidated after reset
- [ ] Rate limiting works (max 3 requests per hour)
- [ ] Invalid tokens are rejected
- [ ] Expired tokens are rejected
- [ ] Used tokens are rejected
- [ ] Confirmation email is sent after successful reset
- [ ] System doesn't leak user existence (always returns success)
- [ ] Invalid email format is rejected
- [ ] Password validation works (min 8 characters)

## Security Considerations

### Token Security
- Tokens are generated using `crypto.randomBytes(32)` for cryptographic security
- Tokens are 64 characters hex (256 bits of entropy)
- Tokens are stored in database with unique constraint
- Tokens expire after 1 hour
- Tokens can only be used once (marked with `used_at` timestamp)

### Rate Limiting
- Forgot password endpoint is rate limited to 3 requests per hour per IP
- Prevents abuse and brute force attempts
- Returns 429 status code when limit is exceeded

### Email Enumeration Protection
- Always returns success message, even if email doesn't exist
- Prevents attackers from discovering valid email addresses

### Session Invalidation
- All active sessions are invalidated after password reset
- Forces user to login again with new password
- Prevents unauthorized access from stolen session tokens

### Activity Logging
- All password reset requests are logged with IP and user agent
- Successful password resets are logged in user activity
- Helps with security auditing and fraud detection

### Input Validation
- Email format validation using Zod schema
- Password length validation (minimum 8 characters)
- Token format validation

## Frontend Integration

The frontend should be ready at the following routes:

1. **Forgot Password Page:** `/login/forgot`
   - User enters email
   - Submits to `POST /api/auth/forgot-password`

2. **Reset Password Page:** `/reset-password?token=xxx`
   - User enters new password
   - Submits to `POST /api/auth/reset-password` with token from URL

### Example Frontend Code

```javascript
// Forgot Password
async function handleForgotPassword(email) {
  const response = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  const data = await response.json();
  if (data.success) {
    // Show success message
    alert(data.message);
  }
}

// Reset Password
async function handleResetPassword(token, password) {
  const response = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password })
  });

  const data = await response.json();
  if (data.success) {
    // Redirect to login
    window.location.href = '/login';
  } else {
    // Show error
    alert(data.message);
  }
}
```

## Troubleshooting

### Email Not Sending

1. **Check SMTP credentials:**
   ```bash
   # Verify .env file has correct SMTP settings
   cat .env | grep SMTP
   ```

2. **Check server logs:**
   ```bash
   pm2 logs backend
   # Look for "[EMAIL] SMTP connection error" messages
   ```

3. **Test SMTP connection:**
   - Ensure SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS are correct
   - For Gmail, ensure you're using an App-Specific Password
   - Check if your server IP is blocked by SMTP provider

### Token Issues

1. **Token expired:**
   - Tokens expire after 1 hour
   - User must request a new reset email

2. **Token already used:**
   - Each token can only be used once
   - User must request a new reset email

3. **Token not found:**
   - Token may be invalid or from a different environment
   - Check `password_reset_tokens` table in database

### Rate Limiting

If user is getting "Too many requests" error:

1. **Wait 1 hour:** Rate limit resets after 1 hour
2. **Check IP address:** Rate limiting is per IP
3. **Adjust rate limit:** Modify `forgotPasswordRateLimiter` in `auth.routes.ts`

## Maintenance

### Cleanup Old Tokens

Add a cron job to clean up expired and used tokens:

```sql
-- Delete tokens older than 24 hours
DELETE FROM password_reset_tokens
WHERE created_at < NOW() - INTERVAL '24 hours';

-- Or keep for audit trail and only delete old ones
DELETE FROM password_reset_tokens
WHERE created_at < NOW() - INTERVAL '30 days';
```

### Monitoring

Monitor the following:

1. **Email delivery rate:**
   - Check SMTP logs for failed deliveries
   - Monitor bounce rates

2. **Password reset requests:**
   - Track number of requests per day
   - Alert on unusual spikes (potential abuse)

3. **Token usage:**
   - Monitor percentage of tokens that are actually used
   - Low usage rate may indicate email delivery issues

## API Documentation

Full API documentation is available in Swagger UI at:
```
https://backend.jackpotx.net/api-docs
```

Look for the "Auth" section for password reset endpoints.

## Support

For issues or questions:
- Check logs: `pm2 logs backend`
- Review this documentation
- Contact support team

---

**Implementation Date:** 2025-12-02
**Implemented By:** Claude AI Assistant
**Version:** 1.0.0
