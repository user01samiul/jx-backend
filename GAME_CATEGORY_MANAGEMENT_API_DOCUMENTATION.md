# Game Category Management API Documentation

## Overview

The Game Category Management system provides comprehensive admin APIs for managing game categories in the casino platform. This system replaces the simple string-based category storage with a proper relational structure that supports hierarchical categories, metadata, and advanced management features.

## Features

- **CRUD Operations**: Create, Read, Update, Delete categories
- **Hierarchical Categories**: Support for parent-child category relationships
- **Bulk Operations**: Activate, deactivate, or delete multiple categories at once
- **Statistics & Analytics**: Get detailed category statistics and insights
- **Migration Tool**: Migrate existing game categories to the new structure
- **Advanced Filtering**: Search, filter, and paginate categories
- **Metadata Support**: Store additional category information as JSON

## Database Structure

### game_categories Table

```sql
CREATE TABLE game_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,           -- Unique category name (used in games table)
  display_name VARCHAR(100) NOT NULL,         -- Human-readable display name
  description TEXT,                           -- Category description
  icon_url TEXT,                              -- URL to category icon
  color VARCHAR(7),                           -- Hex color code (#RRGGBB)
  display_order INTEGER DEFAULT 0,            -- Sort order for display
  is_active BOOLEAN DEFAULT TRUE,             -- Whether category is active
  parent_category_id INTEGER REFERENCES game_categories(id) ON DELETE SET NULL,
  metadata JSONB,                             -- Additional metadata
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_by INTEGER DEFAULT 1
);
```

## API Endpoints

### 1. Create Category

**Endpoint:** `POST /api/admin/categories`

**Description:** Create a new game category

**Request Body:**
```json
{
  "name": "slots",
  "display_name": "Slot Games",
  "description": "Various slot machine games with different themes",
  "icon_url": "https://example.com/slots-icon.png",
  "color": "#FF6B6B",
  "display_order": 1,
  "is_active": true,
  "parent_category_id": null,
  "metadata": {
    "min_bet": 0.01,
    "max_bet": 1000,
    "features": ["free_spins", "bonus_rounds"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "id": 1,
    "name": "slots",
    "display_name": "Slot Games",
    "description": "Various slot machine games with different themes",
    "icon_url": "https://example.com/slots-icon.png",
    "color": "#FF6B6B",
    "display_order": 1,
    "is_active": true,
    "parent_category_id": null,
    "metadata": {
      "min_bet": 0.01,
      "max_bet": 1000,
      "features": ["free_spins", "bonus_rounds"]
    },
    "game_count": 0,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "created_by": 1,
    "updated_by": 1
  }
}
```

### 2. Get Categories

**Endpoint:** `GET /api/admin/categories`

**Description:** Get all categories with filtering and pagination

**Query Parameters:**
- `search` (optional): Search in category name or display name
- `is_active` (optional): Filter by active status
- `parent_category_id` (optional): Filter by parent category ID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Example Request:**
```
GET /api/admin/categories?search=slot&is_active=true&page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "slots",
      "display_name": "Slot Games",
      "description": "Various slot machine games",
      "icon_url": "https://example.com/slots-icon.png",
      "color": "#FF6B6B",
      "display_order": 1,
      "is_active": true,
      "parent_category_id": null,
      "metadata": null,
      "game_count": 25,
      "parent_category_name": null,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "total_pages": 1
  }
}
```

### 3. Get Category by ID

**Endpoint:** `GET /api/admin/categories/{id}`

**Description:** Get a specific category by ID

**Example Request:**
```
GET /api/admin/categories/1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "slots",
    "display_name": "Slot Games",
    "description": "Various slot machine games",
    "icon_url": "https://example.com/slots-icon.png",
    "color": "#FF6B6B",
    "display_order": 1,
    "is_active": true,
    "parent_category_id": null,
    "metadata": null,
    "game_count": 25,
    "parent_category_name": null,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

### 4. Update Category

**Endpoint:** `PUT /api/admin/categories/{id}`

**Description:** Update an existing category

**Request Body:**
```json
{
  "display_name": "Updated Slot Games",
  "description": "Updated description for slot games",
  "color": "#4ECDC4",
  "display_order": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "Category updated successfully",
  "data": {
    "id": 1,
    "name": "slots",
    "display_name": "Updated Slot Games",
    "description": "Updated description for slot games",
    "icon_url": "https://example.com/slots-icon.png",
    "color": "#4ECDC4",
    "display_order": 2,
    "is_active": true,
    "parent_category_id": null,
    "metadata": null,
    "game_count": 25,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T11:00:00Z"
  }
}
```

### 5. Delete Category

**Endpoint:** `DELETE /api/admin/categories/{id}`

**Description:** Delete a category (only if it has no games or child categories)

**Example Request:**
```
DELETE /api/admin/categories/1
```

**Response:**
```json
{
  "success": true,
  "message": "Category deleted successfully"
}
```

### 6. Bulk Operations

**Endpoint:** `POST /api/admin/categories/bulk`

**Description:** Perform bulk operations on multiple categories

**Request Body:**
```json
{
  "category_ids": [1, 2, 3],
  "operation": "activate",
  "reason": "Bulk activation for new season"
}
```

**Available Operations:**
- `activate`: Activate multiple categories
- `deactivate`: Deactivate multiple categories
- `delete`: Delete multiple categories (only if they have no games)

**Response:**
```json
{
  "success": true,
  "message": "Processed 3 categories. 3 successful, 0 failed.",
  "data": [
    {
      "category_id": 1,
      "success": true,
      "message": "Category activated successfully"
    },
    {
      "category_id": 2,
      "success": true,
      "message": "Category activated successfully"
    },
    {
      "category_id": 3,
      "success": true,
      "message": "Category activated successfully"
    }
  ]
}
```

### 7. Category Statistics

**Endpoint:** `GET /api/admin/categories/stats`

**Description:** Get comprehensive category statistics

**Query Parameters:**
- `start_date` (optional): Start date for statistics (YYYY-MM-DD)
- `end_date` (optional): End date for statistics (YYYY-MM-DD)
- `include_inactive` (optional): Include inactive categories (default: false)

**Example Request:**
```
GET /api/admin/categories/stats?start_date=2024-01-01&end_date=2024-01-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_categories": 10,
    "active_categories": 8,
    "inactive_categories": 2,
    "categories_with_games": 7,
    "categories_without_games": 3,
    "total_games_in_categories": 150,
    "top_categories_by_games": [
      {
        "category_id": 1,
        "category_name": "Slot Games",
        "game_count": 45
      },
      {
        "category_id": 2,
        "category_name": "Table Games",
        "game_count": 30
      }
    ]
  }
}
```

### 8. Category Hierarchy

**Endpoint:** `GET /api/admin/categories/hierarchy`

**Description:** Get categories organized in hierarchical structure

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "slots",
      "display_name": "Slot Games",
      "game_count": 45,
      "children": [
        {
          "id": 5,
          "name": "video-slots",
          "display_name": "Video Slots",
          "game_count": 25,
          "parent_category_id": 1
        },
        {
          "id": 6,
          "name": "classic-slots",
          "display_name": "Classic Slots",
          "game_count": 20,
          "parent_category_id": 1
        }
      ]
    }
  ]
}
```

### 9. Migrate Existing Categories

**Endpoint:** `POST /api/admin/categories/migrate`

**Description:** Migrate existing game categories from the games table to the new structure

**Response:**
```json
{
  "success": true,
  "message": "Successfully migrated 5 categories.",
  "data": {
    "migrated_count": 5,
    "errors": []
  }
}
```

### 10. Get Games in Category

**Endpoint:** `GET /api/admin/categories/{id}/games`

**Description:** Get all games in a specific category

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Example Request:**
```
GET /api/admin/categories/1/games?page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "category": {
      "id": 1,
      "name": "slots",
      "display_name": "Slot Games",
      "game_count": 45
    },
    "games": [
      {
        "id": 1,
        "name": "Starburst",
        "provider": "NetEnt",
        "category": "slots",
        "image_url": "https://example.com/starburst.jpg",
        "is_active": true
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 10,
      "total_pages": 5
    }
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Category with name 'slots' already exists"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Category not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Migration Guide

### Step 1: Run Database Migration

Execute the migration script to create the new table:

```bash
psql -d your_database -f migration-add-game-categories-table.sql
```

### Step 2: Migrate Existing Categories

Call the migration endpoint to move existing categories:

```bash
curl -X POST "https://your-api.com/api/admin/categories/migrate" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Step 3: Update Game Import Process

The game import process will automatically use the new category structure. Categories will be created if they don't exist.

## Integration with Existing Systems

### Game Import Integration

The existing game import system (`AdminGameImportService`) will work seamlessly with the new category structure. When importing games:

1. If a category exists in `game_categories`, it will be used
2. If a category doesn't exist, it will be created automatically
3. The `name` field in `game_categories` corresponds to the `category` field in the `games` table

### Frontend Integration

Update your frontend to use the new category endpoints:

- Use `/api/admin/categories` for category management
- Use `/api/admin/categories/hierarchy` for navigation menus
- Use `/api/admin/categories/stats` for dashboard analytics

## Best Practices

1. **Category Naming**: Use lowercase, hyphen-separated names (e.g., "video-slots", "live-casino")
2. **Display Names**: Use proper capitalization and spacing for user-facing names
3. **Hierarchy**: Use parent categories for better organization (e.g., "slots" as parent, "video-slots" as child)
4. **Metadata**: Store category-specific settings in the metadata field
5. **Deletion**: Only delete categories that have no games or child categories
6. **Migration**: Always run the migration tool before using the new system

## Security Considerations

- All endpoints require admin authentication
- Category names must be unique
- Cannot delete categories with games or child categories
- All operations are logged with admin user ID
- Input validation prevents SQL injection and invalid data

## Performance Considerations

- Indexes are created on frequently queried fields
- Pagination is implemented for large datasets
- Game counts are calculated efficiently using JOINs
- Statistics are computed using optimized queries 