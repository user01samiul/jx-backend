# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JackpotX Backend is a TypeScript/Node.js casino platform backend supporting multiple game providers (Innova/TimelessTech SDK), internal JxOriginals games, real-time chat via WebSocket, and comprehensive admin/CRM features. The system integrates with PostgreSQL for relational data and MongoDB for activity logging and real-time features.

## Technology Stack

- **Runtime**: Node.js with TypeScript (ES2024 target, CommonJS modules)
- **Framework**: Express 5.x with Helmet, CORS, Compression
- **Databases**:
  - PostgreSQL (primary - users, games, transactions, bets)
  - MongoDB (activity logs, chat, real-time features)
  - Redis (mentioned in dependencies but check usage)
- **Authentication**: JWT (access + refresh tokens)
- **Process Manager**: PM2 (see ecosystem.config.js)
- **Key Dependencies**: pg/pg-pool, mongoose, socket.io, axios, bcrypt, swagger-jsdoc/swagger-ui-express

## Development Commands

```bash
# Development (with auto-reload)
npm run dev

# Build TypeScript to JavaScript
npm run build

# Production (run compiled code)
npm start

# Using PM2 (recommended for production)
pm2 start ecosystem.config.js
pm2 logs backend
pm2 restart backend
```

## Project Structure

```
src/
├── index.ts               # Entry point - HTTP server, WebSocket, cron jobs
├── app.ts                 # Express app setup, middleware, route registration
├── swagger.ts             # Swagger/OpenAPI documentation setup
├── configs/               # Configuration (database, env variables)
├── db/
│   ├── postgres.ts        # PostgreSQL connection pool (500 max connections)
│   ├── mongo.ts           # MongoDB connection
│   └── migrations/        # Database migration scripts (SQL)
├── api/                   # API endpoints organized by domain
│   ├── admin/             # Admin panel endpoints
│   ├── auth/              # Authentication endpoints
│   ├── game/              # Game management endpoints
│   ├── home/              # Home dashboard
│   ├── user/              # User profile, balance, activity
│   ├── payment/           # Payment gateway integration
│   ├── promotion/         # Promotions/bonuses
│   ├── notification/      # User notifications
│   ├── metadata/          # Currencies, countries, localization
│   └── responsible-gaming/ # Compliance features
├── routes/                # Route definitions (combine controllers + middleware)
│   ├── api.ts             # Main API router (aggregates all routes)
│   ├── admin.routes.ts    # Admin panel routes
│   ├── auth.routes.ts     # Authentication routes
│   ├── provider-callback.routes.ts  # Game provider callbacks
│   ├── innova-webhooks.routes.ts    # Innova/TimelessTech webhooks
│   ├── jxoriginals.routes.ts        # Internal games
│   └── ...                # Other domain-specific routes
├── controllers/           # Request handlers
├── services/              # Business logic layer
│   ├── admin/             # Admin services
│   ├── auth/              # Authentication services
│   ├── balance/           # Balance management
│   ├── game/              # Game logic, proxy service
│   ├── provider/          # Game provider integrations
│   │   ├── provider-callback.service.ts   # Main provider callback handler
│   │   ├── innova-api.service.ts          # Innova API client
│   │   ├── innova-campaigns.service.ts    # Campaigns/free spins
│   │   └── jxoriginals-provider.service.ts # Internal games
│   ├── user/              # User management
│   ├── chat/              # WebSocket chat service
│   ├── cron/              # Background jobs (RTP auto-adjustment, enterprise features)
│   ├── health/            # Health monitoring
│   ├── withdrawal/        # Withdrawal processing
│   ├── notification/      # Notification system
│   ├── crm/               # CRM features
│   └── ...
├── middlewares/
│   ├── authenticate.ts    # JWT authentication
│   ├── authorize.ts       # Role-based authorization
│   ├── rate-limiter.middleware.ts  # Rate limiting + circuit breaker
│   ├── errorHandler.ts    # Global error handler
│   ├── ip-tracking.middleware.ts   # IP blocking + geo-restrictions
│   └── activity-logger.ts # User activity logging
├── model/                 # Data models/types
├── utils/                 # Utility functions
├── types/                 # TypeScript type definitions
└── constants/             # Application constants
```

## Architecture Patterns

### Database Architecture

**PostgreSQL** (primary database):
- Connection pool: 500 max connections (enterprise-level)
- 60s query timeout, 30s connection timeout
- Tables: users, games, transactions, bets, game_categories, affiliate_data, withdrawal_requests, etc.
- Migrations in `src/db/migrations/` and root-level `migration-*.sql` files

**MongoDB** (secondary database):
- Used for: activity logs, chat messages, real-time features
- Connection via Mongoose with URI in .env
- Database: `jackpot` (auth source: admin)

### Multi-Provider Game System

The platform supports multiple game providers through a unified callback interface:

1. **Innova/TimelessTech SDK** (primary provider)
   - Production credentials in .env (SUPPLIER_API_KEY, SUPPLIER_SECRET_KEY)
   - Callbacks: `/innova/*` routes
   - Commands: Auth, Balance, Bet, Win, Refund, Rollback
   - Service: `provider-callback.service.ts` (main handler)
   - Campaigns/Jackpots/Tournaments via Innova SDK

2. **JxOriginals** (internal games with full source code)
   - Games located in `/JxOriginalGames` directory
   - WebSocket support on port 8443
   - Configuration: `socket_config.json`, `socket_config_jxoriginals.json`
   - Service: `jxoriginals-provider.service.ts`

3. **ISoftBet XML Proxy**
   - Mimics `gpm.isoftbet.com` for ISB games
   - Route: `/generate-xml`
   - Controller: `isoftbet-proxy.controller.ts`

### Provider Callback Flow

All provider callbacks follow this pattern:
1. Request arrives at `/innova/{command}` or `/api/innova/{command}`
2. Rate limiter + circuit breaker middleware checks
3. `ProviderCallbackService` validates hash and processes command
4. Database transactions ensure balance consistency
5. Response in Innova API format (status, response_timestamp, data)

**Critical**: Balance operations use PostgreSQL transactions with row-level locking to prevent race conditions.

### Authentication & Authorization

- **JWT-based**: Access token (24h) + Refresh token (30d)
- **Middleware**: `authenticate.ts` validates JWT, `authorize.ts` checks roles
- **Roles**: Admin, Manager, Support, Player
- **2FA**: Optional two-factor authentication (status in user_profiles)
- **Rate Limiting**: Different limits for auth endpoints (see rate-limiter.middleware.ts)

### Real-time Features

**WebSocket (Socket.IO)**:
- Chat system: `ChatSocketService` initialized in `index.ts`
- JxOriginals games: Separate WebSocket server on port 8443
- Connection tracking for health monitoring

**Background Jobs (Cron)**:
- `CronManagerService`: RTP auto-adjustment
- `EnterpriseCronService`: Enterprise features (campaigns, jackpots)
- Started in `index.ts` on server boot

### Enterprise Features (Innova SDK Integration)

The platform integrates with TimelessTech Widget SDK for advanced features:

- **Campaigns**: Free spins, bonuses (CampaignsService.ts)
- **Jackpots**: Progressive jackpots (JackpotService.ts)
- **Tournaments**: Player competitions (TournamentService.ts)
- **Challenges**: Daily/weekly challenges (ChallengesService.ts)
- **Loyalty**: VIP tiers, rewards (LoyaltyService.ts)
- **Personal Jackpots**: Individual player jackpots (PersonalJackpotsService.ts)
- **Risk Management**: Fraud detection (RiskManagementService.ts)
- **Reports**: Analytics, retention (ReportsService.ts)

**Credentials**: See .env (INNOVA_OPERATOR_ID, INNOVA_SECRET_KEY, INNOVA_API_HOST)
**Backoffice**: https://backoffice.timelesstech.org/login

### Compliance & International Features

- **Metadata**: Currencies, countries, mobile prefixes (/api/metadata)
- **Multilanguage**: Translation system (/api/multilanguage)
- **Responsible Gaming**: Deposit limits, self-exclusion (/api/responsible-gaming)
- **IP Tracking**: Geo-restrictions, IP blocking (ip-tracking.middleware.ts)

### Admin Panel Architecture

Admin routes are extensive (250KB admin.routes.ts file). Key areas:

- **User Management**: CRUD, KYC, balance adjustments
- **Game Management**: Enable/disable games, RTP control, categories
- **Bet Management**: View bets, cancel bets, history
- **Transaction Management**: Deposits, withdrawals, transfers
- **CRM**: Player 360 view, support tickets, VIP management
- **Dashboard**: Real-time statistics, charts, metrics
- **Settings**: System configuration, payment gateways
- **Affiliate Management**: MLM system, commissions
- **Callback Filter**: GGR control system

### Error Handling & Monitoring

- **Global Error Handler**: `errorHandler.ts` middleware (must be last)
- **Health Monitoring**: `HealthMonitorService` tracks requests, errors, Cloudflare metrics
- **Health Endpoints**:
  - `/health` - Basic status
  - `/health/detailed` - Metrics + circuit breaker status
  - `/health/cloudflare` - Cloudflare-specific metrics
- **Rate Limiting**: Circuit breaker pattern prevents cascade failures
- **Logging**: Morgan (development: dev, production: combined to access.log)

## Configuration

**Environment Variables** (.env):
- Database: DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT
- MongoDB: MONGO_URI
- JWT: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, JWT_*_EXPIRES
- Innova/Game Provider: SUPPLIER_*, INNOVA_*, JXORIGINALS_*
- Rate Limiting: RATE_LIMIT_*
- Security: SWAGGER_PASSWORD, GAME_PROXY_IP

**Important**: Production uses real Innova credentials. Staging credentials are commented out in .env.

## Testing & Debugging

The repository contains extensive test scripts (100+ test-*.js files) for:
- Balance consistency testing
- Bet/win/cancel flows
- Provider callback testing
- Burst/load testing
- Migration testing

These are primarily one-off scripts, not part of a test suite.

**Debugging**:
- All requests logged via Morgan
- Global request logger in app.ts logs method, URL, body
- Provider callbacks have extensive debug logging
- Use `/routes` endpoint to see all registered routes

## Common Development Tasks

### Adding a New API Endpoint

1. Create controller in `src/api/{domain}/{domain}.controller.ts`
2. Define schema validation in `src/api/{domain}/{domain}.schema.ts`
3. Add route in `src/routes/{domain}.routes.ts` or update `api.ts`
4. Register route in `src/app.ts` if it's a new module
5. Add Swagger documentation (JSDoc comments in routes)
6. Test with Postman or test script

### Working with Migrations

1. Create new migration file: `migration-{description}.sql` in root or `src/db/migrations/`
2. Test migration locally on dev database
3. Run via: `psql -U postgres -d jackpotx-db -f migration-{description}.sql`
4. Or use `run-sql-migration.js` script
5. Document in migration tracking files if needed

### Modifying Provider Integration

1. Main service: `src/services/provider/provider-callback.service.ts`
2. Commands are handled in separate methods (handleAuth, handleBalance, handleBet, etc.)
3. Always maintain hash validation and response format
4. Test with provider's staging environment first
5. Balance operations MUST use transactions with locking

### Adding Background Jobs

1. Create service in `src/services/cron/`
2. Register in `CronManagerService` or `EnterpriseCronService`
3. Use `node-cron` syntax for scheduling
4. Ensure graceful shutdown handling (see index.ts)

## Important Notes

- **TypeScript**: Strict mode is OFF (noImplicitAny: false). Type safety is relaxed.
- **Balance Precision**: All balance calculations use numeric precision handling
- **Transaction Safety**: Critical balance operations use PostgreSQL row-level locks
- **CORS**: Only jackpotx.net and admin.jackpotx.net allowed
- **Proxy Configuration**: GAME_PROXY_IP masks player IPs for geo-restricted games
- **Swagger**: Protected with password (SWAGGER_PASSWORD in .env)
- **Port**: Default 3004 (production), 3000 (development), 3001 (PM2)

## Production Deployment

Current production setup:
- Server: VPS (backend.jackpotx.net)
- Process manager: PM2
- Reverse proxy: Nginx
- SSL: Configured for HTTPS
- Static files: Served for JxOriginals games and uploads (avatars, banners)
- WebSocket: Configured for wss:// (port 8443 for JxOriginals)

## Documentation Files

The repository contains extensive documentation (100+ .md files). Key references:
- `README.md` - Frontend integration guide
- `INTEGRATION_GUIDE.md` - API integration
- `INNOVA_INTEGRATION_COMPLETE.md` - Innova SDK setup
- `JXORIGINALS_INTEGRATION_SUMMARY.md` - Internal games
- `ENTERPRISE_FEATURES_SUMMARY.md` - Enterprise features overview
- `WITHDRAWAL_SYSTEM_IMPLEMENTATION.md` - Withdrawal flows
- Various `*_API_DOCUMENTATION.md` files for specific features

Refer to these files for detailed implementation guides.
