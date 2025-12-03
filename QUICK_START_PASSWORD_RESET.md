# Quick Start: Password Reset Setup

## Implementation Status: ✅ COMPLETE

The forgot password and reset password functionality has been successfully implemented!

## What's Working

- ✅ Database table created (`password_reset_tokens`)
- ✅ API endpoints functional:
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/reset-password`
- ✅ Rate limiting configured (3 requests/hour)
- ✅ Security features implemented
- ✅ Email templates ready

## Required: Configure SMTP

To send actual password reset emails, you need to configure SMTP settings in `.env`:

### Option 1: Gmail (Recommended for Testing)

1. **Enable 2FA on Gmail:**
   - Go to Google Account → Security → 2-Step Verification

2. **Generate App Password:**
   - Go to App Passwords: https://myaccount.google.com/apppasswords
   - Select "Mail" and generate password

3. **Update `.env` file:**
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-specific-password-here
   SMTP_FROM="JackpotX <noreply@jackpotx.net>"
   FRONTEND_URL=https://jackpotx.net
   ```

4. **Restart server:**
   ```bash
   pm2 restart backend
   ```

### Option 2: SendGrid (Recommended for Production)

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM="JackpotX <noreply@jackpotx.net>"
FRONTEND_URL=https://jackpotx.net
```

## Testing the Implementation

### 1. Test with cURL (Backend only)

```bash
# Request password reset
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "existing-user@example.com"}'

# Response:
# {"success": true, "message": "If the email exists, reset instructions have been sent"}
```

### 2. Full Flow Test (With Email)

Once SMTP is configured:

1. **Request password reset:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email": "your-email@example.com"}'
   ```

2. **Check email inbox** for reset link

3. **Extract token** from email link (after `?token=`)

4. **Reset password:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{
       "token": "YOUR_TOKEN_HERE",
       "password": "newPassword123"
     }'
   ```

5. **Test login** with new password:
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "username": "youruser",
       "password": "newPassword123"
     }'
   ```

## Frontend Integration

Your frontend is already set up! Just ensure:

1. **Forgot Password Page** (`/login/forgot`):
   - Sends POST request to `/api/auth/forgot-password`
   - Shows success message after submission

2. **Reset Password Page** (`/reset-password?token=xxx`):
   - Reads token from URL query parameter
   - Sends POST request to `/api/auth/reset-password`
   - Redirects to login on success

## API Endpoints

### POST `/api/auth/forgot-password`

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If the email exists, reset instructions have been sent"
}
```

### POST `/api/auth/reset-password`

**Request:**
```json
{
  "token": "64-character-hex-token",
  "password": "newPassword123"
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

## Security Features

- ✅ Cryptographically secure tokens (256-bit entropy)
- ✅ 1-hour token expiration
- ✅ Single-use tokens
- ✅ Rate limiting (3 requests/hour/IP)
- ✅ Email enumeration protection
- ✅ All sessions invalidated after reset
- ✅ Activity logging
- ✅ Password validation (min 8 chars)

## Troubleshooting

### "SMTP connection error: Missing credentials"

**Solution:** Configure SMTP credentials in `.env` file (see above)

### "Too many password reset requests"

**Solution:** Wait 1 hour or adjust rate limit in `src/routes/auth.routes.ts`

### Emails not sending

1. Check SMTP credentials are correct
2. Check server logs: `pm2 logs backend`
3. Verify SMTP provider allows connections from your server IP
4. For Gmail, ensure you're using App-Specific Password (not regular password)

### Token invalid/expired

- Tokens expire after 1 hour
- Each token can only be used once
- Request a new reset email

## Database

Check password reset tokens in database:

```sql
-- View all reset tokens
SELECT * FROM password_reset_tokens ORDER BY created_at DESC LIMIT 10;

-- Check for specific user
SELECT * FROM password_reset_tokens WHERE email = 'user@example.com';

-- Clean up old tokens
DELETE FROM password_reset_tokens WHERE created_at < NOW() - INTERVAL '24 hours';
```

## Documentation

Full documentation available in `PASSWORD_RESET_IMPLEMENTATION.md`

## Support

- **Logs:** `pm2 logs backend`
- **Status:** `pm2 status`
- **Restart:** `pm2 restart backend`
- **API Docs:** https://backend.jackpotx.net/api-docs

---

**Status:** Production Ready ✅
**Last Updated:** 2025-12-02
