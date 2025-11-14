# Admin Panel User Management API Documentation

## Overview

This document provides comprehensive request and response patterns for user status management in the admin panel. All endpoints require admin authentication via Bearer token.

**Base URL:** `http://localhost:3000/api/admin`

**Authentication Header:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## User Status Types

| Status ID | Status Name | Description |
|-----------|-------------|-------------|
| 1 | Active | Can log in and use the system |
| 2 | Inactive | Disabled or deleted user |
| 3 | Suspended | Temporarily suspended |
| 4 | Banned | Permanently banned |

---

## 1. Ban User

**Endpoint:** `POST /api/admin/users/{id}/ban`

**Description:** Permanently ban a user account

### Request

**Headers:**
```
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Body:**
```json
{
  "reason": "Multiple policy violations"
}
```

### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "id": 50,
    "username": "player50",
    "email": "player50@test.com",
    "password": "test_hash",
    "auth_secret": null,
    "qr_code": null,
    "status_id": 4,
    "created_at": "2025-08-07T04:35:26.906Z",
    "created_by": 1,
    "updated_at": "2025-08-10T09:31:20.649Z",
    "updated_by": 1,
    "is_2fa_enabled": false
  },
  "message": "User banned successfully"
}
```

**Error (400):**
```json
{
  "success": false,
  "message": "Invalid user ID"
}
```

**Error (404):**
```json
{
  "success": false,
  "message": "User not found"
}
```

---

## 2. Blacklist User

**Endpoint:** `POST /api/admin/users/{id}/blacklist`

**Description:** Blacklist a user with detailed tracking

### Request

**Headers:**
```
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Body:**
```json
{
  "reason": "Policy violation",
  "admin_note": "Multiple violations detected",
  "notify_user": true,
  "duration": "permanent"
}
```

**Body Fields:**
- `reason` (required): Reason for blacklisting
- `admin_note` (optional): Internal admin note
- `notify_user` (optional): Whether to notify the user (default: false)
- `duration` (optional): "temporary" or "permanent" (default: "permanent")

### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "id": 50,
    "username": "player50_old",
    "email": "player50@test.com",
    "password": "test_hash",
    "auth_secret": null,
    "qr_code": null,
    "status_id": 4,
    "created_at": "2025-08-07T04:35:26.906Z",
    "created_by": 1,
    "updated_at": "2025-08-10T09:31:20.649Z",
    "updated_by": 1,
    "is_2fa_enabled": false,
    "blacklisted_at": "2025-08-10T09:31:20.655Z",
    "blacklist_reason": "Policy violation",
    "admin_note": "Multiple violations detected",
    "notify_user": true,
    "duration": "permanent"
  },
  "message": "User blacklisted successfully"
}
```

**Error (400):**
```json
{
  "success": false,
  "message": "Reason is required"
}
```

---

## 3. Suspend User

**Endpoint:** `POST /api/admin/users/{id}/suspend`

**Description:** Temporarily suspend a user account

### Request

**Headers:**
```
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Body:**
```json
{
  "reason": "Policy violation detected"
}
```

### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "id": 50,
    "username": "player50",
    "email": "player50@test.com",
    "password": "test_hash",
    "auth_secret": null,
    "qr_code": null,
    "status_id": 3,
    "created_at": "2025-08-07T04:35:26.906Z",
    "created_by": 1,
    "updated_at": "2025-08-10T09:31:20.649Z",
    "updated_by": 1,
    "is_2fa_enabled": false
  },
  "message": "User suspended successfully"
}
```

---

## 4. Disable User

**Endpoint:** `POST /api/admin/users/{id}/disable`

**Description:** Disable a user account (sets status to Suspended)

### Request

**Headers:**
```
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Body:**
```json
{
  "reason": "Account disabled by admin"
}
```

### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "id": 50,
    "username": "player50",
    "email": "player50@test.com",
    "password": "test_hash",
    "auth_secret": null,
    "qr_code": null,
    "status_id": 3,
    "created_at": "2025-08-07T04:35:26.906Z",
    "created_by": 1,
    "updated_at": "2025-08-10T09:31:20.649Z",
    "updated_by": 1,
    "is_2fa_enabled": false
  },
  "message": "User disabled successfully"
}
```

---

## 5. Deactivate User

**Endpoint:** `POST /api/admin/users/{id}/deactivate`

**Description:** Deactivate a user account (sets status to Inactive)

### Request

**Headers:**
```
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Body:**
```json
{
  "reason": "Account deactivated by admin"
}
```

### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "id": 50,
    "username": "player50",
    "email": "player50@test.com",
    "password": "test_hash",
    "auth_secret": null,
    "qr_code": null,
    "status_id": 2,
    "created_at": "2025-08-07T04:35:26.906Z",
    "created_by": 1,
    "updated_at": "2025-08-10T09:31:20.649Z",
    "updated_by": 1,
    "is_2fa_enabled": false
  },
  "message": "User deactivated successfully"
}
```

---

## 6. Unblacklist User

**Endpoint:** `POST /api/admin/users/{id}/unblacklist`

**Description:** Remove user from blacklist (sets status back to Active)

### Request

**Headers:**
```
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Body:**
```json
{
  "reason": "Appeal approved",
  "admin_note": "User provided sufficient evidence",
  "notify_user": true
}
```

**Body Fields:**
- `reason` (optional): Reason for removing from blacklist
- `admin_note` (optional): Internal admin note
- `notify_user` (optional): Whether to notify the user (default: false)

### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "id": 50,
    "username": "player50_old",
    "email": "player50@test.com",
    "password": "test_hash",
    "auth_secret": null,
    "qr_code": null,
    "status_id": 1,
    "created_at": "2025-08-07T04:35:26.906Z",
    "created_by": 1,
    "updated_at": "2025-08-10T09:31:20.649Z",
    "updated_by": 1,
    "is_2fa_enabled": false,
    "unblacklisted_at": "2025-08-10T09:31:25.123Z",
    "unblacklist_reason": "Appeal approved",
    "admin_note": "User provided sufficient evidence",
    "notify_user": true
  },
  "message": "User removed from blacklist successfully"
}
```

---

## 7. Get Blacklisted Users

**Endpoint:** `GET /api/admin/users/blacklist`

**Description:** Get list of all blacklisted users

### Request

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `search` (optional): Search by username or email

**Example:**
```
GET /api/admin/users/blacklist?page=1&limit=20&search=player50
```

### Response

**Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 50,
      "username": "player50_old",
      "email": "player50@test.com",
      "created_at": "2025-08-07T04:35:26.906Z",
      "updated_at": "2025-08-10T09:31:20.649Z",
      "status_name": "Banned",
      "blacklisted_at": "2025-08-10T09:31:20.649Z",
      "blacklist_reason": "Banned by admin"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "total_pages": 1
  }
}
```

---

## 8. Bulk Status Update

**Endpoint:** `POST /api/admin/users/bulk-status`

**Description:** Update status of multiple users at once

### Request

**Headers:**
```
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Body:**
```json
{
  "user_ids": [48, 50, 51],
  "status": "Suspended",
  "reason": "Bulk suspension due to policy violation"
}
```

**Body Fields:**
- `user_ids` (required): Array of user IDs to update
- `status` (required): "Active", "Inactive", "Suspended", or "Banned"
- `reason` (optional): Reason for the status change

### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "updated_count": 3,
    "error_count": 0,
    "users": [
      {
        "id": 48,
        "username": "player48",
        "email": "player48@test.com",
        "status": "Suspended",
        "success": true
      },
      {
        "id": 50,
        "username": "player50",
        "email": "player50@test.com",
        "status": "Suspended",
        "success": true
      },
      {
        "id": 51,
        "username": "player51",
        "email": "player51@test.com",
        "status": "Suspended",
        "success": true
      }
    ]
  },
  "message": "3 users suspended successfully"
}
```

**Error (400):**
```json
{
  "success": false,
  "message": "user_ids array is required and must not be empty"
}
```

---

## 9. Get All Users

**Endpoint:** `GET /api/admin/users`

**Description:** Get list of all users with filtering options

### Request

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `search` (optional): Search by username or email
- `status` (optional): Filter by status ("Active", "Inactive", "Suspended", "Banned")

**Example:**
```
GET /api/admin/users?page=1&limit=20&search=player50&status=Banned
```

### Response

**Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 50,
      "username": "player50",
      "email": "player50@test.com",
      "status_name": "Banned",
      "total_bets": 5,
      "total_wagered": 0.95,
      "total_won": 0.84,
      "balance": 100.50,
      "registration_date": "2025-08-07T04:35:26.906Z",
      "last_login": "2025-08-10T09:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "total_pages": 1
  }
}
```

---

## Status Flow Diagram

```
Active ↔ Inactive ↔ Suspended ↔ Banned (Blacklisted)
  ↑         ↑          ↑         ↑
Enable  Deactivate  Suspend   Ban/Blacklist
  ↓         ↓          ↓         ↓
Normal   Disabled   Temporary  Permanent
```

---

## Common Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid user ID"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "User not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Frontend Integration Examples

### JavaScript/TypeScript

```javascript
// Ban user
const banUser = async (userId, reason) => {
  const response = await fetch(`/api/admin/users/${userId}/ban`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ reason })
  });
  return response.json();
};

// Blacklist user
const blacklistUser = async (userId, blacklistData) => {
  const response = await fetch(`/api/admin/users/${userId}/blacklist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(blacklistData)
  });
  return response.json();
};

// Get blacklisted users
const getBlacklistedUsers = async (filters = {}) => {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/admin/users/blacklist?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

### cURL Examples

```bash
# Ban user
curl -X POST "http://localhost:3000/api/admin/users/50/ban" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"reason": "Policy violation"}'

# Blacklist user
curl -X POST "http://localhost:3000/api/admin/users/50/blacklist" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"reason":"test","admin_note":"","notify_user":true,"duration":"permanent"}'

# Get blacklisted users
curl -X GET "http://localhost:3000/api/admin/users/blacklist" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Notes

1. **Authentication**: All endpoints require a valid admin JWT token
2. **User ID**: Must be a valid integer
3. **Reason**: Recommended for audit trails
4. **Status Changes**: Automatically update the user's `status_id` in the database
5. **Blacklist**: Sets status to "Banned" with additional tracking
6. **Bulk Operations**: Process multiple users efficiently
7. **Pagination**: All list endpoints support pagination
8. **Search**: Available on user listing endpoints

---

## Version History

- **v1.0** - Initial implementation with basic status management
- **v1.1** - Added blacklist functionality with detailed tracking
- **v1.2** - Added bulk operations for efficiency
- **v1.3** - Enhanced error handling and validation 