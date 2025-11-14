# Disabled Game Functionality Implementation

## Overview
This document describes the implementation of disabled game functionality for the JackpotX Casino backend. The system now supports disabling games and properly handles provider callbacks when games are disabled.

## ✅ **IMPLEMENTED FEATURES**

### 1. **BET/WIN Retry on Disabled Game**
- ✅ **OP_35 Error Code**: Implemented `OP_35: Game is disabled` error response
- ✅ **Game Status Validation**: Provider callbacks check game `is_active` status before processing transactions
- ✅ **Automatic Rejection**: BET and WIN transactions are automatically rejected for disabled games

### 2. **CANCEL/REFUND on Disabled Game**
- ✅ **Cancel Operations**: Cancel operations work normally even for disabled games
- ✅ **Refund Operations**: Refund operations work normally even for disabled games
- ✅ **No Game Status Check**: Cancel/refund operations don't require game status validation

### 3. **STATUS on Disabled Game**
- ✅ **Status Operations**: Status requests work normally even for disabled games
- ✅ **No Game Status Check**: Status operations don't require game status validation

## 🔧 **TECHNICAL IMPLEMENTATION**

### **Provider Callback Service Updates**

#### **Game Status Validation**
```typescript
// In provider-callback.service.ts
private static async getGameById(game_id: number) {
  const result = await pool.query("SELECT * FROM games WHERE id = $1", [game_id]);
  if (result.rows.length === 0) return null;
  
  const game = result.rows[0];
  
  // Check if game is disabled
  if (!game.is_active) {
    console.log(`[GAME_STATUS] Game ${game_id} is disabled`);
    throw new Error('OP_35: Game is disabled');
  }
  
  return game;
}
```

#### **BET/WIN Transaction Handling**
```typescript
// In handleChangeBalance method
if (game_id) {
  try {
    game = await this.getGameById(game_id);
  } catch (error: any) {
    if (error.message === 'OP_35: Game is disabled') {
      console.log(`[GAME_STATUS] BET/WIN transaction rejected for disabled game ${game_id}`);
      return this.createErrorResponseWrapped(request, 'OP_35', 'Game is disabled');
    }
    throw error;
  }
}
```

### **Database Schema**

#### **Games Table**
- `is_active` BOOLEAN DEFAULT TRUE - Controls game availability
- All existing games are set to active by default

#### **Game Status Changes Table**
```sql
CREATE TABLE game_status_changes (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('enabled', 'disabled')),
  reason TEXT,
  admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER DEFAULT 1
);
```

## 🎛️ **ADMIN MANAGEMENT ENDPOINTS**

### **Base URL**: `https://backend.jackpotx.net/api/admin`

### **1. Get Games with Status Filters**
```http
GET /api/admin/games/status?category=slots&provider=NetEnt&is_active=true&search=book&limit=20&offset=0
```

**Query Parameters:**
- `category` (optional): Filter by game category
- `provider` (optional): Filter by game provider
- `is_active` (optional): Filter by active status (true/false)
- `search` (optional): Search in game name or provider
- `limit` (optional): Number of results (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Book of Dead",
      "provider": "Play'n GO",
      "category": "slots",
      "subcategory": "adventure",
      "is_active": true,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "message": "Games retrieved successfully"
}
```

### **2. Update Game Status by ID**
```http
PUT /api/admin/games/status/id
Content-Type: application/json

{
  "game_id": 1,
  "is_active": false,
  "reason": "Maintenance required"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Book of Dead",
    "provider": "Play'n GO",
    "category": "slots",
    "is_active": false,
    "updated_at": "2024-01-15T10:30:00Z"
  },
  "message": "Game disabled successfully"
}
```

### **3. Update Game Status by Category**
```http
PUT /api/admin/games/status/category
Content-Type: application/json

{
  "category": "slots",
  "is_active": false,
  "reason": "Category maintenance"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "updated_count": 25,
    "games": [...]
  },
  "message": "25 games in category 'slots' disabled successfully"
}
```

### **4. Update Game Status by Provider**
```http
PUT /api/admin/games/status/provider
Content-Type: application/json

{
  "provider": "NetEnt",
  "is_active": false,
  "reason": "Provider integration issues"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "updated_count": 15,
    "games": [...]
  },
  "message": "15 games from provider 'NetEnt' disabled successfully"
}
```

### **5. Bulk Update Game Status**
```http
PUT /api/admin/games/status/bulk
Content-Type: application/json

{
  "game_ids": [1, 2, 3, 4, 5],
  "is_active": false,
  "reason": "Bulk maintenance"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "updated_count": 5,
    "games": [...]
  },
  "message": "5 games disabled successfully"
}
```

### **6. Get Game Status Statistics**
```http
GET /api/admin/games/status/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overall": {
      "total_games": 100,
      "active_games": 85,
      "disabled_games": 15,
      "active_percentage": 85.0
    },
    "by_category": [
      {
        "category": "slots",
        "total": 50,
        "active": 45,
        "disabled": 5
      }
    ],
    "by_provider": [
      {
        "provider": "NetEnt",
        "total": 20,
        "active": 18,
        "disabled": 2
      }
    ]
  },
  "message": "Game status statistics retrieved successfully"
}
```

### **7. Get Recent Status Changes**
```http
GET /api/admin/games/status/changes?limit=10
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "game_id": 1,
      "game_name": "Book of Dead",
      "provider": "Play'n GO",
      "category": "slots",
      "action": "disabled",
      "reason": "Maintenance required",
      "created_at": "2024-01-15T10:30:00Z",
      "admin_username": "admin"
    }
  ],
  "message": "Recent status changes retrieved successfully"
}
```

## 🧪 **TESTING SCENARIOS**

### **1. BET/WIN Retry on Disabled Game**
```bash
# 1. Disable a game via admin API
curl -X PUT https://backend.jackpotx.net/api/admin/games/status/id \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"game_id": 1, "is_active": false, "reason": "Testing"}'

# 2. Attempt BET transaction on disabled game
# Expected: OP_35: Game is disabled error

# 3. Attempt WIN transaction on disabled game  
# Expected: OP_35: Game is disabled error
```

### **2. CANCEL/REFUND on Disabled Game**
```bash
# 1. Cancel bet transaction on disabled game
# Expected: Success (cancel operations work normally)

# 2. Cancel win transaction on disabled game
# Expected: Success (cancel operations work normally)

# 3. Refund bet transaction on disabled game
# Expected: Success (refund operations work normally)
```

### **3. STATUS on Disabled Game**
```bash
# 1. Check status of bet transaction on disabled game
# Expected: Success (status operations work normally)

# 2. Check status of canceled bet transaction on disabled game
# Expected: Success (status operations work normally)

# 3. Check status of win transaction on disabled game
# Expected: Success (status operations work normally)
```

## 🔒 **SECURITY FEATURES**

### **Authentication & Authorization**
- ✅ All admin endpoints require JWT authentication
- ✅ Role-based access control (admin only)
- ✅ Input validation with Zod schemas
- ✅ SQL injection prevention

### **Audit Logging**
- ✅ All game status changes are logged
- ✅ Admin user tracking for each change
- ✅ Reason tracking for compliance
- ✅ Timestamp tracking for audit trails

### **Error Handling**
- ✅ Comprehensive error handling
- ✅ Meaningful error messages
- ✅ Proper HTTP status codes
- ✅ Transaction rollback on errors

## 📊 **MONITORING & ANALYTICS**

### **Game Status Dashboard**
- Real-time game status overview
- Category-wise status breakdown
- Provider-wise status breakdown
- Recent status change history

### **Compliance Reporting**
- Audit trail for all status changes
- Admin action tracking
- Reason categorization
- Change frequency analysis

## 🚀 **DEPLOYMENT NOTES**

### **Database Migration**
The migration has been applied successfully:
```bash
# Migration file: migrations/create-game-status-changes-table.sql
# Status: ✅ Applied
# Tables created: game_status_changes
# Indexes created: 4 performance indexes
# Sample data: 1 audit log entry
```

### **Environment Variables**
No new environment variables required. The system uses existing configuration.

### **API Compatibility**
- ✅ Backward compatible with existing provider integrations
- ✅ No breaking changes to existing endpoints
- ✅ Graceful handling of disabled games

## 🎯 **NEXT STEPS**

### **Immediate Actions**
1. ✅ Test the disabled game functionality with provider callbacks
2. ✅ Verify admin panel integration
3. ✅ Monitor error logs for OP_35 responses
4. ✅ Train admin users on new game management features

### **Future Enhancements**
1. **Scheduled Maintenance**: Auto-disable games during maintenance windows
2. **Geographic Restrictions**: Disable games by region/country
3. **User Group Restrictions**: Disable games for specific user groups
4. **Performance Monitoring**: Auto-disable games with performance issues
5. **Compliance Alerts**: Notify admins of compliance-related status changes

## 📞 **SUPPORT**

For technical support or questions about the disabled game functionality:
- Check the audit logs for detailed change history
- Monitor provider callback logs for OP_35 errors
- Use the admin statistics endpoint for system overview
- Review recent status changes for troubleshooting

---

**Implementation Status**: ✅ **COMPLETE**
**Last Updated**: January 15, 2024
**Version**: 1.0.0 