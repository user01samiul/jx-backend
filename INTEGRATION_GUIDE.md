# 🚀 JACKPOTX ENTERPRISE - INTEGRATION GUIDE

## 📋 Quick Start

### 1. Run Database Migrations

```bash
cd /var/www/html/backend.jackpotx.net
chmod +x run_all_migrations.sh
./run_all_migrations.sh
```

This will create all necessary tables for:
- ✅ Responsible Gaming (Deposit Limits, Self-Exclusion, etc.)
- ✅ Multilanguage System (10 languages, 100+ translations)
- ✅ Enhanced Player Status (Granular permissions)
- ✅ Metadata (Currencies, Countries, Mobile Prefixes)
- ✅ CMS System (Pages, Components, Banners)
- ✅ IP Tracking & Security
- ✅ Marketing Preferences (GDPR)

### 2. Integrate Enterprise Routes

Open your main `index.ts` or `server.ts` and add:

```typescript
// Import enterprise routes
import { setupEnterpriseRoutes } from './routes/index.enterprise';
import { startAllEnterpriseCronJobs } from './services/cron/enterprise-cron.service';

// ... your existing code ...

// Setup enterprise features (BEFORE starting the server)
setupEnterpriseRoutes(app);

// Start cron jobs
startAllEnterpriseCronJobs();

// Then start your server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

### 3. Update Your Auth Middleware (OPTIONAL but RECOMMENDED)

To automatically track IPs on login/register, ensure your auth routes use the IP tracking middleware:

```typescript
import { trackIP } from './middlewares/ip-tracking.middleware';

// In your auth routes
router.post('/login', trackIP('LOGIN'), loginController);
router.post('/register', trackIP('REGISTER'), registerController);
```

### 4. Restart Your Server

```bash
# If using PM2
pm2 restart jackpotx-backend

# If running manually
npm run dev
# or
npm start
```

---

## 🔌 API ENDPOINTS

All new endpoints are available under:

### Metadata APIs (Public)
```
GET /api/metadata/currencies
GET /api/metadata/currencies/:code
GET /api/metadata/countries
GET /api/metadata/countries/:code
GET /api/metadata/countries/:code/restricted
GET /api/metadata/mobile-prefixes
GET /api/metadata/mobile-prefixes/country/:code
GET /api/metadata/mobile-prefixes/:prefix/country
```

### Multilanguage APIs (Public)
```
GET /api/multilanguage/languages
GET /api/multilanguage/translations?lang={code}&category={category}
GET /api/multilanguage/translations/grouped?lang={code}
GET /api/multilanguage/translation/:key?lang={code}
POST /api/multilanguage/user/preferred-language [Auth Required]
GET /api/multilanguage/user/preferred-language [Auth Required]
```

### Responsible Gaming APIs (Private - Authentication Required)
```
POST /api/responsible-gaming/deposit-limits
PUT /api/responsible-gaming/deposit-limits
GET /api/responsible-gaming/deposit-limits
GET /api/responsible-gaming/deposit-limits/grouped
POST /api/responsible-gaming/deposit-limits/check
DELETE /api/responsible-gaming/deposit-limits/:limitType
GET /api/responsible-gaming/deposit-limits/history

POST /api/responsible-gaming/self-exclusion
GET /api/responsible-gaming/self-exclusion
GET /api/responsible-gaming/self-exclusion/status
POST /api/responsible-gaming/self-exclusion/revoke
GET /api/responsible-gaming/self-exclusion/history
```

---

## 🧪 TESTING

### Test Metadata APIs
```bash
# Get all currencies
curl http://localhost:3004/api/metadata/currencies

# Get all countries
curl http://localhost:3004/api/metadata/countries

# Get mobile prefixes
curl http://localhost:3004/api/metadata/mobile-prefixes
```

### Test Multilanguage APIs
```bash
# Get all languages
curl http://localhost:3004/api/multilanguage/languages

# Get Spanish translations
curl http://localhost:3004/api/multilanguage/translations?lang=es

# Get grouped translations
curl http://localhost:3004/api/multilanguage/translations/grouped?lang=en
```

### Test Responsible Gaming APIs (Need Auth Token)
```bash
# Create deposit limit
curl -X POST http://localhost:3004/api/responsible-gaming/deposit-limits \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "limit_type": "DAILY",
    "amount": 1000,
    "currency": "USD"
  }'

# Get limits grouped
curl -X GET http://localhost:3004/api/responsible-gaming/deposit-limits/grouped \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check if deposit allowed
curl -X POST http://localhost:3004/api/responsible-gaming/deposit-limits/check \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "currency": "USD"
  }'
```

---

## 🕐 CRON JOBS

The following automated tasks run in the background:

| Job | Schedule | Description |
|-----|----------|-------------|
| Deposit Limits Reset | Every hour | Resets expired deposit limits |
| Self-Exclusion Expiry | Daily at midnight | Expires self-exclusions |
| Auto-Publish Pages | Every 15 minutes | Publishes scheduled CMS pages |
| Auto-Archive Pages | Daily at 1 AM | Archives expired pages |
| Delete Expired Banners | Daily at 2 AM | Deletes expired banners |
| Clear Translation Cache | Every 6 hours | Clears translation cache |
| Restore Expired Statuses | Every hour | Restores temporary status changes |
| Update Exchange Rates | Daily at 3 AM | Updates currency exchange rates |

---

## 🔒 SECURITY FEATURES

### IP Tracking
All requests are automatically tracked with:
- IP address
- User agent
- Action (LOGIN, REGISTER, DEPOSIT, etc.)
- GeoIP data (country, city)
- Risk scoring (VPN/Proxy detection)

### Blocked IPs
Suspicious IPs are automatically flagged and can be blocked.

### Geo-Restrictions
Countries can be restricted (for licensing compliance).

---

## 📖 DOCUMENTATION

For complete documentation, see:
- **READ_ADDONS.md** - Complete guide for frontend & admin developers
- **API Documentation** - Available at http://localhost:3004/api-docs (if Swagger enabled)

---

## 🆘 TROUBLESHOOTING

### Migrations Failed
```bash
# Check PostgreSQL connection
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db -c "SELECT 1"

# Re-run specific migration
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db -f src/db/migrations/020_create_responsible_gaming_limits.sql
```

### Routes Not Working
```bash
# Check if routes are registered
# Look for these in console output:
# ✅ Metadata APIs: /api/metadata/*
# ✅ Multilanguage APIs: /api/multilanguage/*
# ✅ Responsible Gaming APIs: /api/responsible-gaming/*
```

### Cron Jobs Not Running
```bash
# Check if node-cron is installed
npm list node-cron

# If not installed
npm install node-cron @types/node-cron
```

---

## 📞 SUPPORT

For issues or questions:
1. Check logs in `/var/www/html/backend.jackpotx.net/logs/`
2. Review **READ_ADDONS.md** for detailed implementation guides
3. Test API endpoints using Postman or curl

---

## ✅ CHECKLIST

- [ ] Database migrations completed successfully
- [ ] Enterprise routes integrated in index.ts
- [ ] Cron jobs started
- [ ] Server restarted
- [ ] API endpoints tested (metadata, multilanguage, responsible-gaming)
- [ ] Frontend developer received READ_ADDONS.md
- [ ] Admin developer received READ_ADDONS.md

**All Done!** 🎉 Your backend is now **ENTERPRISE-LEVEL**!
