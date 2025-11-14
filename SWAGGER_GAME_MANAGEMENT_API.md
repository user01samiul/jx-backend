# Game Management API - Swagger Documentation

## Base URL
```
https://backend.jackpotx.net/api/admin
```

## Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer <your_admin_token>
```

---

## 1. Get Games with Status Filters

### Endpoint
```http
GET /api/admin/games/status
```

### Description
Retrieve games with filtering options for status management

### Query Parameters
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| category | string | No | Filter by game category | `slots` |
| provider | string | No | Filter by game provider | `NetEnt` |
| is_active | boolean | No | Filter by active status | `true` |
| search | string | No | Search in game name or provider | `book` |
| limit | integer | No | Number of results (1-100, default: 50) | `20` |
| offset | integer | No | Pagination offset (default: 0) | `0` |

### Example Request
```bash
curl -X GET "https://backend.jackpotx.net/api/admin/games/status?category=slots&provider=NetEnt&is_active=true&search=book&limit=20&offset=0" \
  -H "Authorization: Bearer <your_admin_token>"
```

### Response
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

---

## 2. Update Game Status by ID

### Endpoint
```http
PUT /api/admin/games/status/id
```

### Description
Enable or disable a specific game by its ID

### Request Body
```json
{
  "game_id": 1,
  "is_active": false,
  "reason": "Maintenance required"
}
```

### Request Body Schema
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| game_id | integer | Yes | The ID of the game to update | `1` |
| is_active | boolean | Yes | Whether the game should be active or disabled | `false` |
| reason | string | No | Reason for the status change | `"Maintenance required"` |

### Example Request
```bash
curl -X PUT "https://backend.jackpotx.net/api/admin/games/status/id" \
  -H "Authorization: Bearer <your_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "game_id": 1,
    "is_active": false,
    "reason": "Maintenance required"
  }'
```

### Response
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

---

## 3. Update Game Status by Category

### Endpoint
```http
PUT /api/admin/games/status/category
```

### Description
Enable or disable all games in a specific category

### Request Body
```json
{
  "category": "slots",
  "is_active": false,
  "reason": "Category maintenance"
}
```

### Request Body Schema
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| category | string | Yes | The category of games to update | `"slots"` |
| is_active | boolean | Yes | Whether the games should be active or disabled | `false` |
| reason | string | No | Reason for the status change | `"Category maintenance"` |

### Example Request
```bash
curl -X PUT "https://backend.jackpotx.net/api/admin/games/status/category" \
  -H "Authorization: Bearer <your_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "slots",
    "is_active": false,
    "reason": "Category maintenance"
  }'
```

### Response
```json
{
  "success": true,
  "data": {
    "updated_count": 25,
    "games": [
      {
        "id": 1,
        "name": "Book of Dead",
        "provider": "Play'n GO",
        "category": "slots",
        "is_active": false,
        "updated_at": "2024-01-15T10:30:00Z"
      }
    ]
  },
  "message": "25 games in category 'slots' disabled successfully"
}
```

---

## 4. Update Game Status by Provider

### Endpoint
```http
PUT /api/admin/games/status/provider
```

### Description
Enable or disable all games from a specific provider

### Request Body
```json
{
  "provider": "NetEnt",
  "is_active": false,
  "reason": "Provider integration issues"
}
```

### Request Body Schema
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| provider | string | Yes | The provider of games to update | `"NetEnt"` |
| is_active | boolean | Yes | Whether the games should be active or disabled | `false` |
| reason | string | No | Reason for the status change | `"Provider integration issues"` |

### Example Request
```bash
curl -X PUT "https://backend.jackpotx.net/api/admin/games/status/provider" \
  -H "Authorization: Bearer <your_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "NetEnt",
    "is_active": false,
    "reason": "Provider integration issues"
  }'
```

### Response
```json
{
  "success": true,
  "data": {
    "updated_count": 15,
    "games": [
      {
        "id": 2,
        "name": "Starburst",
        "provider": "NetEnt",
        "category": "slots",
        "is_active": false,
        "updated_at": "2024-01-15T10:30:00Z"
      }
    ]
  },
  "message": "15 games from provider 'NetEnt' disabled successfully"
}
```

---

## 5. Bulk Update Game Status

### Endpoint
```http
PUT /api/admin/games/status/bulk
```

### Description
Enable or disable multiple games by their IDs

### Request Body
```json
{
  "game_ids": [1, 2, 3, 4, 5],
  "is_active": false,
  "reason": "Bulk maintenance"
}
```

### Request Body Schema
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| game_ids | array[integer] | Yes | Array of game IDs to update | `[1, 2, 3, 4, 5]` |
| is_active | boolean | Yes | Whether the games should be active or disabled | `false` |
| reason | string | No | Reason for the status change | `"Bulk maintenance"` |

### Example Request
```bash
curl -X PUT "https://backend.jackpotx.net/api/admin/games/status/bulk" \
  -H "Authorization: Bearer <your_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "game_ids": [1, 2, 3, 4, 5],
    "is_active": false,
    "reason": "Bulk maintenance"
  }'
```

### Response
```json
{
  "success": true,
  "data": {
    "updated_count": 5,
    "games": [
      {
        "id": 1,
        "name": "Book of Dead",
        "provider": "Play'n GO",
        "category": "slots",
        "is_active": false,
        "updated_at": "2024-01-15T10:30:00Z"
      }
    ]
  },
  "message": "5 games disabled successfully"
}
```

---

## 6. Get Game Status Statistics

### Endpoint
```http
GET /api/admin/games/status/stats
```

### Description
Retrieve comprehensive statistics about game status distribution

### Example Request
```bash
curl -X GET "https://backend.jackpotx.net/api/admin/games/status/stats" \
  -H "Authorization: Bearer <your_admin_token>"
```

### Response
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
      },
      {
        "category": "table",
        "total": 30,
        "active": 25,
        "disabled": 5
      }
    ],
    "by_provider": [
      {
        "provider": "NetEnt",
        "total": 20,
        "active": 18,
        "disabled": 2
      },
      {
        "provider": "Play'n GO",
        "total": 15,
        "active": 12,
        "disabled": 3
      }
    ]
  },
  "message": "Game status statistics retrieved successfully"
}
```

---

## 7. Get Recent Status Changes

### Endpoint
```http
GET /api/admin/games/status/changes
```

### Description
Retrieve recent audit log of game status changes

### Query Parameters
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| limit | integer | No | Number of recent changes (1-100, default: 20) | `10` |

### Example Request
```bash
curl -X GET "https://backend.jackpotx.net/api/admin/games/status/changes?limit=10" \
  -H "Authorization: Bearer <your_admin_token>"
```

### Response
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
    },
    {
      "id": 2,
      "game_id": 2,
      "game_name": "Starburst",
      "provider": "NetEnt",
      "category": "slots",
      "action": "enabled",
      "reason": "Maintenance completed",
      "created_at": "2024-01-15T09:15:00Z",
      "admin_username": "admin"
    }
  ],
  "message": "Recent status changes retrieved successfully"
}
```

---

## Error Responses

### Common Error Codes

#### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid input parameters"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": "Game not found"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## Testing Examples

### Test Scripts

#### 1. Disable a Game
```bash
# Disable game with ID 1
curl -X PUT "https://backend.jackpotx.net/api/admin/games/status/id" \
  -H "Authorization: Bearer <your_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "game_id": 1,
    "is_active": false,
    "reason": "Testing disabled game functionality"
  }'
```

#### 2. Get Disabled Games
```bash
# Get all disabled games
curl -X GET "https://backend.jackpotx.net/api/admin/games/status?is_active=false" \
  -H "Authorization: Bearer <your_admin_token>"
```

#### 3. Enable Games by Category
```bash
# Enable all slot games
curl -X PUT "https://backend.jackpotx.net/api/admin/games/status/category" \
  -H "Authorization: Bearer <your_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "slots",
    "is_active": true,
    "reason": "Category re-enabled"
  }'
```

#### 4. Check Statistics
```bash
# Get current game status statistics
curl -X GET "https://backend.jackpotx.net/api/admin/games/status/stats" \
  -H "Authorization: Bearer <your_admin_token>"
```

---

## Notes

- All endpoints require admin authentication
- Game status changes are logged for audit purposes
- Bulk operations are atomic (all succeed or all fail)
- Statistics are real-time and reflect current database state
- Recent changes are ordered by creation time (newest first)

---

**API Version**: 1.0.0  
**Last Updated**: January 15, 2024  
**Documentation Status**: Complete 