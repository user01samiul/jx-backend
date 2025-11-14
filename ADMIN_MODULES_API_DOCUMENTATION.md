# 🎯 Admin Modules API Documentation

## Overview

The Admin Modules API provides a complete role-based access control system for the admin panel. It allows administrators to manage navigation modules, assign roles, and control access to different sections of the admin interface.

## 🏗️ System Architecture

### Database Schema
- **Table**: `admin_modules`
- **Key Features**:
  - Hierarchical structure with `parent_id`
  - Role-based access with `role_id` array
  - Flexible module configuration

### API Endpoints
All endpoints require JWT authentication and are prefixed with `/api/admin-modules`

## 🔐 Authentication

All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## 📋 Available Endpoints

### 1. Get User's Modules
**GET** `/api/admin-modules/my-modules`

Retrieves modules accessible to the current authenticated user based on their roles.

**Response:**
```json
{
  "status": "success",
  "message": "Modules retrieved successfully",
  "data": [
    {
      "id": 1,
      "title": "Dashboard",
      "path": "/dashboard",
      "icon": "dashboard-icon",
      "parent_id": null,
      "divider": "0",
      "role_id": [1, 3, 5],
      "children": [...]
    }
  ]
}
```

### 2. Get Available Roles
**GET** `/api/admin-modules/roles` *(Admin only)*

Retrieves all available roles that can be assigned to modules.

**Response:**
```json
{
  "status": "success",
  "message": "Roles retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "Admin",
      "description": "Administrator role with full access"
    },
    {
      "id": 2,
      "name": "Player",
      "description": "Player role with limited access"
    }
  ]
}
```

### 3. Get Modules by Role
**GET** `/api/admin-modules/by-role/{roleId}` *(Admin only)*

Retrieves all modules accessible by a specific role.

**Parameters:**
- `roleId` (integer, required): ID of the role

**Response:**
```json
{
  "status": "success",
  "message": "Modules retrieved successfully",
  "data": [
    {
      "id": 1,
      "title": "Dashboard",
      "path": "/dashboard",
      "role_id": [1, 3, 5],
      "children": [...]
    }
  ]
}
```

### 4. Get All Modules
**GET** `/api/admin-modules/all` *(Admin only)*

Retrieves all modules in the system.

**Response:**
```json
{
  "status": "success",
  "message": "All modules retrieved successfully",
  "data": [
    {
      "id": 1,
      "title": "Dashboard",
      "path": "/dashboard",
      "role_id": [1, 3, 5],
      "children": [...]
    }
  ]
}
```

### 5. Create Module
**POST** `/api/admin-modules` *(Admin only)*

Creates a new admin module.

**Request Body:**
```json
{
  "title": "New Analytics Module",
  "path": "/dashboard/analytics/new",
  "icon": "analytics-icon",
  "parent_id": 2,
  "divider": "0",
  "role_id": [1, 3, 5]
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Module created successfully",
  "data": {
    "id": 70,
    "title": "New Analytics Module",
    "path": "/dashboard/analytics/new",
    "icon": "analytics-icon",
    "parent_id": 2,
    "divider": "0",
    "role_id": [1, 3, 5]
  }
}
```

### 6. Update Module
**PUT** `/api/admin-modules/{id}` *(Admin only)*

Updates an existing admin module.

**Parameters:**
- `id` (integer, required): ID of the module to update

**Request Body:**
```json
{
  "title": "Updated Dashboard",
  "path": "/dashboard/updated",
  "icon": "updated-dashboard-icon",
  "role_id": [1, 2, 3, 4]
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Module updated successfully",
  "data": {
    "id": 1,
    "title": "Updated Dashboard",
    "path": "/dashboard/updated",
    "icon": "updated-dashboard-icon",
    "role_id": [1, 2, 3, 4]
  }
}
```

### 7. Delete Module
**DELETE** `/api/admin-modules/{id}` *(Admin only)*

Deletes an admin module and all its child modules.

**Parameters:**
- `id` (integer, required): ID of the module to delete

**Response:**
```json
{
  "status": "success",
  "message": "Module and its children deleted successfully",
  "data": {
    "deletedCount": 3
  }
}
```

## 🎨 Frontend Integration

### Example: React Component
```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminModules = () => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const response = await axios.get('/api/admin-modules/my-modules', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setModules(response.data.data);
      } catch (error) {
        console.error('Failed to fetch modules:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, []);

  const renderModule = (module) => (
    <div key={module.id} className="module-item">
      <h3>{module.title}</h3>
      <p>Path: {module.path}</p>
      {module.children && module.children.length > 0 && (
        <div className="children">
          {module.children.map(renderModule)}
        </div>
      )}
    </div>
  );

  if (loading) return <div>Loading modules...</div>;

  return (
    <div className="admin-modules">
      {modules.map(renderModule)}
    </div>
  );
};

export default AdminModules;
```

### Example: Navigation Menu
```javascript
const buildNavigationMenu = (modules) => {
  return modules.map(module => ({
    id: module.id,
    title: module.title,
    path: module.path,
    icon: module.icon,
    children: module.children ? buildNavigationMenu(module.children) : []
  }));
};
```

## 🔧 Testing

### Using Swagger Documentation
1. Access the Swagger UI: `http://localhost:3000/docs`
2. Authenticate with your admin credentials
3. Test all endpoints interactively

### Using Test Scripts
```bash
# Test authentication protection
node test_admin_modules_with_auth.js

# Test complete API (requires valid token)
node test_admin_modules_complete.js
```

## 🚨 Error Handling

### Common Error Responses

**401 Unauthorized:**
```json
{
  "status": "error",
  "message": "Missing or invalid token"
}
```

**403 Forbidden:**
```json
{
  "status": "error",
  "message": "Insufficient permissions"
}
```

**404 Not Found:**
```json
{
  "status": "error",
  "message": "Module not found"
}
```

**409 Conflict:**
```json
{
  "status": "error",
  "message": "Module with same path already exists"
}
```

## 📊 Role Management

### Available Roles
- **1**: Admin - Full access to all modules
- **2**: Player - Limited access
- **3**: Support - Support-related modules
- **4**: Manager - Management modules
- **5**: Developer - Development tools
- **6**: Accountant - Financial modules
- **7**: Moderator - Moderation tools
- **8**: Influencer - Influencer-specific modules
- **9**: Affiliates - Affiliate management
- **10**: Affiliates Manager - Affiliate oversight

### Role Assignment Best Practices
1. **Admin (1)** should always be included for critical modules
2. Use role combinations for granular access control
3. Consider hierarchical role relationships
4. Test access with different user roles

## 🔄 Database Operations

### Adding Role Column
```sql
-- Add role_id column to admin_modules table
ALTER TABLE admin_modules ADD COLUMN role_id INTEGER[] DEFAULT '{1}';

-- Update existing modules with appropriate roles
UPDATE admin_modules SET role_id = '{1,3,5}' WHERE id IN (1,2,3);
```

### Querying Modules by Role
```sql
-- Get modules accessible by role 1 (Admin)
SELECT * FROM admin_modules WHERE 1 = ANY(role_id);

-- Get modules accessible by multiple roles
SELECT * FROM admin_modules WHERE role_id && ARRAY[1,3,5];
```

## 🎯 Best Practices

1. **Security**: Always validate user permissions on both frontend and backend
2. **Performance**: Cache module data for authenticated users
3. **UX**: Show loading states and handle errors gracefully
4. **Maintenance**: Regularly audit role assignments
5. **Testing**: Test with different user roles and permissions

## 📞 Support

For questions or issues:
1. Check the Swagger documentation first
2. Review error logs and responses
3. Test with the provided test scripts
4. Contact the development team

---

**Last Updated**: August 7, 2025
**Version**: 1.0.0 