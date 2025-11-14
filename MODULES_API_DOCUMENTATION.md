# Modules API Documentation

## Overview

The Modules API provides complete CRUD operations for managing navigation modules in the application. Modules can be organized in a hierarchical structure with parent-child relationships, supporting different menu types like sidebar, header, etc.

## Database Schema

### Modules Table Structure

```sql
CREATE TABLE modules (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  path VARCHAR(255),
  icons TEXT,
  newtab BOOLEAN DEFAULT false,
  parentId INTEGER REFERENCES modules(id) ON DELETE SET NULL,
  menuName VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Sample Data

```sql
INSERT INTO modules (id, title, subtitle, path, icons, newtab, parentId, menuName) VALUES
(1, 'Casino', 'Casino', '', '<Shuffle />', false, null, 'sidebar'),
(2, 'Top Picks', 'TopPicks', '/toppicks', '<LayoutDashboard />', false, 1, 'sidebar'),
(3, 'Slots', 'Slots', '/slots', '<Dice5 />', false, 1, 'sidebar'),
(4, 'Live Casino', 'Live-Casino', '/livecasino', '<Calendar />', false, 1, 'sidebar');
```

## API Endpoints

### 1. Get All Modules

**Endpoint:** `GET /api/admin/modules`

**Description:** Retrieve all modules with filtering and pagination support.

**Query Parameters:**
- `parentId` (optional): Filter by parent module ID
- `menuName` (optional): Filter by menu name (e.g., "sidebar", "header")
- `limit` (optional): Number of modules to return (default: 50)
- `offset` (optional): Number of modules to skip (default: 0)

**Example Request:**
```bash
curl -X GET "https://backend.jackpotx.net/api/admin/modules?parentId=1&menuName=sidebar&limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "title": "Top Picks",
      "subtitle": "TopPicks",
      "path": "/toppicks",
      "icons": "<LayoutDashboard />",
      "newtab": false,
      "parentId": 1,
      "menuName": "sidebar",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    },
    {
      "id": 3,
      "title": "Slots",
      "subtitle": "Slots",
      "path": "/slots",
      "icons": "<Dice5 />",
      "newtab": false,
      "parentId": 1,
      "menuName": "sidebar",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 3,
    "limit": 10,
    "offset": 0,
    "hasMore": false
  }
}
```

### 2. Get Module Hierarchy

**Endpoint:** `GET /api/admin/modules/hierarchy`

**Description:** Retrieve modules organized in a hierarchical structure showing parent-child relationships.

**Example Request:**
```bash
curl -X GET "https://backend.jackpotx.net/api/admin/modules/hierarchy" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Casino",
      "subtitle": "Casino",
      "path": "",
      "icons": "<Shuffle />",
      "newtab": false,
      "parentId": null,
      "menuName": "sidebar",
      "children": [
        {
          "id": 2,
          "title": "Top Picks",
          "subtitle": "TopPicks",
          "path": "/toppicks",
          "icons": "<LayoutDashboard />",
          "newtab": false,
          "parentId": 1,
          "menuName": "sidebar",
          "children": []
        },
        {
          "id": 3,
          "title": "Slots",
          "subtitle": "Slots",
          "path": "/slots",
          "icons": "<Dice5 />",
          "newtab": false,
          "parentId": 1,
          "menuName": "sidebar",
          "children": []
        }
      ]
    }
  ]
}
```

### 3. Get Module by ID

**Endpoint:** `GET /api/admin/modules/{id}`

**Description:** Retrieve a specific module by its ID.

**Example Request:**
```bash
curl -X GET "https://backend.jackpotx.net/api/admin/modules/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Casino",
    "subtitle": "Casino",
    "path": "",
    "icons": "<Shuffle />",
    "newtab": false,
    "parentId": null,
    "menuName": "sidebar",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

### 4. Create Module

**Endpoint:** `POST /api/admin/modules`

**Description:** Create a new module.

**Required Fields:**
- `title`: Module title (1-255 characters)
- `menuName`: Menu name (1-100 characters)

**Optional Fields:**
- `subtitle`: Module subtitle
- `path`: Module path/route
- `icons`: Icon component or class
- `newtab`: Whether to open in new tab (default: false)
- `parentId`: Parent module ID (for sub-modules)

**Example Request - Parent Module:**
```bash
curl -X POST "https://backend.jackpotx.net/api/admin/modules" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sports",
    "subtitle": "Sports",
    "path": "",
    "icons": "<Trophy />",
    "newtab": false,
    "menuName": "sidebar"
  }'
```

**Example Request - Child Module:**
```bash
curl -X POST "https://backend.jackpotx.net/api/admin/modules" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Football",
    "subtitle": "Football",
    "path": "/football",
    "icons": "<Football />",
    "newtab": false,
    "parentId": 1,
    "menuName": "sidebar"
  }'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Module created successfully",
  "data": {
    "id": 5,
    "title": "Sports",
    "subtitle": "Sports",
    "path": "",
    "icons": "<Trophy />",
    "newtab": false,
    "parentId": null,
    "menuName": "sidebar",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

### 5. Update Module

**Endpoint:** `PUT /api/admin/modules/{id}`

**Description:** Update an existing module.

**Example Request - Update Title:**
```bash
curl -X PUT "https://backend.jackpotx.net/api/admin/modules/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Casino"
  }'
```

**Example Request - Update Path:**
```bash
curl -X PUT "https://backend.jackpotx.net/api/admin/modules/2" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/updated-toppicks"
  }'
```

**Example Request - Move to Different Parent:**
```bash
curl -X PUT "https://backend.jackpotx.net/api/admin/modules/3" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "parentId": 2
  }'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Module updated successfully",
  "data": {
    "id": 1,
    "title": "Updated Casino",
    "subtitle": "Casino",
    "path": "",
    "icons": "<Shuffle />",
    "newtab": false,
    "parentId": null,
    "menuName": "sidebar",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:35:00Z"
  }
}
```

### 6. Delete Module

**Endpoint:** `DELETE /api/admin/modules/{id}`

**Description:** Delete a module. Cannot delete modules that have child modules.

**Example Request:**
```bash
curl -X DELETE "https://backend.jackpotx.net/api/admin/modules/4" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "message": "Module deleted successfully"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Parent module not found"
}
```

### 400 Bad Request - Cannot Delete with Children
```json
{
  "success": false,
  "message": "Cannot delete module with child modules. Please delete child modules first."
}
```

### 400 Bad Request - Circular Reference
```json
{
  "success": false,
  "message": "Module cannot be its own parent"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Module not found"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to fetch modules",
  "error": "Database connection error"
}
```

## Field Descriptions

### Module Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `id` | integer | - | Auto-generated unique identifier | 1 |
| `title` | string | Yes | Module title (1-255 chars) | "Casino" |
| `subtitle` | string | No | Module subtitle | "Casino" |
| `path` | string | No | Module path/route | "/casino" |
| `icons` | string | No | Icon component or class | "<Shuffle />" |
| `newtab` | boolean | No | Open in new tab (default: false) | false |
| `parentId` | integer | No | Parent module ID (null for root) | 1 |
| `menuName` | string | Yes | Menu name (1-100 chars) | "sidebar" |
| `created_at` | timestamp | - | Creation timestamp | "2024-01-15T10:30:00Z" |
| `updated_at` | timestamp | - | Last update timestamp | "2024-01-15T10:35:00Z" |

### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `parentId` | integer | No | Filter by parent module ID | 1 |
| `menuName` | string | No | Filter by menu name | "sidebar" |
| `limit` | integer | No | Number of modules to return (default: 50) | 10 |
| `offset` | integer | No | Number of modules to skip (default: 0) | 0 |

## Usage Examples

### Creating a Menu Structure

1. **Create Parent Module:**
```bash
curl -X POST "https://backend.jackpotx.net/api/admin/modules" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Gaming",
    "subtitle": "Gaming",
    "path": "",
    "icons": "<Gamepad />",
    "newtab": false,
    "menuName": "sidebar"
  }'
```

2. **Create Child Modules:**
```bash
# Create first child
curl -X POST "https://backend.jackpotx.net/api/admin/modules" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Casino Games",
    "subtitle": "Casino",
    "path": "/casino",
    "icons": "<Dice />",
    "newtab": false,
    "parentId": 1,
    "menuName": "sidebar"
  }'

# Create second child
curl -X POST "https://backend.jackpotx.net/api/admin/modules" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sports Betting",
    "subtitle": "Sports",
    "path": "/sports",
    "icons": "<Trophy />",
    "newtab": false,
    "parentId": 1,
    "menuName": "sidebar"
  }'
```

3. **View Hierarchy:**
```bash
curl -X GET "https://backend.jackpotx.net/api/admin/modules/hierarchy" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Filtering Modules

**Get all sidebar modules:**
```bash
curl -X GET "https://backend.jackpotx.net/api/admin/modules?menuName=sidebar" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Get child modules of a specific parent:**
```bash
curl -X GET "https://backend.jackpotx.net/api/admin/modules?parentId=1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Get root modules (no parent):**
```bash
curl -X GET "https://backend.jackpotx.net/api/admin/modules?parentId=" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Security

- All endpoints require admin authentication
- Admin role verification is performed
- Input validation using Zod schemas
- SQL injection protection through parameterized queries
- Activity logging for all CRUD operations

## Rate Limiting

- Standard API rate limiting applies
- Admin endpoints may have stricter limits

## Support

For issues or questions regarding the Modules API:
1. Check the error responses for specific error messages
2. Verify admin authentication and permissions
3. Ensure proper JSON formatting in requests
4. Check database connectivity if experiencing 500 errors 