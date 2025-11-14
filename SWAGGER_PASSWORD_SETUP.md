# Swagger Password Protection Setup

## Overview
The Swagger documentation is now protected with basic authentication. This ensures that only authorized users can access the API documentation.

## Environment Variable Setup

Add the following environment variable to your `.env` file:

```bash
# Swagger Documentation Password Protection
SWAGGER_PASSWORD=your_secure_password_here
```

## How It Works

1. **Development Mode**: If `NODE_ENV=development` and `SWAGGER_PASSWORD=admin123` (default), authentication is skipped for easier development.

2. **Production Mode**: Authentication is always required. Users will be prompted for credentials when accessing:
   - `/docs` - Swagger UI interface
   - `/api-docs.json` - Raw API documentation JSON

3. **Authentication Method**: Basic HTTP authentication is used. Users can enter any username, but the password must match the `SWAGGER_PASSWORD` environment variable.

## Usage

### Accessing Swagger Documentation
1. Navigate to `https://your-domain.com/docs` or `http://localhost:3000/docs`
2. Browser will prompt for username and password
3. Enter any username and the password set in `SWAGGER_PASSWORD`
4. Access granted to Swagger documentation

### Programmatic Access
For API clients that need to access `/api-docs.json`:

```bash
curl -u "any_username:your_swagger_password" https://your-domain.com/api-docs.json
```

## Security Recommendations

1. **Strong Password**: Use a strong, unique password for `SWAGGER_PASSWORD`
2. **Environment Separation**: Use different passwords for development, staging, and production
3. **HTTPS**: Always use HTTPS in production to protect credentials in transit
4. **Regular Rotation**: Consider rotating the password periodically

## Example .env Configuration

```bash
# Database Configuration
DB_PORT=5432
DB_HOST=localhost
DB_USER=your_db_user
DB_PASS=your_db_password
DB_NAME=jackpotx_db

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/jackpotx

# JWT Configuration
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_ACCESS_TOKEN_EXPIRES=15m
JWT_REFRESH_TOKEN_EXPIRES=7d

# Swagger Documentation Password Protection
SWAGGER_PASSWORD=your_secure_password_here

# Environment
NODE_ENV=development
PORT=3000
```

## Troubleshooting

### Authentication Not Working
1. Check that `SWAGGER_PASSWORD` is set in your environment
2. Verify the password matches exactly (case-sensitive)
3. Clear browser cache and try again
4. Check browser console for any errors

### Development Mode Issues
1. Ensure `NODE_ENV=development` is set
2. If you want authentication in development, change `SWAGGER_PASSWORD` from the default `admin123`

### Production Deployment
1. Set `NODE_ENV=production`
2. Set a strong `SWAGGER_PASSWORD`
3. Ensure HTTPS is configured
4. Test authentication before going live 