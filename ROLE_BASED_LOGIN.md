# Role-Based Login Functionality

## Overview

The JackpotX platform now supports role-based login functionality. Users can login with different roles based on their permissions and requirements.

## How It Works

### 1. Login with Specific Role

To login with a specific role, include the `role_id` in the login request:

```json
POST /api/auth/login
{
  "username": "player1",
  "password": "password123",
  "role_id": 2
}
```

### 2. Login with Default Role (Player)

To login with the default Player role, simply omit the `role_id`:

```json
POST /api/auth/login
{
  "username": "player1",
  "password": "password123"
}
```

### 3. Get Available Roles for User

To see what roles a user can login with:

```bash
GET /api/auth/user-roles?username=player1
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Player",
      "description": "Regular player account"
    },
    {
      "id": 2,
      "name": "Admin",
      "description": "Administrator account"
    }
  ]
}
```

## API Endpoints

### POST /api/auth/login

**Request Body:**
- `username` (required): User's username
- `password` (required): User's password
- `role_id` (optional): Specific role ID to login with

**Response:**
```json
{
  "success": true,
  "message": "Login Successfully",
  "token": {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "eyJhbGciOi...",
    "role": {
      "id": 1,
      "username": "player1",
      "name": "Player",
      "description": "Regular player account"
    }
  }
}
```

### GET /api/auth/user-roles

**Query Parameters:**
- `username` (required): Username to get roles for

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Player",
      "description": "Regular player account"
    }
  ]
}
```

## Implementation Details

### Database Queries

1. **Role-specific login**: Uses INNER JOIN to ensure user has the specified role
2. **Default login**: Uses INNER JOIN with role name filter for "Player" role
3. **Get user roles**: Returns all roles assigned to the user

### Security Features

- Password verification remains the same
- JWT tokens include role information
- Authorization middleware can use role information for access control
- Invalid role_id will result in authentication failure

## Frontend Integration

### Step 1: Get Available Roles
```javascript
// Get available roles for user
const response = await fetch('/api/auth/user-roles?username=player1');
const { data: roles } = await response.json();

// Show role selection dropdown
roles.forEach(role => {
  console.log(`Role: ${role.name} (ID: ${role.id})`);
});
```

### Step 2: Login with Selected Role
```javascript
// Login with specific role
const loginData = {
  username: 'player1',
  password: 'password123',
  role_id: selectedRoleId // Optional
};

const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(loginData)
});

const { token } = await response.json();
// Store tokens and role information
```

## Error Handling

- **Invalid credentials**: Returns 401 for wrong username/password
- **Invalid role**: Returns 401 if user doesn't have the specified role
- **Missing username**: Returns 400 for user-roles endpoint
- **User not found**: Returns 401 for user-roles endpoint

## Use Cases

1. **Multi-role users**: Users with multiple roles can switch between them
2. **Admin access**: Administrators can login with admin privileges
3. **Support access**: Support staff can login with support role
4. **Default behavior**: Regular users login with Player role by default 