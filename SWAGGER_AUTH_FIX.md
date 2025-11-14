# Swagger Authentication Fix Guide

## The Problem
When accessing Swagger documentation for admin endpoints, you're experiencing:
1. **Lock icon doesn't show input for auth** - Swagger UI not displaying authentication options
2. **"Token missing" error** - Bearer token authentication not working

## Root Cause
The system has **two layers of authentication**:

### 1. Swagger UI Access (Basic Auth)
- **URL**: `https://backend.jackpotx.net/docs`
- **Authentication**: Basic HTTP Authentication
- **Username**: Any value (e.g., `admin`)
- **Password**: `qwer1234` (from .env SWAGGER_PASSWORD)

### 2. API Endpoints (Bearer Token)
- **Authentication**: JWT Bearer Token
- **Token Source**: Admin login endpoint

## Solution Steps

### Step 1: Access Swagger UI
1. Go to: `https://backend.jackpotx.net/docs`
2. Browser will prompt for Basic Authentication
3. Enter:
   - **Username**: `admin` (or any value)
   - **Password**: `qwer1234`

### Step 2: Get Admin Bearer Token
1. Use the regular login endpoint to get a Bearer token:

```bash
curl -X POST 'https://backend.jackpotx.net/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "admin",
    "password": "your_admin_password"
  }'
```

2. Extract the `access_token` from the response

### Step 3: Use Bearer Token in Swagger
1. In Swagger UI, click the **"Authorize"** button (lock icon)
2. Enter: `Bearer YOUR_ACCESS_TOKEN`
3. Click **"Authorize"**
4. Now you can test admin endpoints

## Alternative: Direct API Testing

### Get Admin Token
```bash
curl -X POST 'https://backend.jackpotx.net/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "admin",
    "password": "your_admin_password"
  }'
```

### Test Admin Endpoint
```bash
curl -X GET 'https://backend.jackpotx.net/api/admin/dashboard/stats' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

## Common Issues & Fixes

### Issue 1: "Token missing" error
**Solution**: Make sure you've:
1. ✅ Accessed Swagger UI with Basic Auth (username: admin, password: qwer1234)
2. ✅ Clicked "Authorize" button in Swagger UI
3. ✅ Entered `Bearer YOUR_TOKEN` (not just the token)
4. ✅ Clicked "Authorize" to save

### Issue 2: Lock icon not showing
**Solution**: 
1. Make sure you're accessing the correct URL: `https://backend.jackpotx.net/docs`
2. Complete Basic Auth first
3. Refresh the page if needed

### Issue 3: "Unauthorized" error
**Solution**:
1. Check if your Bearer token is valid
2. Make sure the user has Admin role
3. Token might be expired - get a new one

## Admin User Details
- **Username**: `admin`
- **Role**: Admin
- **Swagger Password**: `qwer1234`
- **Login Endpoint**: `POST /api/auth/login`

## Testing the Fix

1. **Access Swagger**: `https://backend.jackpotx.net/docs`
2. **Basic Auth**: username=`admin`, password=`qwer1234`
3. **Get Token**: Use login endpoint
4. **Authorize**: Click lock icon, enter `Bearer YOUR_TOKEN`
5. **Test**: Try any admin endpoint (e.g., `/api/admin/dashboard/stats`)

This should resolve both the lock icon issue and the "token missing" error! 🎯 