# Admin User Management API Guide

## 🎯 **Current Status**

✅ **Player1 is now disabled** (status: Inactive)
✅ **Player2 is disabled** (status: Inactive)
✅ **Admin API for user status management is available**

## 📋 **Admin API Endpoints for User Management**

### **1. Update User Status**

**Endpoint:** `PUT /api/admin/users/:id/status`

**Description:** Enable or disable a specific user by their ID

**Headers:**
```
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "Inactive",
  "reason": "User requested account suspension"
}
```

**Status Options:**
- `"Active"` - User can log in and use the system
- `"Inactive"` - User is disabled (cannot log in)
- `"Suspended"` - User is temporarily suspended
- `"Banned"` - User is permanently banned

**Example Request:**
```bash
curl -X PUT https://backend.jackpotx.net/api/admin/users/2/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Inactive",
    "reason": "Testing disabled user functionality"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "username": "player1",
    "email": "player1@example.com",
    "status": "Inactive",
    "updated_at": "2025-08-03T11:30:00Z"
  }
}
```

### **2. Get All Users**

**Endpoint:** `GET /api/admin/users`

**Description:** Retrieve all users with filtering options

**Headers:**
```
Authorization: Bearer <admin_access_token>
X-API-Key: <admin_api_key>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search by username/email
- `role` (optional): Filter by role
- `status` (optional): Filter by status (Active, Inactive, Suspended, Banned)

**Example Request:**
```bash
curl -X GET "https://backend.jackpotx.net/api/admin/users?status=Inactive&limit=10" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "X-API-Key: YOUR_API_KEY"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 2,
        "username": "player1",
        "email": "player1@example.com",
        "status": "Inactive",
        "created_at": "2024-01-01T00:00:00Z",
        "last_login": "2024-01-15T10:30:00Z"
      },
      {
        "id": 3,
        "username": "player2",
        "email": "player2@example.com",
        "status": "Inactive",
        "created_at": "2024-01-01T00:00:00Z",
        "last_login": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 2,
      "total_pages": 1
    }
  }
}
```

### **3. Get User Details**

**Endpoint:** `GET /api/admin/users/:id`

**Description:** Get detailed information about a specific user

**Example Request:**
```bash
curl -X GET https://backend.jackpotx.net/api/admin/users/2 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "X-API-Key: YOUR_API_KEY"
```

## 🔧 **Quick Commands to Disable Users**

### **Disable Player1 (ID: 2):**
```bash
curl -X PUT https://backend.jackpotx.net/api/admin/users/2/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status": "Inactive", "reason": "Testing"}'
```

### **Disable Player2 (ID: 3):**
```bash
curl -X PUT https://backend.jackpotx.net/api/admin/users/3/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status": "Inactive", "reason": "Testing"}'
```

### **Enable a User:**
```bash
curl -X PUT https://backend.jackpotx.net/api/admin/users/2/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status": "Active", "reason": "User reactivated"}'
```

## 🎯 **Current User Status**

| User ID | Username | Status | Description |
|---------|----------|--------|-------------|
| 1 | admin | Active | System administrator |
| 2 | player1 | **Inactive** | Disabled for testing |
| 3 | player2 | **Inactive** | Disabled for testing |
| 4 | jackpotx@email.com | Active | Regular user |
| 20 | player3 | Active | Regular user |

## 📝 **Testing Disabled Users**

Once a user is disabled, they will receive the following responses:

### **BET/WIN Transactions:**
- **Response:** `OP_33: player blocked`
- **Example:** Any BET or WIN transaction from disabled users

### **CANCEL/STATUS Commands:**
- **Response:** `OP_41: Transaction not found` (processes normally)
- **Example:** CANCEL and STATUS commands work normally

### **BALANCE Requests:**
- **Response:** `OK` (returns balance)
- **Example:** Balance requests are not affected by user status

## 🔐 **Authentication**

To use these admin APIs, you need:

1. **Admin Access Token:** Obtained from admin login
2. **API Key:** Configured in the system
3. **Proper Permissions:** Admin role with user management permissions

## 🚨 **Important Notes**

- **Disabled users cannot log in** to the system
- **Disabled users cannot make BET/WIN transactions** (returns OP_33)
- **CANCEL/STATUS commands still work** for disabled users
- **Balance requests are not affected** by user status
- **Changes are logged** for audit purposes 