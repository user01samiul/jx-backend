# 🎰 JACKPOTX PLATFORM - DOCUMENTAȚIE COMPLETĂ PENTRU DEZVOLTATORI

**Versiune:** 3.0 FINAL  
**Data:** 14 Noiembrie 2025  
**Autor:** Oniacor Tech SRL  
**Backend URL:** https://backend.jackpotx.net  
**API Documentation:** https://backend.jackpotx.net/api-docs.json (Password: qwer1234)

---

## 📑 CUPRINS COMPLET

1. [INTRODUCERE ȘI PREZENTARE GENERALĂ](#sectiunea-1)
2. [ARHITECTURĂ BACKEND COMPLETĂ](#sectiunea-2)
3. [SETUP ȘI CONFIGURARE DEVELOPMENT](#sectiunea-3)
4. [AUTENTIFICARE ȘI SECURITATE](#sectiunea-4)
5. [INTEGRARE FRONTEND JUCĂTORI](#sectiunea-5)
6. [INTEGRARE PANOU ADMIN](#sectiunea-6)
7. [WEBSOCKET ȘI REAL-TIME](#sectiunea-7)
8. [API REFERENCE COMPLET - TOATE ENDPOINT-URILE](#sectiunea-8)
9. [GESTIONAREA ERORILOR](#sectiunea-9)
10. [BEST PRACTICES ȘI SECURITATE](#sectiunea-10)
11. [TESTING ȘI DEBUGGING](#sectiunea-11)
12. [DEPLOYMENT PRODUCTION](#sectiunea-12)

---

## SECȚIUNEA 1: INTRODUCERE ȘI PREZENTARE GENERALĂ {#sectiunea-1}

### 1.1 Despre Platforma JackpotX

JackpotX este o **platformă enterprise de cazinou online** construită pe tehnologii moderne și scalabile. Platforma oferă o experiență completă pentru operatorii de cazinou, integrând **peste 1000 de jocuri** de la provideri de top precum Evolution Gaming, Pragmatic Play, NetEnt, și mulți alții.

**🎯 Caracteristici Principale:**

✅ **150+ API Endpoints RESTful** - Complet documentate în OpenAPI 3.0  
✅ **1000+ Jocuri** - Integrare completă cu Innova Gaming API  
✅ **JWT + 2FA Authentication** - Securitate enterprise-grade  
✅ **Role-Based Access Control (RBAC)** - 5 roluri predefinite  
✅ **Real-time Communication** - WebSocket via Socket.io  
✅ **Multi-currency & Multi-language** - Suport pentru multiple valute și limbi  
✅ **Affiliate System** - Tracking complet și calcul comisioane  
✅ **KYC Verification** - Sistem automatizat de verificare identitate  
✅ **Responsible Gaming Tools** - Limite de depunere, auto-excludere  
✅ **CRM & Analytics** - Player segmentation, churn prediction  
✅ **Payment Gateway Integration** - Multiple payment processors  
✅ **Tournaments & Jackpots** - Sistem complet de competiții  
✅ **Support Ticketing** - Sistem de ticketing integrat  

### 1.2 Stack Tehnologic Complet

**🔧 Backend Stack:**

```
Runtime & Framework:
├── Node.js v20+ (Latest LTS)
├── TypeScript 5.8.3
├── Express.js 5.1.0
└── ts-node-dev 2.0.0 (development hot-reload)

Baze de Date:
├── PostgreSQL 16+
│   ├── pg 8.16.0 (client)
│   ├── Connection Pool: 500 max connections
│   ├── Query Timeout: 60s
│   └── 50+ tables (users, games, bets, transactions, etc.)
├── MongoDB 7+
│   ├── mongoose 8.16.0 (ODM)
│   └── Collections: sessions, enterprise features
└── Redis 5.9.0 (optional)
    └── Usage: caching, session storage

Autentificare & Securitate:
├── jsonwebtoken 9.0.2 (JWT with HS256)
├── bcrypt 6.0.0 (password hashing)
├── helmet 8.1.0 (HTTP security headers)
├── cors 2.8.5 (CORS policy)
├── express-rate-limit 7.5.0 (rate limiting + circuit breaker)
└── 2FA via Google Authenticator (TOTP)

API & Documentation:
├── swagger-jsdoc 6.2.8 (OpenAPI generation)
├── swagger-ui-express (interactive API explorer)
└── zod 3.25.64 (runtime schema validation)

Real-time & Communication:
├── socket.io 4.8.1 (WebSocket server)
└── redis 5.9.0 (pub/sub for scaling)

HTTP & Networking:
├── axios 1.11.0 (HTTP client)
├── puppeteer 24.29.1 (game proxy & browser automation)
└── node-cron 4.2.1 (scheduled tasks)

Game Provider Integration:
├── Innova Gaming API (1000+ games)
├── IGPX Sportsbook API
└── JxOriginals (internal games)
```

### 1.3 Numere și Statistici

**📊 Dimensiuni Proiect:**

- **217 fișiere TypeScript** în directorul src/
- **3.2 MB** cod sursă
- **40+ fișiere de route** definind endpoint-urile
- **43 servicii** de business logic
- **10 middleware-uri** pentru autentificare, validare, rate limiting
- **50+ tabele PostgreSQL**
- **9 migrații** de bază de date
- **30+ fișiere de documentație** markdown

**⚡ Performance:**

- **500 conexiuni simultane** PostgreSQL pool
- **60 secunde** query timeout
- **Rate limiting:** Configurabil per endpoint
- **Circuit breaker:** Auto-retry cu fallback
- **WebSocket:** Suport pentru 10,000+ conexiuni concurente

---

## SECȚIUNEA 2: ARHITECTURĂ BACKEND COMPLETĂ {#sectiunea-2}

### 2.1 Structura Completă de Directoare

```
/var/www/html/backend.jackpotx.net/
│
├── src/                                    # Cod sursă TypeScript
│   │
│   ├── api/                                # API Modules (14 module)
│   │   ├── auth/
│   │   │   ├── auth.controller.ts          # Login, register, refresh
│   │   │   ├── auth.schema.ts              # Zod validation schemas
│   │   │   └── auth.service.ts             # Business logic
│   │   ├── user/                           # User management
│   │   ├── game/                           # Game operations
│   │   ├── admin/                          # Admin operations
│   │   ├── payment/                        # Payment processing
│   │   ├── affiliate/                      # Affiliate system
│   │   ├── promotion/                      # Promotions & bonuses
│   │   ├── support/                        # Support tickets
│   │   ├── crm/                            # CRM features
│   │   ├── analytics/                      # Analytics & reporting
│   │   ├── tournament/                     # Tournaments
│   │   ├── jackpot/                        # Jackpots
│   │   ├── kyc/                            # KYC verification
│   │   └── responsible-gaming/             # Responsible gaming tools
│   │
│   ├── routes/                             # HTTP Route Definitions (40+ files)
│   │   ├── auth.routes.ts                  # /api/auth/*
│   │   ├── user-management.routes.ts       # /api/user/*
│   │   ├── api.ts                          # Main routes aggregator
│   │   ├── admin.routes.ts                 # /api/admin/*
│   │   ├── admin-modules.routes.ts         # /api/admin-modules/*
│   │   ├── dashboard.routes.ts             # /api/dashboard/*
│   │   ├── payment-gateway.routes.ts       # /api/payment/*
│   │   ├── withdrawal.routes.ts            # /api/withdrawals/*
│   │   ├── promotion.routes.ts             # /api/promotions/*
│   │   ├── affiliate.routes.ts             # /api/affiliate/*
│   │   ├── enhanced-affiliate.routes.ts    # /api/enhanced-affiliate/*
│   │   ├── support-ticket.routes.ts        # /api/support/tickets/*
│   │   ├── support-user.routes.ts          # /api/support/user/*
│   │   ├── chat.routes.ts                  # /api/chat/* (WebSocket)
│   │   ├── crm.routes.ts                   # /api/admin/crm/*
│   │   ├── notification.routes.ts          # /api/notifications/*
│   │   ├── provider-callback.routes.ts     # /innova/* (game callbacks)
│   │   ├── provider-callback-swagger.ts    # Swagger docs for callbacks
│   │   ├── campaigns.ts                    # /api/campaigns/*
│   │   ├── tournaments.ts                  # /api/tournaments/*
│   │   ├── jackpots.ts                     # /api/jackpots/*
│   │   ├── loyalty.routes.ts               # /api/loyalty/*
│   │   ├── mini-games.routes.ts            # /api/mini-games/*
│   │   ├── personal-jackpots.routes.ts     # /api/personal-jackpots/*
│   │   ├── challenges.routes.ts            # /api/challenges/*
│   │   ├── risk-management.routes.ts       # /api/risk-management/*
│   │   ├── reports.routes.ts               # /api/admin/reports/*
│   │   ├── enterprise-dashboard.routes.ts  # /api/enterprise/*
│   │   ├── jxoriginals.routes.ts           # /api/jxoriginals/*
│   │   ├── jxoriginals-game.routes.ts      # /JxOriginalGames/*
│   │   ├── isoftbet-proxy.routes.ts        # Game proxy
│   │   ├── innova-webhooks.routes.ts       # /api/innova/webhooks/*
│   │   ├── widget-auth.routes.ts           # Widget authentication
│   │   ├── metadata.routes.ts              # /api/metadata/*
│   │   ├── multilanguage.routes.ts         # /api/multilanguage/*
│   │   ├── responsible-gaming.routes.ts    # /api/responsible-gaming/*
│   │   ├── role.routes.ts                  # /api/roles/*
│   │   ├── settings.routes.ts              # /api/settings/*
│   │   ├── template.routes.ts              # /api/templates/*
│   │   ├── manager.routes.ts               # /api/manager/*
│   │   ├── analytics-routes-patch.ts       # Analytics patches
│   │   └── index.enterprise.ts             # Enterprise routes aggregator
│   │
│   ├── services/                           # Business Logic Services (43 services)
│   │   ├── auth.service.ts                 # Authentication logic
│   │   ├── user.service.ts                 # User CRUD operations
│   │   ├── jwt.service.ts                  # JWT token generation/validation
│   │   ├── balance.service.ts              # Balance management & transactions
│   │   ├── game.service.ts                 # Game launching & proxying
│   │   ├── games.service.ts                # Games database management
│   │   ├── innova-api.service.ts           # Innova provider integration
│   │   ├── innova-campaigns.service.ts     # Free spins campaigns
│   │   ├── provider-callback.service.ts    # Game provider callbacks
│   │   ├── jxoriginals-provider.service.ts # Internal games provider
│   │   ├── ggr-filter.service.ts           # GGR calculation
│   │   ├── payment.service.ts              # Payment processing
│   │   ├── withdrawal.service.ts           # Withdrawal handling
│   │   ├── affiliate.service.ts            # Affiliate tracking & commissions
│   │   ├── promotion.service.ts            # Bonus distribution
│   │   ├── campaign.service.ts             # Marketing campaigns
│   │   ├── analytics.service.ts            # User behavior analytics
│   │   ├── activity.service.ts             # Activity logging & audit trail
│   │   ├── reports.service.ts              # Report generation
│   │   ├── profit.service.ts               # Revenue analysis
│   │   ├── crm.service.ts                  # CRM & player segmentation
│   │   ├── chat.service.ts                 # Real-time chat (WebSocket)
│   │   ├── notification.service.ts         # Push/email/SMS notifications
│   │   ├── jackpot.service.ts              # Jackpot management
│   │   ├── tournament.service.ts           # Tournament management
│   │   ├── challenges.service.ts           # Challenge system
│   │   ├── loyalty.service.ts              # Loyalty program
│   │   ├── mini-games.service.ts           # Mini games
│   │   ├── personal-jackpots.service.ts    # Personal jackpots
│   │   ├── risk-management.service.ts      # Risk scoring & fraud detection
│   │   ├── kyc.service.ts                  # KYC verification
│   │   ├── support-ticket.service.ts       # Support tickets
│   │   ├── health.service.ts               # System health monitoring
│   │   ├── http.service.ts                 # HTTP client wrapper
│   │   ├── captcha.service.ts              # CAPTCHA generation
│   │   ├── proxy.service.ts                # HTTP proxying for games
│   │   ├── mongo.service.ts                # MongoDB operations
│   │   ├── multilanguage.service.ts        # i18n translations
│   │   ├── metadata.service.ts             # Reference data (countries, currencies)
│   │   ├── responsible-gaming.service.ts   # Responsible gaming enforcement
│   │   ├── template.service.ts             # Email/SMS templates
│   │   ├── cron-manager.service.ts         # Background job scheduling
│   │   └── enterprise-cron.service.ts      # Enterprise feature jobs
│   │
│   ├── middlewares/                        # Middleware Components (10 middleware)
│   │   ├── authenticate.ts                 # JWT token verification
│   │   ├── authorize.ts                    # Role-based access control (RBAC)
│   │   ├── admin.middleware.ts             # Admin-only access check
│   │   ├── rate-limiter.middleware.ts      # Rate limiting + circuit breaker
│   │   ├── activity-logger.ts              # User activity logging
│   │   ├── errorHandler.ts                 # Global error handler
│   │   ├── validate.ts                     # Zod schema validation
│   │   ├── ip-tracking.middleware.ts       # IP blocking & geo-restriction
│   │   ├── swaggerAuth.middleware.ts       # API docs authentication
│   │   └── auth.middleware.ts              # General auth wrapper
│   │
│   ├── db/                                 # Database Layer
│   │   ├── pool.ts                         # PostgreSQL connection pool
│   │   ├── mongo.ts                        # MongoDB connection
│   │   └── migrations/                     # SQL Migration Files
│   │       ├── 202407_rtp_settings_table.sql
│   │       ├── 202407_settings_table.sql
│   │       ├── 020_create_responsible_gaming_limits.sql
│   │       ├── 021_create_multilanguage_system.sql
│   │       ├── 022_enhance_player_status.sql
│   │       ├── 023_create_metadata_tables.sql
│   │       ├── 024_create_cms_system.sql
│   │       ├── 025_create_ip_tracking.sql
│   │       ├── 026_create_marketing_preferences.sql
│   │       ├── 027_insert_all_mobile_prefixes.sql
│   │       └── 028_insert_all_countries.sql
│   │
│   ├── configs/                            # Configuration Management
│   │   ├── config.ts                       # Main config object
│   │   └── env.ts                          # Environment variables (Zod validated)
│   │
│   ├── types/                              # TypeScript Type Definitions
│   │   ├── express.d.ts                    # Express extensions
│   │   ├── user.types.ts                   # User-related types
│   │   ├── game.types.ts                   # Game-related types
│   │   └── ...                             # Other type definitions
│   │
│   ├── utils/                              # Utility Functions
│   │   ├── logger.ts                       # Logging utility
│   │   ├── helpers.ts                      # Helper functions
│   │   └── ...                             # Other utilities
│   │
│   ├── app.ts                              # Express Application Setup
│   └── index.ts                            # Server Entry Point
│
├── dist/                                   # Compiled JavaScript Output
├── node_modules/                           # NPM Dependencies
├── uploads/                                # User uploads (avatars, documents)
├── .env                                    # Environment Configuration
├── .env.example                            # Example environment file
├── package.json                            # NPM dependencies & scripts
├── package-lock.json                       # Locked versions
├── tsconfig.json                           # TypeScript configuration
├── .gitignore                              # Git ignore rules
└── README.md                               # Project readme
```

### 2.2 Arhitectura în Straturi (Layered Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                             │
│  ┌───────────────────┐         ┌──────────────────────┐    │
│  │  Player Frontend  │         │   Admin Panel        │    │
│  │  (React/Next.js)  │         │   (React/Vue)        │    │
│  └───────────────────┘         └──────────────────────┘    │
└──────────────────────┬────────────────┬─────────────────────┘
                       │                │
                       │  HTTP/HTTPS    │  WebSocket
                       │  REST API      │  (Socket.io)
                       ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                    API LAYER (Routes)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  40+ Route Files                                     │   │
│  │  - /api/auth/*      - /api/user/*                   │   │
│  │  - /api/games/*     - /api/admin/*                  │   │
│  │  - /api/payment/*   - /api/affiliate/*              │   │
│  │  - /innova/*        - WebSocket endpoints           │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 MIDDLEWARE LAYER                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  authenticate.ts    - JWT verification               │   │
│  │  authorize.ts       - RBAC (role checking)           │   │
│  │  rate-limiter.ts    - Rate limiting + circuit break  │   │
│  │  validate.ts        - Zod schema validation          │   │
│  │  errorHandler.ts    - Global error handling          │   │
│  │  activity-logger.ts - Audit trail logging            │   │
│  │  ip-tracking.ts     - IP blocking & geo-restriction  │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              BUSINESS LOGIC LAYER (Services)                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  43 Service Modules:                                 │   │
│  │                                                       │   │
│  │  Core Services:                                      │   │
│  │  ├── auth.service.ts       - Authentication         │   │
│  │  ├── user.service.ts       - User management        │   │
│  │  ├── balance.service.ts    - Balance transactions   │   │
│  │  ├── game.service.ts       - Game launching         │   │
│  │                                                       │   │
│  │  Provider Integration:                               │   │
│  │  ├── innova-api.service.ts - Game provider API      │   │
│  │  ├── provider-callback.service.ts - Callbacks       │   │
│  │  ├── ggr-filter.service.ts - Revenue tracking       │   │
│  │                                                       │   │
│  │  Financial Services:                                 │   │
│  │  ├── payment.service.ts    - Payment processing     │   │
│  │  ├── withdrawal.service.ts - Withdrawals            │   │
│  │  ├── profit.service.ts     - Revenue analytics      │   │
│  │                                                       │   │
│  │  Marketing & CRM:                                    │   │
│  │  ├── affiliate.service.ts  - Affiliate tracking     │   │
│  │  ├── promotion.service.ts  - Bonuses & promotions   │   │
│  │  ├── crm.service.ts        - Player segmentation    │   │
│  │  ├── campaign.service.ts   - Marketing campaigns    │   │
│  │                                                       │   │
│  │  Communication:                                      │   │
│  │  ├── chat.service.ts       - Real-time chat         │   │
│  │  ├── notification.service.ts - Notifications        │   │
│  │  ├── support-ticket.service.ts - Support system     │   │
│  │                                                       │   │
│  │  Enterprise Features:                                │   │
│  │  ├── tournament.service.ts - Tournaments            │   │
│  │  ├── jackpot.service.ts    - Jackpots               │   │
│  │  ├── loyalty.service.ts    - Loyalty program        │   │
│  │  ├── risk-management.service.ts - Fraud detection   │   │
│  │  ├── kyc.service.ts        - KYC verification       │   │
│  │  ├── responsible-gaming.service.ts - RG tools       │   │
│  │                                                       │   │
│  │  Analytics & Reporting:                              │   │
│  │  ├── analytics.service.ts  - User analytics         │   │
│  │  ├── reports.service.ts    - Report generation      │   │
│  │  ├── activity.service.ts   - Activity logging       │   │
│  │                                                       │   │
│  │  Infrastructure:                                     │   │
│  │  ├── health.service.ts     - System monitoring      │   │
│  │  ├── cron-manager.service.ts - Background jobs      │   │
│  │  └── ... (19 more services)                         │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                DATA ACCESS LAYER                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  PostgreSQL (Primary Database)                       │   │
│  │  ├── 500 connection pool                            │   │
│  │  ├── 50+ tables                                      │   │
│  │  ├── users, games, bets, transactions               │   │
│  │  ├── promotions, affiliates, kyc_verifications      │   │
│  │  └── analytics, support_tickets, etc.               │   │
│  │                                                       │   │
│  │  MongoDB (Secondary Database)                        │   │
│  │  ├── Sessions storage                                │   │
│  │  ├── Temporary states                                │   │
│  │  └── Enterprise feature collections                  │   │
│  │                                                       │   │
│  │  Redis (Caching Layer - Optional)                    │   │
│  │  ├── Session caching                                 │   │
│  │  ├── Rate limiting counters                          │   │
│  │  └── WebSocket pub/sub                               │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              EXTERNAL INTEGRATIONS                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  - Innova Gaming API (1000+ games)                   │   │
│  │  - IGPX Sportsbook API                               │   │
│  │  - Payment Gateways (multiple)                       │   │
│  │  - 2FA Service (Google Authenticator)                │   │
│  │  - Email/SMS Services                                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```


### 2.3 Fluxul de Date în Aplicație

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. HTTP Request
       │ GET /api/user/profile
       │ Header: Authorization: Bearer <JWT>
       ▼
┌─────────────────────────────────────────┐
│         Express Router                   │
│    (user-management.routes.ts)          │
└──────┬──────────────────────────────────┘
       │
       │ 2. Pass through middlewares
       ▼
┌──────────────────────┐
│  authenticate.ts     │ → Verify JWT token
│  ✓ Token valid       │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  authorize.ts        │ → Check user role
│  ✓ Role: Player      │
└──────┬───────────────┘
       │
       │ 3. Route to controller
       ▼
┌──────────────────────────────────────────┐
│      user.controller.ts                  │
│  getUserProfile(req, res)                │
└──────┬───────────────────────────────────┘
       │
       │ 4. Call service
       ▼
┌──────────────────────────────────────────┐
│       user.service.ts                    │
│  async getUserById(userId)               │
└──────┬───────────────────────────────────┘
       │
       │ 5. Database query
       ▼
┌──────────────────────────────────────────┐
│      PostgreSQL Database                 │
│  SELECT * FROM users WHERE id = $1       │
└──────┬───────────────────────────────────┘
       │
       │ 6. Return data
       ▼
┌──────────────────────────────────────────┐
│       user.service.ts                    │
│  return userData                         │
└──────┬───────────────────────────────────┘
       │
       │ 7. Format response
       ▼
┌──────────────────────────────────────────┐
│      user.controller.ts                  │
│  res.json({ success: true, data })       │
└──────┬───────────────────────────────────┘
       │
       │ 8. HTTP Response
       ▼
┌─────────────┐
│   Client    │
│  Receives   │
│  JSON data  │
└─────────────┘
```

---

## SECȚIUNEA 3: SETUP ȘI CONFIGURARE DEVELOPMENT {#sectiunea-3}

### 3.1 Cerințe Sistem

**🔧 Cerințe Minime:**
- **Node.js:** v18.0.0 sau superior
- **PostgreSQL:** v14.0 sau superior
- **npm:** v8.0 sau superior
- **RAM:** 4GB minim
- **Disk:** 10GB spațiu liber
- **OS:** Linux, macOS, Windows (cu WSL2)

**⭐ Cerințe Recomandate (Production-ready):**
- **Node.js:** v20+ (Latest LTS)
- **PostgreSQL:** v16+
- **MongoDB:** v7+ (pentru enterprise features)
- **Redis:** v6+ (pentru sessions și caching)
- **RAM:** 8GB sau mai mult
- **Disk:** 50GB SSD
- **OS:** Ubuntu 22.04 LTS / Debian 12

### 3.2 Instalare Pas cu Pas

#### Step 1: Instalare Node.js și npm

**Ubuntu/Debian:**
```bash
# Update package list
sudo apt update

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show v10.x.x
```

**macOS:**
```bash
# Using Homebrew
brew install node@20

# Verify
node --version
npm --version
```

#### Step 2: Instalare PostgreSQL

**Ubuntu/Debian:**
```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify
sudo -u postgres psql --version
```

**macOS:**
```bash
brew install postgresql@16
brew services start postgresql@16
```

#### Step 3: Instalare MongoDB (Optional pentru Enterprise)

**Ubuntu/Debian:**
```bash
# Import MongoDB public key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add MongoDB repository
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### Step 4: Instalare Redis (Optional)

```bash
# Ubuntu/Debian
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify
redis-cli ping  # Should return "PONG"
```

### 3.3 Setup Proiect Backend

#### Step 1: Clone Repository (dacă ai acces)

```bash
# Clone repository
git clone <repository-url> backend-jackpotx
cd backend-jackpotx

# Sau dacă backend-ul este deja instalat
cd /var/www/html/backend.jackpotx.net
```

#### Step 2: Instalare Dependencies

```bash
# Install all npm packages
npm install

# Acest pas va instala:
# - 217 fișiere TypeScript compilate
# - 43 servicii
# - Toate dependențele necesare (express, jwt, bcrypt, etc.)
```

#### Step 3: Configurare Bază de Date PostgreSQL

```bash
# Login ca postgres user
sudo -u postgres psql

# Create database
CREATE DATABASE jackpotx_dev;

# Create user
CREATE USER jackpotx_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE jackpotx_dev TO jackpotx_user;

# Exit
\q
```

#### Step 4: Configurare MongoDB (dacă este folosit)

```bash
# Login to MongoDB
mongosh

# Switch to admin database
use admin

# Create admin user
db.createUser({
  user: "admin",
  pwd: "your_secure_password",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
})

# Create database and user for JackpotX
use jackpotx
db.createUser({
  user: "jackpotx_user",
  pwd: "your_secure_password",
  roles: [ { role: "readWrite", db: "jackpotx" } ]
})

exit
```

### 3.4 Configurare Environment Variables (.env)

Creează fișierul `.env` în directorul root al proiectului:

```bash
# Copy example
cp .env.example .env

# Edit .env
nano .env
```

**Conținut complet .env pentru Development:**

```bash
# ===================================================
# JACKPOTX BACKEND - ENVIRONMENT CONFIGURATION
# Environment: DEVELOPMENT
# ===================================================

# === API CONFIGURATION ===
PORT=3004
HOST=localhost
NODE_ENV=development

# === POSTGRESQL DATABASE ===
DB_PORT=5432
DB_HOST=localhost
DB_USER=jackpotx_user
DB_PASS='your_secure_password_here'
DB_NAME=jackpotx_dev

# Connection pool settings
DB_POOL_MIN=2
DB_POOL_MAX=500
DB_CONNECTION_TIMEOUT=30000
DB_IDLE_TIMEOUT=60000
DB_QUERY_TIMEOUT=60000

# === MONGODB DATABASE (Optional) ===
MONGO_URI=mongodb://jackpotx_user:your_secure_password@localhost:27017/jackpotx?authSource=admin

# === JWT SECRETS ===
# IMPORTANT: Generate new secrets for production!
# Generate using: openssl rand -hex 32
JWT_ACCESS_SECRET=your_32_character_secret_key_for_access_tokens_here_change_me
JWT_REFRESH_SECRET=your_32_character_secret_key_for_refresh_tokens_here_change_me
JWT_ACCESS_TOKEN_EXPIRES=24h
JWT_REFRESH_TOKEN_EXPIRES=30d

# === GAME PROVIDER - INNOVA GAMING ===
# Production credentials
SUPPLIER_API_KEY=thinkcode
SUPPLIER_SECRET_KEY=2aZWQ93V8aT1sKrA
SUPPLIER_GAME_LIST_URL=https://air.gameprovider.org/api/generic/games/list/all
SUPPLIER_LAUNCH_HOST=https://gamerun-eu.gaminguniverse.fun
SUPPLIER_CALLBACK_URL=http://localhost:3004/api/innova/
SUPPLIER_OPERATOR_ID=thinkcode
OPERATOR_HOME_URL=http://localhost:3000

# Pragmatic Play specific launcher (recommended by Innova)
PRAGMATIC_LAUNCH_HOST=https://run.games378.com

# === GGR (GROSS GAMING REVENUE) SETTINGS ===
GGR_FILTER_PERCENT=0.5
GGR_TOLERANCE=0.05
PROVIDER_GGR_ENDPOINT=http://localhost:3004/api/ggr
PROVIDER_API_KEY=2aZWQ93V8aT1sKrA

# === API DOCUMENTATION ===
SWAGGER_PASSWORD=qwer1234

# === RATE LIMITING ===
# Development: Unlimited (999999)
# Production: Set realistic limits
RATE_LIMIT_STANDARD_MAX=999999
RATE_LIMIT_STANDARD_WINDOW_MS=900000          # 15 minutes
RATE_LIMIT_STRICT_MAX=999999
RATE_LIMIT_STRICT_WINDOW_MS=60000             # 1 minute
RATE_LIMIT_PROVIDER_MAX=999999
RATE_LIMIT_PROVIDER_WINDOW_MS=60000           # 1 minute
RATE_LIMIT_AUTH_MAX=999999
RATE_LIMIT_AUTH_WINDOW_MS=900000              # 15 minutes

# === GAME PROXY - IP MASKING ===
# IP used to mask player's real IP when launching games
GAME_PROXY_IP=192.71.244.88
BACKEND_API_URL=http://localhost:3004
USE_ROTATING_PROXY=false

# === INNOVA SDK (Campaigns, Jackpots, Tournaments) ===
# Production credentials for TimelessTech Widget SDK
INNOVA_OPERATOR_ID=thinkcode
INNOVA_SECRET_KEY=2aZWQ93V8aT1sKrA
INNOVA_API_HOST=https://ttlive.me
INNOVA_PLATFORM_ID=thinkcode
INNOVA_GROUP=thinkcode_group
# Backoffice: https://backoffice.timelesstech.org/login
# User: thinkcode_bo | Pass: 39ByzDV3

# === JXORIGINALS (Internal Games) ===
# Games with full source code hosted on our server
JXORIGINALS_BASE_URL=http://localhost:3004/JxOriginalGames
JXORIGINALS_WS_URL=ws://localhost:8443
JXORIGINALS_SECRET_KEY=jxoriginals_dev_secret_key_2024
JXORIGINALS_OPERATOR_ID=jackpotx_operator
JXORIGINALS_ENABLED=true

# === IGPX SPORTSBOOK API (Optional) ===
IGPX_API_URL=https://sp-int-9cr.6579883.com
IGPX_API_VERSION=1.0.0
IGPX_CLIENT_USERNAME=jackpotx
IGPX_CLIENT_PASSWORD=NwFhr_KsyqpJwi62_Bc
IGPX_SECURITY_HASH=737e36e0-6d0b-4a67-aa50-2c448fe319f3

# === MONGODB ROOT CREDENTIALS ===
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=your_mongo_root_password

# === REDIS CONFIGURATION (Optional) ===
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# === EMAIL CONFIGURATION (Optional) ===
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# === SMS CONFIGURATION (Optional) ===
SMS_PROVIDER=twilio
SMS_ACCOUNT_SID=your_account_sid
SMS_AUTH_TOKEN=your_auth_token
SMS_FROM_NUMBER=+1234567890

# === CORS ALLOWED ORIGINS ===
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:8080

# === LOGGING ===
LOG_LEVEL=debug
LOG_FILE=logs/app.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=7d
```

### 3.5 Generare JWT Secrets

**IMPORTANT:** Pentru producție, generează întotdeauna secrets noi și sigure!

```bash
# Generate JWT Access Secret (32 bytes = 64 hex characters)
openssl rand -hex 32

# Output example:
# 0582ece5b4eea773a75a77198ac1ab0e6afd695d139b59e562689f832d59ea2f

# Generate JWT Refresh Secret
openssl rand -hex 32

# Output example:
# 6d2bde82f38c30dfe8b02abade37d5bdc4925c496ba6b265f3895cb6dc0257ea
```

Copiază aceste valori în `.env`:
```bash
JWT_ACCESS_SECRET=0582ece5b4eea773a75a77198ac1ab0e6afd695d139b59e562689f832d59ea2f
JWT_REFRESH_SECRET=6d2bde82f38c30dfe8b02abade37d5bdc4925c496ba6b265f3895cb6dc0257ea
```

### 3.6 Rulare Database Migrations

```bash
# Run all migrations
npm run migrate

# Migrations care vor fi executate:
# ✓ 202407_rtp_settings_table.sql
# ✓ 202407_settings_table.sql
# ✓ 020_create_responsible_gaming_limits.sql
# ✓ 021_create_multilanguage_system.sql
# ✓ 022_enhance_player_status.sql
# ✓ 023_create_metadata_tables.sql
# ✓ 024_create_cms_system.sql
# ✓ 025_create_ip_tracking.sql
# ✓ 026_create_marketing_preferences.sql
# ✓ 027_insert_all_mobile_prefixes.sql
# ✓ 028_insert_all_countries.sql
```

### 3.7 Seed Database cu Date de Test (Optional)

```bash
# Seed database with test data
npm run seed

# Acest command va crea:
# - 5 user-i de test (Admin, Player, Agent, Manager, Support)
# - 100+ jocuri de test
# - Categorii de jocuri
# - Provideri de jocuri
# - Role și permisiuni
# - Date de test pentru toate tabelele
```

### 3.8 Pornire Server Development

```bash
# Start development server cu hot-reload
npm run dev

# Output:
# [INFO] Starting JackpotX Backend Server...
# [INFO] Environment: development
# [INFO] Connecting to PostgreSQL...
# [INFO] ✓ PostgreSQL connected successfully
# [INFO] Connecting to MongoDB...
# [INFO] ✓ MongoDB connected successfully
# [INFO] Loading routes...
# [INFO] ✓ 40+ route files loaded
# [INFO] Starting WebSocket server...
# [INFO] ✓ WebSocket server started
# [INFO] Server listening on http://localhost:3004
# [INFO] API Documentation: http://localhost:3004/api-docs.json
# [INFO] Health Check: http://localhost:3004/health
```

### 3.9 Verificare Instalare

**Test 1: Health Check**
```bash
curl http://localhost:3004/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-11-14T10:00:00.000Z",
  "uptime": 123.45,
  "environment": "development",
  "database": {
    "postgresql": "connected",
    "mongodb": "connected"
  },
  "version": "3.0.0"
}
```

**Test 2: API Documentation**
```bash
# Open in browser
http://localhost:3004/api-docs.json

# Username: (leave empty)
# Password: qwer1234
```

**Test 3: Get CAPTCHA (test unauthenticated endpoint)**
```bash
curl http://localhost:3004/api/auth/captcha

# Expected response:
{
  "success": true,
  "data": {
    "id": "captcha_1234567890_abc",
    "svg": "<svg>...</svg>"
  }
}
```

**Test 4: Database Connection**
```bash
# Check PostgreSQL
psql -h localhost -U jackpotx_user -d jackpotx_dev -c "SELECT COUNT(*) FROM users;"

# Check MongoDB
mongosh "mongodb://jackpotx_user:password@localhost:27017/jackpotx?authSource=admin" --eval "db.sessions.countDocuments()"
```

### 3.10 Scripts NPM Disponibile

```bash
# Development
npm run dev              # Start cu hot-reload (ts-node-dev)
npm run dev:debug        # Start cu debugging enabled

# Build
npm run build            # Compile TypeScript → JavaScript (dist/)
npm run build:clean      # Clean dist/ și rebuild

# Production
npm start                # Start production server (din dist/)
npm run prod             # Build + Start production

# Database
npm run migrate          # Run database migrations
npm run migrate:rollback # Rollback last migration
npm run seed             # Seed database cu date test
npm run seed:reset       # Reset database și re-seed

# Testing
npm test                 # Run all tests
npm run test:unit        # Run unit tests
npm run test:integration # Run integration tests
npm run test:e2e         # Run end-to-end tests
npm run test:coverage    # Run tests cu coverage report

# Code Quality
npm run lint             # ESLint check
npm run lint:fix         # ESLint auto-fix
npm run format           # Prettier format
npm run type-check       # TypeScript type checking

# Utilities
npm run logs             # View application logs
npm run logs:error       # View error logs only
npm run clean            # Clean build artifacts
```

### 3.11 Structura Logs

```
logs/
├── app.log              # General application logs
├── error.log            # Error logs only
├── access.log           # HTTP access logs (Morgan)
├── database.log         # Database query logs
└── websocket.log        # WebSocket connection logs
```

### 3.12 Troubleshooting Setup

**Problem 1: Port 3004 already in use**
```bash
# Find process using port 3004
lsof -i :3004

# Kill process
kill -9 <PID>

# Or change PORT in .env
PORT=3005
```

**Problem 2: PostgreSQL connection failed**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check credentials in .env
# Verify: DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME
```

**Problem 3: MongoDB connection failed**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod

# Check MONGO_URI in .env
```

**Problem 4: Migration failed**
```bash
# Check migration files in src/db/migrations/
# Run migrations one by one:
psql -h localhost -U jackpotx_user -d jackpotx_dev -f src/db/migrations/001_migration.sql
```

**Problem 5: Module not found**
```bash
# Clear node_modules và reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## SECȚIUNEA 4: AUTENTIFICARE ȘI SECURITATE {#sectiunea-4}

### 4.1 Overview Sistem de Autentificare

Platforma JackpotX folosește un sistem de autentificare robust bazat pe:

1. **JWT (JSON Web Tokens)** - Stateless authentication
2. **2FA (Two-Factor Authentication)** - Google Authenticator (TOTP)
3. **Role-Based Access Control (RBAC)** - 5 roluri predefinite
4. **Rate Limiting** - Protecție împotriva brute-force
5. **Password Hashing** - bcrypt cu salt
6. **Session Management** - Refresh tokens cu 30 zile expiration

### 4.2 Fluxul Complet de Autentificare

```
┌──────────────────────────────────────────────────────────────────┐
│                    REGISTRATION FLOW                              │
└──────────────────────────────────────────────────────────────────┘

┌────────┐                                              ┌────────┐
│ Client │                                              │Backend │
└────┬───┘                                              └───┬────┘
     │                                                      │
     │ 1. GET /api/auth/captcha                            │
     │─────────────────────────────────────────────────────>│
     │                                                      │
     │ 2. Response: {id, svg}                              │
     │<─────────────────────────────────────────────────────│
     │                                                      │
     │ 3. User fills form + solves CAPTCHA                 │
     │                                                      │
     │ 4. POST /api/auth/register                          │
     │    {username, email, password, captcha_id, text}    │
     │─────────────────────────────────────────────────────>│
     │                                                      │
     │                                  Validate CAPTCHA ──┤
     │                                  Hash password ─────┤
     │                                  Insert to DB ──────┤
     │                                  Generate 2FA QR ───┤
     │                                                      │
     │ 5. Response: {qr_code, auth_secret} (OPTIONAL)      │
     │<─────────────────────────────────────────────────────│
     │                                                      │
     │ 6. User scans QR with Google Authenticator          │
     │    (OPTIONAL - can skip)                            │
     │                                                      │
     └─────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────┐
│                      LOGIN FLOW                                   │
└──────────────────────────────────────────────────────────────────┘

┌────────┐                                              ┌────────┐
│ Client │                                              │Backend │
└────┬───┘                                              └───┬────┘
     │                                                      │
     │ 1. POST /api/auth/login                             │
     │    {username, password, auth_code?}                 │
     │─────────────────────────────────────────────────────>│
     │                                                      │
     │                              Find user by username ─┤
     │                              Verify password ───────┤
     │                              Check if 2FA enabled ──┤
     │                                                      │
     │  ┌─────────────────────────────────────────────┐    │
     │  │  IF 2FA ENABLED:                           │    │
     │  │  - Validate auth_code with external service│    │
     │  │  - POST http://46.250.232.119:86/api/      │    │
     │  │    authenticate {user, token}              │    │
     │  │  - If invalid → return 401                 │    │
     │  └─────────────────────────────────────────────┘    │
     │                                                      │
     │                              Generate JWT tokens ───┤
     │                              - access_token (24h)   │
     │                              - refresh_token (30d)  │
     │                                                      │
     │ 2. Response: {access_token, refresh_token, role}    │
     │<─────────────────────────────────────────────────────│
     │                                                      │
     │ 3. Store tokens in localStorage/cookies             │
     │                                                      │
     │ 4. GET /api/user/profile                            │
     │    Header: Authorization: Bearer <access_token>     │
     │─────────────────────────────────────────────────────>│
     │                                                      │
     │                              Verify JWT ────────────┤
     │                              Decode payload ────────┤
     │                              Get user from DB ──────┤
     │                                                      │
     │ 5. Response: {user data}                            │
     │<─────────────────────────────────────────────────────│
     │                                                      │
     └─────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────┐
│                   TOKEN REFRESH FLOW                              │
└──────────────────────────────────────────────────────────────────┘

┌────────┐                                              ┌────────┐
│ Client │                                              │Backend │
└────┬───┘                                              └───┬────┘
     │                                                      │
     │ 1. GET /api/user/balance                            │
     │    Header: Authorization: Bearer <expired_token>    │
     │─────────────────────────────────────────────────────>│
     │                                                      │
     │                              Verify JWT ────────────┤
     │                              Token expired! ────────┤
     │                                                      │
     │ 2. Response: 401 Unauthorized                       │
     │    {message: "Token expired"}                       │
     │<─────────────────────────────────────────────────────│
     │                                                      │
     │ 3. POST /api/auth/refresh                           │
     │    {refresh_token}                                  │
     │─────────────────────────────────────────────────────>│
     │                                                      │
     │                              Verify refresh_token ──┤
     │                              Generate new access ───┤
     │                                                      │
     │ 4. Response: {access_token}                         │
     │<─────────────────────────────────────────────────────│
     │                                                      │
     │ 5. Retry original request cu new token              │
     │    GET /api/user/balance                            │
     │    Header: Authorization: Bearer <new_token>        │
     │─────────────────────────────────────────────────────>│
     │                                                      │
     │ 6. Response: {balance data}                         │
     │<─────────────────────────────────────────────────────│
     │                                                      │
     └─────────────────────────────────────────────────────┘
```


### 4.3 Implementare Înregistrare (Registration)

#### 4.3.1 Backend Endpoint

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "username": "newplayer123",
  "email": "player@example.com",
  "password": "SecurePass123!",
  "type": "Player",
  "captcha_id": "captcha_1234567890_abc",
  "captcha_text": "ABCD"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Registered Successfully",
  "data": {
    "qr_code": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"200\">...</svg>",
    "auth_secret": "STIIRABTLHHVDXW4"
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "status": 400,
  "message": "Invalid CAPTCHA"
}
```

**Response (Error - 409):**
```json
{
  "success": false,
  "status": 409,
  "message": "Username already exists"
}
```

#### 4.3.2 Frontend Implementation (React)

**Exemplu complet cu toate feature-urile:**

```javascript
// src/hooks/useRegistration.js
import { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = 'https://backend.jackpotx.net/api';

export const useRegistration = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [captcha, setCaptcha] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [authSecret, setAuthSecret] = useState(null);

  // Step 1: Get CAPTCHA
  const getCaptcha = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/captcha`);
      setCaptcha(response.data.data);
      return response.data.data;
    } catch (err) {
      setError('Failed to load CAPTCHA');
      throw err;
    }
  };

  // Step 2: Register user
  const register = async (userData, captchaText) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        type: 'Player',
        captcha_id: captcha.id,
        captcha_text: captchaText
      });

      // Check if 2FA setup is returned
      if (response.data.data.qr_code) {
        setQrCode(response.data.data.qr_code);
        setAuthSecret(response.data.data.auth_secret);
      }

      setLoading(false);
      return {
        success: true,
        has2FA: !!response.data.data.qr_code,
        data: response.data.data
      };
    } catch (err) {
      setLoading(false);
      const errorMessage = err.response?.data?.message || 'Registration failed';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    }
  };

  // Refresh CAPTCHA
  const refreshCaptcha = async () => {
    return await getCaptcha();
  };

  return {
    loading,
    error,
    captcha,
    qrCode,
    authSecret,
    getCaptcha,
    register,
    refreshCaptcha
  };
};

// src/components/RegistrationForm.jsx
import React, { useState, useEffect } from 'react';
import { useRegistration } from '../hooks/useRegistration';

const RegistrationForm = ({ onSuccess }) => {
  const {
    loading,
    error,
    captcha,
    qrCode,
    authSecret,
    getCaptcha,
    register,
    refreshCaptcha
  } = useRegistration();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    captchaText: ''
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  // Load CAPTCHA on mount
  useEffect(() => {
    getCaptcha();
  }, []);

  // Validate form
  const validateForm = () => {
    const errors = {};

    // Username validation
    if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      errors.email = 'Invalid email address';
    }

    // Password validation
    if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(formData.password)) {
      errors.password = 'Password must contain at least one uppercase letter';
    }
    if (!/[0-9]/.test(formData.password)) {
      errors.password = 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*]/.test(formData.password)) {
      errors.password = 'Password must contain at least one special character';
    }

    // Confirm password
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // CAPTCHA
    if (!formData.captchaText) {
      errors.captchaText = 'Please enter CAPTCHA text';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const result = await register(formData, formData.captchaText);

    if (result.success) {
      if (result.has2FA) {
        // Show 2FA setup modal
        // User can scan QR code or skip
      } else {
        // Registration complete, redirect to login
        onSuccess();
      }
    }
  };

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  return (
    <div className="registration-form">
      <h2>Create Account</h2>

      {error && (
        <div className="error-alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Username */}
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className={validationErrors.username ? 'error' : ''}
            required
          />
          {validationErrors.username && (
            <span className="error-text">{validationErrors.username}</span>
          )}
        </div>

        {/* Email */}
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={validationErrors.email ? 'error' : ''}
            required
          />
          {validationErrors.email && (
            <span className="error-text">{validationErrors.email}</span>
          )}
        </div>

        {/* Password */}
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="password-input">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={validationErrors.password ? 'error' : ''}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="toggle-password"
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          {validationErrors.password && (
            <span className="error-text">{validationErrors.password}</span>
          )}
          <small>Min 8 characters, 1 uppercase, 1 number, 1 special character</small>
        </div>

        {/* Confirm Password */}
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className={validationErrors.confirmPassword ? 'error' : ''}
            required
          />
          {validationErrors.confirmPassword && (
            <span className="error-text">{validationErrors.confirmPassword}</span>
          )}
        </div>

        {/* CAPTCHA */}
        <div className="form-group captcha-group">
          <label>Security Check</label>
          {captcha && (
            <div className="captcha-container">
              <div
                className="captcha-image"
                dangerouslySetInnerHTML={{ __html: captcha.svg }}
              />
              <button
                type="button"
                onClick={refreshCaptcha}
                className="refresh-captcha"
              >
                🔄 Refresh
              </button>
            </div>
          )}
          <input
            type="text"
            name="captchaText"
            value={formData.captchaText}
            onChange={handleChange}
            placeholder="Enter text from image"
            className={validationErrors.captchaText ? 'error' : ''}
            required
          />
          {validationErrors.captchaText && (
            <span className="error-text">{validationErrors.captchaText}</span>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
        >
          {loading ? 'Creating Account...' : 'Register'}
        </button>
      </form>

      {/* 2FA Setup Modal */}
      {qrCode && (
        <TwoFactorSetupModal
          qrCode={qrCode}
          authSecret={authSecret}
          onComplete={onSuccess}
          onSkip={onSuccess}
        />
      )}
    </div>
  );
};

// src/components/TwoFactorSetupModal.jsx
const TwoFactorSetupModal = ({ qrCode, authSecret, onComplete, onSkip }) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState(null);

  const handleVerify = async () => {
    // Verify the 2FA code
    // This would typically involve logging in with the code
    // For now, we'll just complete the setup
    onComplete();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Enable Two-Factor Authentication (Optional)</h2>
        <p>Scan this QR code with Google Authenticator or Authy:</p>

        <div className="qr-code-container">
          <div dangerouslySetInnerHTML={{ __html: qrCode }} />
        </div>

        <div className="secret-key">
          <p>Or enter this secret key manually:</p>
          <code>{authSecret}</code>
          <button onClick={() => navigator.clipboard.writeText(authSecret)}>
            📋 Copy
          </button>
        </div>

        <div className="verification-input">
          <label>Verify with 6-digit code:</label>
          <input
            type="text"
            maxLength="6"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="000000"
          />
        </div>

        {error && <div className="error-text">{error}</div>}

        <div className="modal-actions">
          <button onClick={handleVerify} className="btn-primary">
            Verify & Enable
          </button>
          <button onClick={onSkip} className="btn-secondary">
            Skip for Now
          </button>
        </div>

        <p className="note">
          ⚠️ You can enable 2FA later from your account settings
        </p>
      </div>
    </div>
  );
};

export default RegistrationForm;
```

### 4.4 Implementare Login

#### 4.4.1 Backend Endpoint

**Endpoint:** `POST /api/auth/login`

**Request Body (fără 2FA):**
```json
{
  "username": "player123",
  "password": "SecurePass123!"
}
```

**Request Body (cu 2FA):**
```json
{
  "username": "player123",
  "password": "SecurePass123!",
  "auth_code": "123456"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Logged in successfully",
  "token": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywid...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMyw...",
    "role": {
      "id": 2,
      "username": "player123",
      "name": "Player",
      "description": "Regular player account"
    }
  }
}
```

**Response (Error - 401 Invalid Credentials):**
```json
{
  "success": false,
  "status": 401,
  "message": "Invalid username or password"
}
```

**Response (Error - 401 Invalid 2FA):**
```json
{
  "success": false,
  "status": 401,
  "message": "Invalid 2FA authentication code"
}
```

#### 4.4.2 JWT Token Structure

Când decryptezi un JWT token, vei găsi următoarea structură:

```json
{
  "userId": 123,
  "username": "player123",
  "email": "player@example.com",
  "role": "Player",
  "role_id": 2,
  "iat": 1699876543,
  "exp": 1699962943
}
```

**Explicație câmpuri:**
- `userId` - ID-ul utilizatorului în baza de date
- `username` - Username-ul utilizatorului
- `email` - Email-ul utilizatorului
- `role` - Numele rolului (Player, Admin, etc.)
- `role_id` - ID-ul rolului în baza de date
- `iat` (Issued At) - Timestamp când a fost emis token-ul
- `exp` (Expiration) - Timestamp când expiră token-ul

#### 4.4.3 Frontend Implementation (React)

**Complete Auth Context cu toate feature-urile:**

```javascript
// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_BASE_URL = 'https://backend.jackpotx.net/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is logged in on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const userRole = localStorage.getItem('user_role');

    if (token && userRole) {
      try {
        setUser(JSON.parse(userRole));
        setIsAuthenticated(true);
      } catch (err) {
        console.error('Error parsing user data:', err);
        logout();
      }
    }
    setLoading(false);
  }, []);

  // Login function
  const login = async (username, password, authCode = null) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username,
        password,
        ...(authCode && { auth_code: authCode })
      });

      const { access_token, refresh_token, role } = response.data.token;

      // Store tokens
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user_role', JSON.stringify(role));

      setUser(role);
      setIsAuthenticated(true);

      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      return {
        success: false,
        message: errorMessage,
        requires2FA: errorMessage.includes('2FA')
      };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    setUser(null);
    setIsAuthenticated(false);
  };

  // Refresh token function
  const refreshToken = async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      if (!refresh) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refresh_token: refresh
      });

      const { access_token } = response.data;
      localStorage.setItem('access_token', access_token);

      return access_token;
    } catch (error) {
      logout();
      throw error;
    }
  };

  // Check if user has specific role
  const hasRole = (requiredRole) => {
    return user?.name === requiredRole;
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roles) => {
    return roles.includes(user?.name);
  };

  // Get current user data
  const getCurrentUser = () => {
    return user;
  };

  // Check if token is expired
  const isTokenExpired = () => {
    const token = localStorage.getItem('access_token');
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    refreshToken,
    hasRole,
    hasAnyRole,
    getCurrentUser,
    isTokenExpired
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// src/components/LoginForm.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginForm = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    authCode: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [requires2FA, setRequires2FA] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await login(
      formData.username,
      formData.password,
      formData.authCode || null
    );

    setLoading(false);

    if (result.success) {
      // Redirect based on user role
      const userRole = result.data.token.role.name;
      if (userRole === 'Admin') {
        navigate('/admin/dashboard');
      } else if (userRole === 'Player') {
        navigate('/player/dashboard');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.message);
      if (result.requires2FA) {
        setRequires2FA(true);
      }
    }
  };

  return (
    <div className="login-form">
      <h2>Login to JackpotX</h2>

      {error && (
        <div className="error-alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Username */}
        <div className="form-group">
          <label htmlFor="username">Username or Email</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            autoFocus
          />
        </div>

        {/* Password */}
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="password-input">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="toggle-password"
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        {/* 2FA Code (shown only if required) */}
        {requires2FA && (
          <div className="form-group">
            <label htmlFor="authCode">
              2FA Code (from Google Authenticator)
            </label>
            <input
              type="text"
              id="authCode"
              name="authCode"
              value={formData.authCode}
              onChange={handleChange}
              maxLength="6"
              placeholder="000000"
              required={requires2FA}
            />
            <small>Enter the 6-digit code from your authenticator app</small>
          </div>
        )}

        {/* Remember Me */}
        <div className="form-group checkbox-group">
          <label>
            <input type="checkbox" name="rememberMe" />
            Remember me
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      {/* Links */}
      <div className="form-links">
        <a href="/forgot-password">Forgot Password?</a>
        <a href="/register">Don't have an account? Register</a>
      </div>
    </div>
  );
};

export default LoginForm;
```


### 4.5 Axios Setup cu Auto-Refresh Token

```javascript
// src/api/axios.js
import axios from 'axios';

const API_BASE_URL = 'https://backend.jackpotx.net/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 seconds
});

// Request interceptor - Add token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and auto-refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken
        });

        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);

      } catch (refreshError) {
        // Refresh failed - logout user
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    return Promise.reject(error);
  }
);

export default api;
```

### 4.6 Protected Routes în React

```javascript
// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRole, requiredRoles }) => {
  const { user, loading, isAuthenticated, hasRole, hasAnyRole } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check single role
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check multiple roles
  if (requiredRoles && !hasAnyRole(requiredRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;

// Usage în App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Player routes */}
        <Route
          path="/player/*"
          element={
            <ProtectedRoute requiredRole="Player">
              <PlayerDashboard />
            </ProtectedRoute>
          }
        />
        
        {/* Admin routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute requiredRole="Admin">
              <AdminPanel />
            </ProtectedRoute>
          }
        />
        
        {/* Routes for multiple roles */}
        <Route
          path="/management/*"
          element={
            <ProtectedRoute requiredRoles={['Admin', 'Manager', 'Agent']}>
              <ManagementPanel />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

### 4.7 Role-Based Access Control (RBAC)

**Cele 5 roluri disponibile în sistem:**

| Role ID | Role Name | Access Level | Permissions |
|---------|-----------|--------------|-------------|
| 1 | **Admin** | Full Access | All features, user management, system settings, reports |
| 2 | **Player** | Limited | Games, profile, transactions, support tickets |
| 3 | **Agent** | Medium | Player management, reports, affiliate tracking |
| 4 | **Manager** | High | Analytics, user management, game management, reports |
| 5 | **Support** | Medium | Support tickets, chat, user assistance, KYC review |

**Exemplu de verificare roluri:**

```javascript
// src/utils/permissions.js

export const ROLES = {
  ADMIN: 'Admin',
  PLAYER: 'Player',
  AGENT: 'Agent',
  MANAGER: 'Manager',
  SUPPORT: 'Support'
};

export const PERMISSIONS = {
  // User Management
  VIEW_USERS: [ROLES.ADMIN, ROLES.MANAGER, ROLES.AGENT],
  EDIT_USERS: [ROLES.ADMIN, ROLES.MANAGER],
  DELETE_USERS: [ROLES.ADMIN],
  
  // Game Management
  VIEW_GAMES: [ROLES.ADMIN, ROLES.MANAGER],
  EDIT_GAMES: [ROLES.ADMIN],
  
  // Financial
  VIEW_TRANSACTIONS: [ROLES.ADMIN, ROLES.MANAGER, ROLES.AGENT],
  APPROVE_WITHDRAWALS: [ROLES.ADMIN, ROLES.MANAGER],
  
  // Support
  VIEW_TICKETS: [ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPPORT],
  RESOLVE_TICKETS: [ROLES.ADMIN, ROLES.SUPPORT],
  
  // KYC
  VIEW_KYC: [ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPPORT],
  APPROVE_KYC: [ROLES.ADMIN, ROLES.MANAGER],
  
  // Reports
  VIEW_REPORTS: [ROLES.ADMIN, ROLES.MANAGER, ROLES.AGENT],
  EXPORT_REPORTS: [ROLES.ADMIN, ROLES.MANAGER]
};

export const hasPermission = (userRole, permission) => {
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles && allowedRoles.includes(userRole);
};

// Usage
import { hasPermission, PERMISSIONS } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';

const UserManagement = () => {
  const { user } = useAuth();
  
  const canEditUsers = hasPermission(user?.name, PERMISSIONS.EDIT_USERS);
  const canDeleteUsers = hasPermission(user?.name, PERMISSIONS.DELETE_USERS);
  
  return (
    <div>
      {canEditUsers && <button>Edit User</button>}
      {canDeleteUsers && <button>Delete User</button>}
    </div>
  );
};
```

---

## SECȚIUNEA 5: INTEGRARE FRONTEND JUCĂTORI - API COMPLETE {#sectiunea-5}

### 5.1 API Reference Complet pentru Frontend Jucători

**Tabel complet cu toate endpoint-urile pentru jucători:**

| Method | Endpoint | Description | Auth | Params/Body |
|--------|----------|-------------|------|-------------|
| **AUTHENTICATION** |
| GET | `/api/auth/captcha` | Get CAPTCHA | No | - |
| POST | `/api/auth/register` | Register user | No | username, email, password, captcha_id, captcha_text |
| POST | `/api/auth/login` | Login | No | username, password, auth_code? |
| POST | `/api/auth/refresh` | Refresh token | No | refresh_token |
| GET | `/api/auth/user-roles` | Get user roles | No | ?username=xxx |
| **USER PROFILE** |
| GET | `/api/user/profile` | Get profile | Yes | - |
| PUT | `/api/user/profile` | Update profile | Yes | first_name, last_name, phone, etc. |
| GET | `/api/user/balance` | Get balance | Yes | - |
| GET | `/api/user/activity` | Get activity log | Yes | ?limit=20 |
| GET | `/api/user/transactions` | Transaction history | Yes | ?limit=50&type=deposit |
| GET | `/api/user/bets` | Betting history | Yes | ?limit=50 |
| POST | `/api/user/2fa/enable` | Enable 2FA | Yes | - |
| POST | `/api/user/2fa/disable` | Disable 2FA | Yes | auth_code |
| **GAMES** |
| GET | `/api/games` | Get all games | Yes | ?limit=50&provider=xxx&category=xxx |
| GET | `/api/games/:id` | Game details | Yes | - |
| GET | `/api/games/categories` | Game categories | Yes | - |
| GET | `/api/games/providers` | Game providers | Yes | - |
| GET | `/api/games/featured` | Featured games | Yes | ?limit=10 |
| GET | `/api/games/new` | New games | Yes | ?limit=10 |
| GET | `/api/games/hot` | Hot games | Yes | ?limit=10 |
| GET | `/api/games/popular` | Popular games | Yes | ?limit=10 |
| POST | `/api/games/play/:id` | Launch game | Yes | demo: boolean |
| GET | `/api/games/favorites` | Get favorites | Yes | - |
| POST | `/api/games/favorite` | Add favorite | Yes | game_id |
| DELETE | `/api/games/favorite/:id` | Remove favorite | Yes | - |
| GET | `/api/games/:id/statistics` | Game statistics | Yes | - |
| **HOME & DASHBOARD** |
| GET | `/api/home` | Dashboard data | Yes | - |
| **PROMOTIONS** |
| GET | `/api/promotions/active` | Active promotions | Yes | - |
| GET | `/api/promotions/:id` | Promotion details | Yes | - |
| POST | `/api/promotions/claim/:id` | Claim promotion | Yes | - |
| GET | `/api/promotions/my-bonuses` | My bonuses | Yes | - |
| **PAYMENT & WITHDRAWALS** |
| GET | `/api/payment/methods` | Payment methods | Yes | - |
| POST | `/api/payment/deposit` | Create deposit | Yes | amount, method |
| GET | `/api/payment/history` | Payment history | Yes | ?limit=50 |
| POST | `/api/withdrawals/request` | Request withdrawal | Yes | amount, method |
| GET | `/api/withdrawals/history` | Withdrawal history | Yes | ?limit=50 |
| **RESPONSIBLE GAMING** |
| GET | `/api/responsible-gaming/limits` | Get my limits | Yes | - |
| POST | `/api/responsible-gaming/set-limit` | Set limit | Yes | type, amount, period |
| POST | `/api/responsible-gaming/self-exclude` | Self-exclude | Yes | duration |
| GET | `/api/responsible-gaming/session-time` | Get session time | Yes | - |
| **SUPPORT** |
| GET | `/api/support/tickets` | My tickets | Yes | ?status=open |
| POST | `/api/support/tickets` | Create ticket | Yes | subject, message, category |
| GET | `/api/support/tickets/:id` | Ticket details | Yes | - |
| POST | `/api/support/tickets/:id/reply` | Reply to ticket | Yes | message |
| **TOURNAMENTS & JACKPOTS** |
| GET | `/api/tournaments/active` | Active tournaments | Yes | - |
| POST | `/api/tournaments/:id/join` | Join tournament | Yes | - |
| GET | `/api/tournaments/:id/leaderboard` | Leaderboard | Yes | - |
| GET | `/api/jackpots/active` | Active jackpots | Yes | - |
| GET | `/api/jackpots/:id` | Jackpot details | Yes | - |


### 5.2 Implementare Practică - Frontend Jucători

#### 5.2.1 Dashboard Component Complet

```javascript
// src/pages/PlayerDashboard.jsx
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import useBalance from '../hooks/useBalance';

const PlayerDashboard = () => {
  const { user } = useAuth();
  const { balance, bonusBalance, loading: balanceLoading } = useBalance();
  
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/home');
      setDashboardData(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="player-dashboard">
      {/* Header cu balance */}
      <div className="dashboard-header">
        <h1>Welcome back, {user?.username}!</h1>
        <div className="balance-display">
          <div className="main-balance">
            <span>Main Balance:</span>
            <strong>${balance?.toFixed(2) || '0.00'}</strong>
          </div>
          {bonusBalance > 0 && (
            <div className="bonus-balance">
              <span>Bonus:</span>
              <strong>${bonusBalance?.toFixed(2)}</strong>
            </div>
          )}
          <button className="btn-deposit">Deposit</button>
        </div>
      </div>

      {/* Featured Games */}
      <section className="featured-games">
        <h2>Featured Games</h2>
        <div className="games-grid">
          {dashboardData?.featured_games?.map(game => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </section>

      {/* Active Promotions */}
      <section className="promotions">
        <h2>Active Promotions</h2>
        <div className="promotions-list">
          {dashboardData?.active_promotions?.map(promo => (
            <PromotionCard key={promo.id} promotion={promo} />
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      <section className="recent-activity">
        <h2>Recent Activity</h2>
        <ActivityFeed activities={dashboardData?.recent_activity} />
      </section>
    </div>
  );
};

export default PlayerDashboard;
```

---

## SECȚIUNEA 6: INTEGRARE PANOU ADMIN - API COMPLETE {#sectiunea-6}

### 6.1 API Reference Complet pentru Admin

**Tabel complet cu toate endpoint-urile pentru Admin:**

| Method | Endpoint | Description | Required Role | Params/Body |
|--------|----------|-------------|---------------|-------------|
| **ADMIN DASHBOARD** |
| GET | `/api/admin/dashboard` | Dashboard stats | Admin | ?period=today |
| GET | `/api/admin/dashboard/charts` | Chart data | Admin | ?type=revenue |
| **USER MANAGEMENT** |
| GET | `/api/admin/users` | List all users | Admin | ?limit=50&search=xxx |
| GET | `/api/admin/users/:id` | User details | Admin | - |
| PUT | `/api/admin/users/:id` | Update user | Admin | status, balance, role_id |
| POST | `/api/admin/users/:id/ban` | Ban user | Admin | reason, duration |
| POST | `/api/admin/users/:id/unban` | Unban user | Admin | - |
| POST | `/api/admin/users/:id/adjust-balance` | Adjust balance | Admin | amount, type, reason |
| GET | `/api/admin/users/:id/history` | User history | Admin | - |
| GET | `/api/admin/users/:id/bets` | User bets | Admin | ?limit=100 |
| **GAME MANAGEMENT** |
| GET | `/api/admin/games` | List games (admin) | Admin | ?limit=100 |
| GET | `/api/admin/games/:id` | Game details | Admin | - |
| PUT | `/api/admin/games/:id` | Update game | Admin | status, category, order |
| POST | `/api/admin/games/import` | Import games | Admin | provider |
| PUT | `/api/admin/games/:id/rtp` | Update RTP | Admin | target_rtp, mode |
| POST | `/api/admin/games/:id/toggle-status` | Enable/disable | Admin | status |
| GET | `/api/admin/games/:id/statistics` | Game analytics | Admin | ?period=month |
| **TRANSACTION MANAGEMENT** |
| GET | `/api/admin/transactions` | All transactions | Admin | ?type=xxx&status=xxx |
| GET | `/api/admin/transactions/:id` | Transaction details | Admin | - |
| POST | `/api/admin/transactions/:id/approve` | Approve transaction | Admin | - |
| POST | `/api/admin/transactions/:id/reject` | Reject transaction | Admin | reason |
| **KYC MANAGEMENT** |
| GET | `/api/admin/kyc/pending` | Pending KYC | Admin | ?limit=50 |
| GET | `/api/admin/kyc/:id` | KYC details | Admin | - |
| POST | `/api/admin/kyc/:id/approve` | Approve KYC | Admin | - |
| POST | `/api/admin/kyc/:id/reject` | Reject KYC | Admin | reason |
| GET | `/api/admin/kyc/:id/documents` | KYC documents | Admin | - |
| **PROMOTION MANAGEMENT** |
| GET | `/api/admin/promotions` | All promotions | Admin | ?status=active |
| GET | `/api/admin/promotions/:id` | Promotion details | Admin | - |
| POST | `/api/admin/promotions` | Create promotion | Admin | title, type, bonus_%, etc. |
| PUT | `/api/admin/promotions/:id` | Update promotion | Admin | fields... |
| DELETE | `/api/admin/promotions/:id` | Delete promotion | Admin | - |
| GET | `/api/admin/promotions/:id/stats` | Promotion stats | Admin | - |
| **REPORTS & ANALYTICS** |
| POST | `/api/admin/reports/generate` | Generate report | Admin | type, date_from, date_to |
| GET | `/api/admin/analytics/revenue` | Revenue analytics | Admin | ?period=month |
| GET | `/api/admin/analytics/user-behavior` | User behavior | Admin | ?period=month |
| GET | `/api/admin/analytics/game-performance` | Game performance | Admin | ?period=month |
| GET | `/api/admin/analytics/provider-stats` | Provider stats | Admin | ?period=month |
| **ACTIVITY LOGS** |
| GET | `/api/admin/activities` | Activity logs | Admin | ?user_id=xxx&limit=100 |
| GET | `/api/admin/activities/:id` | Activity details | Admin | - |
| **SUPPORT TICKETS (Admin)** |
| GET | `/api/admin/support/tickets` | All tickets | Admin/Support | ?status=open |
| GET | `/api/admin/support/tickets/:id` | Ticket details | Admin/Support | - |
| POST | `/api/admin/support/tickets/:id/reply` | Reply ticket | Admin/Support | message |
| POST | `/api/admin/support/tickets/:id/close` | Close ticket | Admin/Support | - |
| POST | `/api/admin/support/tickets/:id/assign` | Assign ticket | Admin | agent_id |
| **CRM & PLAYER MANAGEMENT** |
| GET | `/api/admin/crm/player/:id` | Player 360 view | Admin | - |
| POST | `/api/admin/crm/campaigns` | Create campaign | Admin | name, segment, message |
| GET | `/api/admin/crm/segments` | Player segments | Admin | - |
| POST | `/api/admin/crm/segments` | Create segment | Admin | name, rules |
| **ADMIN MODULES (Navigation)** |
| GET | `/api/admin-modules/my-modules` | Get my modules | Any | - |
| GET | `/api/admin-modules/all` | All modules | Admin | - |
| GET | `/api/admin-modules/roles` | Available roles | Admin | - |
| GET | `/api/admin-modules/by-role/:roleId` | Modules by role | Admin | - |
| POST | `/api/admin-modules` | Create module | Admin | title, path, icon, role_id[] |
| PUT | `/api/admin-modules/:id` | Update module | Admin | fields... |
| DELETE | `/api/admin-modules/:id` | Delete module | Admin | - |
| **SETTINGS** |
| GET | `/api/admin/settings` | Platform settings | Admin | - |
| PUT | `/api/admin/settings` | Update settings | Admin | fields... |
| GET | `/api/admin/settings/rtp` | RTP settings | Admin | - |
| PUT | `/api/admin/settings/rtp` | Update RTP | Admin | global_rtp, mode |

### 6.2 Implementare Admin Dashboard

#### 6.2.1 Admin Sidebar cu Module Navigation

```javascript
// src/components/admin/AdminSidebar.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../api/axios';

const AdminSidebar = () => {
  const location = useLocation();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState({});

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const response = await api.get('/admin-modules/my-modules');
      setModules(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching modules:', error);
      setLoading(false);
    }
  };

  const toggleExpand = (moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const renderModule = (module, depth = 0) => {
    const hasChildren = module.children && module.children.length > 0;
    const isExpanded = expandedModules[module.id];
    const isActive = location.pathname === module.path;

    return (
      <div key={module.id} className={`sidebar-module depth-${depth}`}>
        <div className={`module-item ${isActive ? 'active' : ''}`}>
          {hasChildren ? (
            <>
              <button
                onClick={() => toggleExpand(module.id)}
                className="expand-button"
              >
                <i className={module.icon}></i>
                <span>{module.title}</span>
                <i className={`arrow ${isExpanded ? 'down' : 'right'}`}></i>
              </button>
            </>
          ) : (
            <Link to={module.path}>
              <i className={module.icon}></i>
              <span>{module.title}</span>
            </Link>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="submenu">
            {module.children.map(child => renderModule(child, depth + 1))}
          </div>
        )}

        {module.divider === "1" && <hr className="divider" />}
      </div>
    );
  };

  if (loading) {
    return <div className="sidebar-loading">Loading...</div>;
  }

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-header">
        <h2>Admin Panel</h2>
      </div>

      <nav className="sidebar-nav">
        {modules.map(module => renderModule(module))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;
```

#### 6.2.2 Admin Dashboard Statistics

```javascript
// src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today');

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/dashboard?period=${period}`);
      setStats(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  };

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <StatsCard
          title="Total Users"
          value={stats?.users?.total}
          change="+12%"
          icon="👥"
        />
        <StatsCard
          title="Active Today"
          value={stats?.users?.active_today}
          change="+5%"
          icon="✅"
        />
        <StatsCard
          title="Revenue Today"
          value={`$${stats?.revenue?.today?.toFixed(2)}`}
          change="+8%"
          icon="💰"
        />
        <StatsCard
          title="GGR"
          value={`$${stats?.revenue?.ggr?.toFixed(2)}`}
          change="+15%"
          icon="📈"
        />
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-container">
          <h3>Revenue Trend</h3>
          <RevenueChart data={stats?.revenue} />
        </div>
        <div className="chart-container">
          <h3>Most Played Games</h3>
          <TopGamesChart games={stats?.games?.most_played} />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity">
        <h3>Recent Activity</h3>
        <ActivityTable activities={stats?.recent_activity} />
      </div>
    </div>
  );
};

const StatsCard = ({ title, value, change, icon }) => (
  <div className="stats-card">
    <div className="stats-icon">{icon}</div>
    <div className="stats-content">
      <h4>{title}</h4>
      <p className="stats-value">{value}</p>
      <span className={`stats-change ${change.startsWith('+') ? 'positive' : 'negative'}`}>
        {change}
      </span>
    </div>
  </div>
);

export default AdminDashboard;
```


---

## SECȚIUNEA 7: WEBSOCKET ȘI REAL-TIME FEATURES {#sectiunea-7}

### 7.1 Setup WebSocket Connection

**Server-ul WebSocket este deja configurat și rulează pe același port cu API-ul (3004).**

#### 7.1.1 Client-Side WebSocket Setup (React)

```javascript
// src/services/socket.js
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect(token) {
    if (this.socket && this.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    this.socket = io('https://backend.jackpotx.net', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 10000
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket.id);
      this.connected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.connected = false;
      
      if (reason === 'io server disconnect') {
        // Server disconnected, reconnect manually
        this.socket.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔴 WebSocket connection error:', error.message);
    });

    this.socket.on('error', (error) => {
      console.error('🔴 WebSocket error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  emit(event, data) {
    if (this.socket && this.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected. Cannot emit event:', event);
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  isConnected() {
    return this.connected;
  }
}

export default new SocketService();
```

#### 7.1.2 React Hook pentru WebSocket

```javascript
// src/hooks/useSocket.js
import { useEffect, useState, useCallback } from 'react';
import socketService from '../services/socket';

const useSocket = () => {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      console.warn('No token available for WebSocket connection');
      return;
    }

    // Connect to WebSocket
    const socket = socketService.connect(token);

    // Listen to connection status
    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, []);

  const emit = useCallback((event, data) => {
    socketService.emit(event, data);
  }, []);

  const on = useCallback((event, callback) => {
    socketService.on(event, callback);
    
    // Return cleanup function
    return () => {
      socketService.off(event, callback);
    };
  }, []);

  return { connected, emit, on };
};

export default useSocket;
```

### 7.2 Real-time Balance Updates

```javascript
// src/hooks/useBalance.js
import { useState, useEffect } from 'react';
import api from '../api/axios';
import useSocket from './useSocket';

const useBalance = () => {
  const [balance, setBalance] = useState(0);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const { connected, on } = useSocket();

  // Fetch initial balance
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await api.get('/user/balance');
        setBalance(response.data.data.balance);
        setBonusBalance(response.data.data.bonus_balance || 0);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching balance:', error);
        setLoading(false);
      }
    };

    fetchBalance();
  }, []);

  // Listen for real-time balance updates
  useEffect(() => {
    if (!connected) return;

    const cleanup = on('balance_update', (data) => {
      console.log('💰 Balance updated:', data);
      setBalance(data.balance);
      setBonusBalance(data.bonus_balance || 0);
    });

    return cleanup;
  }, [connected, on]);

  return { balance, bonusBalance, loading };
};

export default useBalance;

// Usage în component
const BalanceDisplay = () => {
  const { balance, bonusBalance, loading } = useBalance();

  if (loading) return <div>Loading balance...</div>;

  return (
    <div className="balance-display">
      <div className="main-balance">
        <span>Balance:</span>
        <strong>${balance.toFixed(2)}</strong>
      </div>
      {bonusBalance > 0 && (
        <div className="bonus-balance">
          <span>Bonus:</span>
          <strong>${bonusBalance.toFixed(2)}</strong>
        </div>
      )}
    </div>
  );
};
```

### 7.3 Real-time Chat Implementation

```javascript
// src/components/Chat.jsx
import React, { useState, useEffect, useRef } from 'react';
import useSocket from '../hooks/useSocket';

const Chat = ({ room = 'general' }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const { connected, emit, on } = useSocket();

  // Join room on mount
  useEffect(() => {
    if (connected) {
      emit('join_chat', { room });
    }
  }, [connected, room, emit]);

  // Listen for messages
  useEffect(() => {
    if (!connected) return;

    const cleanupMessage = on('chat_message', (message) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    });

    const cleanupTyping = on('user_typing', (data) => {
      setIsTyping(data.isTyping);
    });

    return () => {
      cleanupMessage();
      cleanupTyping();
    };
  }, [connected, on]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || !connected) return;

    emit('send_message', {
      room,
      message: inputMessage
    });

    setInputMessage('');
  };

  const handleTyping = () => {
    emit('typing', { room, isTyping: true });
    
    setTimeout(() => {
      emit('typing', { room, isTyping: false });
    }, 1000);
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>Chat - {room}</h3>
        <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.isOwn ? 'own' : ''}`}>
            <div className="message-author">{msg.username}</div>
            <div className="message-content">{msg.text}</div>
            <div className="message-time">{new Date(msg.timestamp).toLocaleTimeString()}</div>
          </div>
        ))}
        {isTyping && (
          <div className="typing-indicator">Someone is typing...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => {
            setInputMessage(e.target.value);
            handleTyping();
          }}
          placeholder="Type a message..."
          disabled={!connected}
        />
        <button type="submit" disabled={!connected || !inputMessage.trim()}>
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
```

### 7.4 Real-time Notifications

```javascript
// src/hooks/useNotifications.js
import { useState, useEffect } from 'react';
import useSocket from './useSocket';

const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const { connected, on } = useSocket();

  useEffect(() => {
    if (!connected) return;

    const cleanup = on('notification', (notification) => {
      console.log('🔔 New notification:', notification);
      
      setNotifications(prev => [notification, ...prev]);
      
      // Show browser notification if permitted
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icon.png'
        });
      }
    });

    return cleanup;
  }, [connected, on]);

  const markAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId
          ? { ...notif, read: true }
          : notif
      )
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    clearAll
  };
};

export default useNotifications;

// Notification Component
const NotificationCenter = () => {
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="notification-center">
      <button
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
      >
        🔔
        {unreadCount > 0 && (
          <span className="badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h4>Notifications</h4>
            <button onClick={clearAll}>Clear All</button>
          </div>
          
          <div className="notification-list">
            {notifications.length === 0 ? (
              <p className="empty">No notifications</p>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  className={`notification-item ${notif.read ? 'read' : 'unread'}`}
                  onClick={() => markAsRead(notif.id)}
                >
                  <div className="notification-title">{notif.title}</div>
                  <div className="notification-message">{notif.message}</div>
                  <div className="notification-time">
                    {new Date(notif.timestamp).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## SECȚIUNEA 8: GESTIONAREA ERORILOR {#sectiunea-9}

### 8.1 Structura Răspunsurilor de Eroare

Toate endpoint-urile returnează erori într-un format consistent:

```json
{
  "success": false,
  "status": 400,
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

### 8.2 HTTP Status Codes Complete

| Code | Status | Când apare | Acțiune recomandată |
|------|--------|------------|---------------------|
| 200 | OK | Request executat cu succes | Procesează response data |
| 201 | Created | Resursă creată cu succes | Redirect sau refresh |
| 400 | Bad Request | Date invalide în request | Afișează erori de validare |
| 401 | Unauthorized | Token lipsă sau invalid | Refresh token sau redirect la login |
| 403 | Forbidden | Permisiuni insuficiente | Afișează mesaj "Access Denied" |
| 404 | Not Found | Resursa nu există | Afișează "Not Found" |
| 409 | Conflict | Conflict (ex: username existent) | Afișează eroare specifică |
| 422 | Unprocessable Entity | Business logic validation error | Afișează erori de business |
| 429 | Too Many Requests | Rate limit depășit | Așteaptă și retry |
| 500 | Internal Server Error | Eroare server | Afișează "Server Error", retry |
| 503 | Service Unavailable | Serviciu temporar indisponibil | Retry după delay |

### 8.3 Global Error Handler (React)

```javascript
// src/utils/errorHandler.js
import { toast } from 'react-toastify';

export class APIError extends Error {
  constructor(status, message, errors = []) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.name = 'APIError';
  }
}

export const handleAPIError = (error) => {
  if (error.response) {
    const { status, data } = error.response;

    switch (status) {
      case 400:
        // Validation errors
        if (data.errors && Array.isArray(data.errors)) {
          data.errors.forEach(err => {
            toast.error(`${err.field}: ${err.message}`);
          });
        } else {
          toast.error(data.message || 'Invalid request');
        }
        break;

      case 401:
        // Unauthorized - handled by axios interceptor
        toast.error('Session expired. Please login again.');
        break;

      case 403:
        toast.error('You do not have permission to perform this action');
        break;

      case 404:
        toast.error('Resource not found');
        break;

      case 409:
        toast.error(data.message || 'Conflict occurred');
        break;

      case 422:
        toast.error(data.message || 'Validation failed');
        break;

      case 429:
        toast.error('Too many requests. Please try again later.');
        break;

      case 500:
        toast.error('Server error. Please try again later.');
        break;

      case 503:
        toast.error('Service temporarily unavailable');
        break;

      default:
        toast.error(data.message || 'An error occurred');
    }

    throw new APIError(status, data.message, data.errors);
  } else if (error.request) {
    // Network error
    toast.error('Network error. Please check your connection.');
    throw new Error('Network error');
  } else {
    // Unknown error
    toast.error('An unexpected error occurred');
    throw error;
  }
};

// Usage în API calls
import { handleAPIError } from '../utils/errorHandler';

const fetchData = async () => {
  try {
    const response = await api.get('/endpoint');
    return response.data;
  } catch (error) {
    handleAPIError(error);
  }
};
```

---

## SECȚIUNEA 9: BEST PRACTICES ȘI SECURITATE {#sectiunea-10}

### 9.1 JWT Token Storage Best Practices

**❌ NU FACE:**
```javascript
// NU stoca token-uri în localStorage (vulnerabil la XSS)
localStorage.setItem('token', token);

// NU include token-uri în URL
window.location.href = `/dashboard?token=${token}`;

// NU loga token-uri
console.log('Token:', token);
```

**✅ FACE:**
```javascript
// Folosește httpOnly cookies pentru refresh token (backend-set)
// localStorage doar pentru access token (lifetime scurt - 24h)
localStorage.setItem('access_token', accessToken);

// Șterge token-uri la logout
const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  // Call backend logout endpoint
  api.post('/auth/logout');
};
```

### 9.2 Input Validation

```javascript
// src/utils/validation.js
import { z } from 'zod';

export const LoginSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long'),
  auth_code: z.string()
    .length(6, 'Auth code must be 6 digits')
    .regex(/^\d+$/, 'Auth code must contain only digits')
    .optional()
});

export const RegisterSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[!@#$%^&*]/, 'Must contain special character'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

// Usage
const validateLogin = (data) => {
  try {
    LoginSchema.parse(data);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      errors: error.errors.map(e => ({
        field: e.path[0],
        message: e.message
      }))
    };
  }
};
```

### 9.3 XSS Protection

```javascript
// Sanitize user input
import DOMPurify from 'dompurify';

const sanitizeInput = (input) => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
    ALLOWED_ATTR: []
  });
};

// Safe rendering
const UserComment = ({ comment }) => (
  <div
    dangerouslySetInnerHTML={{
      __html: sanitizeInput(comment)
    }}
  />
);

// Prefer text content when possible
const SafeDisplay = ({ text }) => (
  <div>{text}</div>  // React automatically escapes
);
```

### 9.4 CSRF Protection

```javascript
// Backend setează CSRF token în cookie
// Frontend trimite token în header

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

api.interceptors.request.use(config => {
  const csrfToken = getCookie('csrf_token');
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});
```

---

## SECȚIUNEA 10: TESTING ȘI DEBUGGING {#sectiunea-11}

### 10.1 API Testing cu Postman

**Collection Setup:**

1. **Create Environment:**
```json
{
  "base_url": "https://backend.jackpotx.net/api",
  "access_token": "",
  "refresh_token": "",
  "user_id": ""
}
```

2. **Pre-request Script (pentru auth):**
```javascript
const token = pm.environment.get("access_token");
if (token) {
  pm.request.headers.add({
    key: "Authorization",
    value: `Bearer ${token}`
  });
}
```

3. **Test Script (save token):**
```javascript
if (pm.response.code === 200) {
  const response = pm.response.json();
  if (response.token) {
    pm.environment.set("access_token", response.token.access_token);
    pm.environment.set("refresh_token", response.token.refresh_token);
  }
}
```

### 10.2 Health Checks

```bash
# Basic health check
curl https://backend.jackpotx.net/health

# Detailed health check
curl https://backend.jackpotx.net/health/detailed

# Response example:
{
  "status": "healthy",
  "timestamp": "2025-11-14T10:00:00Z",
  "uptime": 86400,
  "database": {
    "postgresql": "connected",
    "mongodb": "connected"
  },
  "memory": {
    "used": "512MB",
    "free": "1024MB"
  },
  "cpu": "15%"
}
```

---

## SECȚIUNEA 11: DEPLOYMENT PRODUCTION {#sectiunea-12}

### 11.1 Environment Variables Production

```bash
# .env.production
NODE_ENV=production
PORT=3004

# Database (use production credentials)
DB_HOST=production-db-host.example.com
DB_PORT=5432
DB_USER=jackpotx_prod
DB_PASS='STRONG_PRODUCTION_PASSWORD'
DB_NAME=jackpotx_production

# JWT Secrets (GENERATE NEW!)
JWT_ACCESS_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)

# Rate Limiting (Enable in production)
RATE_LIMIT_STANDARD_MAX=100
RATE_LIMIT_STANDARD_WINDOW_MS=900000
RATE_LIMIT_STRICT_MAX=10
RATE_LIMIT_STRICT_WINDOW_MS=60000
RATE_LIMIT_AUTH_MAX=5
RATE_LIMIT_AUTH_WINDOW_MS=900000
```

### 11.2 Nginx Configuration

```nginx
# /etc/nginx/sites-available/jackpotx-backend

upstream backend {
    least_conn;
    server 127.0.0.1:3004;
    # Add more instances for load balancing
    # server 127.0.0.1:3005;
    # server 127.0.0.1:3006;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name backend.jackpotx.net;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name backend.jackpotx.net;

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/backend.jackpotx.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/backend.jackpotx.net/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/backend-access.log;
    error_log /var/log/nginx/backend-error.log;

    # Proxy to Node.js backend
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files (if any)
    location /uploads/ {
        alias /var/www/html/backend.jackpotx.net/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 11.3 PM2 Process Manager

```bash
# Install PM2 globally
npm install -g pm2

# Start application with PM2
pm2 start dist/index.js --name jackpotx-backend

# Or use ecosystem file
pm2 start ecosystem.config.js
```

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'jackpotx-backend',
    script: './dist/index.js',
    instances: 4,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3004
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
```

---

## 🎉 FINAL - Documentație Completă!

Această documentație acoperă **COMPLET** integrarea backend-ului JackpotX:

✅ **Arhitectură completă** - toate cele 43 servicii, 40+ routes  
✅ **Setup development** - pas cu pas  
✅ **Autentificare completă** - JWT, 2FA, RBAC  
✅ **Frontend jucători** - toate API-urile cu exemple  
✅ **Panou admin** - toate endpoint-urile admin  
✅ **WebSocket** - real-time features complete  
✅ **Gestionarea erorilor** - error handling complet  
✅ **Best practices** - securitate și validare  
✅ **Testing** - Postman, health checks  
✅ **Deployment** - Nginx, PM2, production ready  

**Total: 2700+ linii de documentație completă!**

---

**© 2025 Oniacor Tech SRL - JackpotX Platform**

