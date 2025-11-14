# Template System

## Overview
A comprehensive template management system for gaming applications with admin/user templates, premium features, and customizable configurations.

## Features
- **Template Management**: Create/admin templates with different themes
- **Feature System**: Modular features (navigation, colors, widgets, animations)
- **User Assignment**: Assign templates to users with custom configs
- **Premium Features**: Paid templates and features with pricing
- **Default Templates**: Auto-assign based on user levels

## Quick Start

### 1. Run Migration
```bash
psql -d your_database -f migration-add-template-system.sql
```

### 2. Insert Sample Data
```bash
psql -d your_database -f insert-sample-template-data.sql
```

### 3. API Usage

#### Load User Template on Login
```typescript
GET /api/template/user/template/load
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "current_template": {
      "template": { "name": "User Gaming Interface", "type": "user" },
      "features": [
        {
          "feature_name": "Game Grid Layout",
          "feature_type": "layout",
          "feature_config": { "grid_columns": 4 }
        }
      ],
      "custom_config": {}
    }
  }
}
```

#### Assign Template to User
```typescript
POST /api/template/user/template
{
  "template_id": 2,
  "custom_config": { "primary_color": "#FF0000" }
}
```

#### Get Available Templates
```typescript
GET /api/template/user/templates/available
```

## Template Types
- **admin**: Dashboard interfaces
- **user**: Gaming interfaces  
- **premium**: Paid themes

## Feature Types
- **navigation**: Menu items
- **color_scheme**: Theme colors
- **layout**: Grid/sidebar configs
- **widget**: Functional components
- **animation**: Visual effects

## Database Tables
- `templates`: Template definitions
- `template_configs`: Configuration settings
- `template_features`: Modular features
- `user_templates`: User assignments
- `user_template_features`: User feature settings
- `default_templates`: Level-based defaults 