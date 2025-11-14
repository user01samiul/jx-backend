# Notification System Documentation

## Overview

The notification system provides a comprehensive solution for managing user notifications in the JackpotX platform. It supports various types of notifications, categories, and provides both user-facing and admin APIs.

## Database Schema

### Notifications Table

```sql
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    is_read BOOLEAN NOT NULL DEFAULT false,
    is_important BOOLEAN NOT NULL DEFAULT false,
    action_url VARCHAR(500),
    action_text VARCHAR(100),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    metadata JSONB,
    
    CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT notifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT notifications_type_check CHECK (type IN ('info', 'success', 'warning', 'error', 'promotion')),
    CONSTRAINT notifications_category_check CHECK (category IN ('general', 'game', 'payment', 'promotion', 'system', 'security', 'bonus'))
);
```

## Notification Types

- **info**: General information notifications
- **success**: Success/confirmation notifications
- **warning**: Warning notifications
- **error**: Error notifications
- **promotion**: Promotional notifications

## Notification Categories

- **general**: General notifications
- **game**: Game-related notifications
- **payment**: Payment-related notifications
- **promotion**: Promotional notifications
- **system**: System notifications
- **security**: Security-related notifications
- **bonus**: Bonus-related notifications

## API Endpoints

### User Endpoints (Authenticated)

#### Get User Notifications
```
GET /api/notifications
```

**Query Parameters:**
- `type`: Filter by notification type
- `category`: Filter by notification category
- `is_read`: Filter by read status (boolean)
- `is_important`: Filter by importance (boolean)
- `limit`: Number of notifications to return (1-100, default: 20)
- `offset`: Number of notifications to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": 1,
        "user_id": 123,
        "title": "Welcome to JackpotX!",
        "message": "Thank you for joining our platform.",
        "type": "success",
        "category": "general",
        "is_read": false,
        "is_important": false,
        "action_url": null,
        "action_text": null,
        "expires_at": null,
        "created_at": "2024-12-19T10:00:00Z",
        "updated_at": "2024-12-19T10:00:00Z",
        "created_by": 1,
        "metadata": null
      }
    ],
    "pagination": {
      "total": 25,
      "limit": 20,
      "offset": 0,
      "has_more": true
    }
  }
}
```

#### Get Unread Count
```
GET /api/notifications/unread-count
```

**Response:**
```json
{
  "success": true,
  "data": {
    "unread_count": 5
  }
}
```

#### Get Notification Statistics
```
GET /api/notifications/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 25,
    "unread": 5,
    "important": 2,
    "by_type": {
      "info": 10,
      "success": 5,
      "warning": 3,
      "error": 1,
      "promotion": 6
    },
    "by_category": {
      "general": 8,
      "game": 5,
      "payment": 3,
      "promotion": 6,
      "system": 2,
      "security": 1
    }
  }
}
```

#### Get Notification by ID
```
GET /api/notifications/{id}
```

#### Mark Notification as Read
```
POST /api/notifications/{id}/read
```

#### Mark Multiple Notifications as Read
```
POST /api/notifications/mark-read
```

**Request Body:**
```json
{
  "notification_ids": [1, 2, 3],
  "mark_all": false
}
```

#### Delete Notification
```
DELETE /api/notifications/{id}
```

#### Delete All Read Notifications
```
DELETE /api/notifications/delete-read
```

### Admin Endpoints (Admin Only)

#### Create Notification
```
POST /api/notifications/admin
```

**Request Body:**
```json
{
  "user_id": 123,
  "title": "New Game Available",
  "message": "Check out our latest slot game!",
  "type": "info",
  "category": "game",
  "is_important": false,
  "action_url": "/games/new-game",
  "action_text": "Play Now",
  "expires_at": "2024-12-31T23:59:59Z",
  "metadata": {
    "game_id": 456
  }
}
```

#### Bulk Create Notifications
```
POST /api/notifications/admin/bulk
```

**Request Body:**
```json
{
  "user_ids": [123, 124, 125],
  "title": "System Maintenance",
  "message": "Scheduled maintenance on Sunday",
  "type": "warning",
  "category": "system",
  "is_important": true
}
```

#### Update Notification
```
PUT /api/notifications/admin/{id}
```

#### Create System Notification (Helper)
```
POST /api/notifications/admin/system
```

**Request Body:**
```json
{
  "user_id": 123,
  "title": "Security Alert",
  "message": "New login detected",
  "type": "warning",
  "is_important": true
}
```

#### Create Game Notification (Helper)
```
POST /api/notifications/admin/game
```

**Request Body:**
```json
{
  "user_id": 123,
  "title": "New Game Available",
  "message": "Try our latest slot game!",
  "game_id": 456,
  "action_url": "/games/new-game"
}
```

#### Create Promotion Notification (Helper)
```
POST /api/notifications/admin/promotion
```

**Request Body:**
```json
{
  "user_id": 123,
  "title": "Special Bonus",
  "message": "100% deposit bonus available!",
  "promotion_id": 789,
  "action_url": "/promotions/bonus"
}
```

## Usage Examples

### Creating Notifications Programmatically

```typescript
import { NotificationService } from '../services/notification/notification.service';

// Create a system notification
await NotificationService.createSystemNotification(
  userId,
  "Welcome to JackpotX!",
  "Thank you for joining our platform.",
  "success",
  false
);

// Create a game notification
await NotificationService.createGameNotification(
  userId,
  "New Game Available",
  "Check out our latest slot game!",
  gameId,
  "/games/new-game"
);

// Create a promotion notification
await NotificationService.createPromotionNotification(
  userId,
  "Special Bonus",
  "100% deposit bonus available!",
  promotionId,
  "/promotions/bonus"
);
```

### Frontend Integration

```javascript
// Get user notifications
const response = await fetch('/api/notifications?limit=10&offset=0', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { data } = await response.json();

// Mark notification as read
await fetch(`/api/notifications/${notificationId}/read`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Get unread count for badge
const unreadResponse = await fetch('/api/notifications/unread-count', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { data: { unread_count } } = await unreadResponse.json();
```

## Features

### 1. **Pagination Support**
- Efficient pagination with limit and offset
- Returns total count and has_more flag

### 2. **Filtering**
- Filter by type, category, read status, and importance
- Combined filters for precise queries

### 3. **Expiration**
- Optional expiration dates for time-sensitive notifications
- Automatic filtering of expired notifications

### 4. **Action Support**
- Optional action URLs and text for interactive notifications
- Support for deep linking to specific pages

### 5. **Metadata**
- JSONB field for storing additional data
- Flexible structure for notification-specific information

### 6. **Bulk Operations**
- Bulk create notifications for multiple users
- Efficient batch processing

### 7. **Statistics**
- Comprehensive notification statistics
- Breakdown by type and category

### 8. **Helper Methods**
- Pre-built methods for common notification types
- Simplified creation of system, game, and promotion notifications

## Security Features

1. **User Isolation**: Users can only access their own notifications
2. **Admin Authorization**: Admin endpoints require proper authorization
3. **Input Validation**: Comprehensive validation using Zod schemas
4. **SQL Injection Protection**: Parameterized queries throughout

## Performance Considerations

1. **Indexed Queries**: Optimized database indexes for common queries
2. **Pagination**: Efficient pagination to handle large datasets
3. **Bulk Operations**: Efficient bulk insert for multiple notifications
4. **Expiration Filtering**: Automatic filtering of expired notifications

## Migration

The notification system includes a complete database migration:

```sql
-- Run the migration
\i migration-add-notifications-table.sql
```

This creates:
- The notifications table with all necessary columns
- Appropriate indexes for performance
- Check constraints for data integrity
- Foreign key relationships
- Sample data for testing

## Testing

The system includes sample notifications for testing:

```sql
-- Sample notifications are automatically inserted
INSERT INTO notifications (user_id, title, message, type, category, is_important, created_by) VALUES
(1, 'Welcome to JackpotX!', 'Thank you for joining our platform. Enjoy your gaming experience!', 'success', 'general', false, 1),
(1, 'New Game Available', 'Check out our latest slot game "Mega Fortune" with amazing jackpots!', 'info', 'game', false, 1),
(1, 'Security Alert', 'We detected a login from a new device. If this was not you, please change your password.', 'warning', 'security', true, 1),
(1, 'Bonus Available', 'You have a 100% deposit bonus waiting! Click here to claim it.', 'promotion', 'bonus', false, 1);
```

## Error Handling

The system provides comprehensive error handling:

- **404**: Notification not found
- **400**: Invalid input parameters
- **401**: Unauthorized access
- **403**: Insufficient permissions
- **500**: Internal server error

All errors return consistent JSON responses with appropriate HTTP status codes. 