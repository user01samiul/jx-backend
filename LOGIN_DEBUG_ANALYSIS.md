# Login Debug Analysis for Users 33 and 34

## Issue Summary
You're getting `{"success":false,"message":"Invalid email or password."}` when trying to login with users 33 and 34 with password "secret123".

## Potential Causes

### 1. **User Doesn't Exist**
The most likely cause is that users with usernames "33" and "34" don't actually exist in the database.

**Check this with:**
```sql
SELECT id, username, email, status_id FROM users WHERE username IN ('33', '34');
```

### 2. **Password Hashing Issue**
If the users exist, their passwords might not be properly hashed with bcrypt.

**Expected password hash for "secret123":**
```
$2b$10$YQRnR/9U2NCOUFPnMT.JJ.SVi/Di4S5hzAgt0/4f3neMfmULWUKYq
```

**Check this with:**
```sql
SELECT id, username, password FROM users WHERE username IN ('33', '34');
```

### 3. **User Status Issue**
The users might be disabled/inactive.

**Check this with:**
```sql
SELECT u.id, u.username, s.name as status 
FROM users u 
LEFT JOIN statuses s ON u.status_id = s.id 
WHERE u.username IN ('33', '34');
```

### 4. **2FA Enabled**
The users might have 2FA enabled, requiring an auth_code instead of password.

**Check this with:**
```sql
SELECT id, username, is_2fa_enabled, auth_secret 
FROM users 
WHERE username IN ('33', '34');
```

### 5. **Missing User Roles**
Users might exist but have no assigned roles.

**Check this with:**
```sql
SELECT u.id, u.username, r.name as role_name
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.username IN ('33', '34');
```

## Authentication Flow Analysis

From the code in `src/services/auth/auth.service.ts`:

1. **User Lookup**: System checks if identifier is email or username
2. **2FA Check**: If `is_2fa_enabled` is true, requires `auth_code` instead of password
3. **Password Check**: If 2FA disabled, compares password with bcrypt hash
4. **Role Check**: Verifies user has assigned roles
5. **Token Generation**: Creates JWT token if all checks pass

## Debugging Steps

### Step 1: Check if users exist
```bash
# Run the SQL query to check user existence
psql -d your_database -f check-users-33-34.sql
```

### Step 2: Test login with Node.js script
```bash
# Run the debug script
node debug-user-login.js
```

### Step 3: Check server logs
Look for login attempts in the application logs to see what's happening.

## Common Solutions

### If users don't exist:
Create them with proper password hashing:
```sql
INSERT INTO users (username, email, password, status_id)
SELECT 
  '33',
  'user33@example.com',
  '$2b$10$YQRnR/9U2NCOUFPnMT.JJ.SVi/Di4S5hzAgt0/4f3neMfmULWUKYq',
  id
FROM statuses WHERE name = 'Active';

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = '33' AND r.name = 'Player';
```

### If password is wrong:
Update the password hash:
```sql
UPDATE users 
SET password = '$2b$10$YQRnR/9U2NCOUFPnMT.JJ.SVi/Di4S5hzAgt0/4f3neMfmULWUKYq'
WHERE username IN ('33', '34');
```

### If 2FA is enabled:
Either disable 2FA or provide auth_code in login request:
```sql
UPDATE users SET is_2fa_enabled = false WHERE username IN ('33', '34');
```

### If user is disabled:
Enable the user:
```sql
UPDATE users 
SET status_id = (SELECT id FROM statuses WHERE name = 'Active')
WHERE username IN ('33', '34');
```

## Next Steps

1. Run the database queries to identify the exact issue
2. Check the application logs for detailed error messages
3. Test with the debug script to see the exact response
4. Apply the appropriate fix based on the findings

## API Testing

You can also test the login API directly:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "33", "password": "secret123"}'
```

Expected successful response:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here"
}
``` 