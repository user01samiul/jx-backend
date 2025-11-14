# ADVANCED PLAYER SEGMENTATION - 300+ Dynamic Filters

**JackpotX CRM - BetConstruct-Style Segmentation System**

## Overview

Sistem avansat de segmentare a jucătorilor cu **300+ filtre dinamice** și capacitatea de a crea intersecții complexe între filtre folosind logică AND/OR.

Bazat complet pe datele existente în PostgreSQL, fără dependențe externe.

---

## 📊 Categorii de Filtre (8 categorii principale)

### 1. **DEMOGRAPHIC FILTERS** (30+ filtre)
- **Locație**: Country, City, Nationality, Timezone, Postal Code
- **Date personale**: Age, Gender, Birth Month/Day, Marital Status
- **Contact**: Language, Email Verified, Phone Verified, Marketing Consent
- **Sursă**: Registration Source, Registration Device, Affiliate ID
- **Status**: Account Status, Account Age (days), User Tags

### 2. **FINANCIAL FILTERS** (50+ filtre)
- **Balanțe**: Current Balance, Bonus Balance, Locked Balance
- **Depozite**: Total Deposited, Deposit Count, Avg Deposit Amount, Largest Deposit
- **Retrageri**: Total Withdrawn, Withdrawal Count, Avg Withdrawal Amount
- **Metrici**: Net Deposits, Deposit/Withdrawal Ratio, Cashout Percentage
- **LTV & Revenue**: LTV (Lifetime Value), GGR (Gross Gaming Revenue), NGR (Net Gaming Revenue)
- **Comportament**: Days Since Last Deposit, Deposit Frequency, Preferred Payment Method
- **Tendințe**: Monthly/Quarterly/Yearly Deposits, Balance Trend, Redeposit Rate

### 3. **GAMING FILTERS** (60+ filtre)
- **Statistici generale**: Total Wagered, Total Won, Total Bets, Win/Loss Ratio
- **Pariuri**: Avg Bet Amount, Largest Bet, Largest Win, Win Rate %
- **Preferințe jocuri**: Favorite Game Category, Favorite Provider, Unique Games Played
- **Categorii jocuri**: Slots Wagered, Live Casino Wagered, Table Games Wagered
- **Sesiuni**: Avg Session Duration, Total Sessions, Sessions Last 30 Days
- **Comportament**: Time of Day Preference, Day of Week Preference, Mobile vs Desktop
- **Risc**: Recovery Betting Detected, Chase Losses Indicator, Bet Escalation Pattern
- **RG (Responsible Gaming)**: RG Limits Set, Self Exclusion History

### 4. **VIP & LOYALTY FILTERS** (40+ filtre)
- **VIP Status**: VIP Tier, VIP Level, VIP Points, Lifetime Points
- **Beneficii**: VIP Benefits Claimed, Cashback Claimed, Gifts Received
- **Account Manager**: Has Account Manager, Manager Assignment
- **Comp Points**: Comp Points Balance, Points Redeemed, Redemption Rate
- **Loyalty**: Loyalty Score, Loyalty Level, Program Tenure
- **Referral**: Referral Count, Successful Referrals, Referral Earnings
- **Promoții**: Birthday/Anniversary Bonus Claimed, Special Events Attended

### 5. **RISK & COMPLIANCE FILTERS** (30+ filtre)
- **KYC**: KYC Status, Verification Level, Is Verified, Documents Pending/Rejected
- **AML**: AML Risk Score, AML Risk Level, PEP Status, Sanctions List Match
- **Fraud**: Fraud Score, Fraud Flags, Multi-Account Risk, Suspicious Activity
- **Churn**: Churn Risk Score, Churn Risk Level, Engagement Score, Activity Level
- **Problem Gambling**: Problem Gambling Indicators, RG Alerts, Limit Breaches
- **Restricții**: Account Restrictions, Self Exclusion Status, Cooling Off Periods

### 6. **ENGAGEMENT & COMMUNICATION FILTERS** (40+ filtre)
- **Login**: Last Login Date, Days Since Last Login, Login Frequency, Total Logins
- **Email**: Email Open Rate, Click Rate, Emails Sent/Opened, Last Email Opened
- **SMS & Push**: SMS Sent/Clicked, Push Notifications Sent/Opened
- **Support**: Support Tickets Count, Open Tickets, Ticket Satisfaction
- **Comunicare**: Unsubscribed From Email/SMS, Communication Response Rate
- **Feedback**: NPS Score, CSAT Score, Survey Responses, Feedback Submitted
- **Promoții**: Promotion Participation Rate, Promotions Claimed

### 7. **TEMPORAL FILTERS** (30+ filtre)
- **Activitate recentă**: Active Today, Active Yesterday, Active Last 7/30 Days
- **Stare**: Is Dormant, Reactivated in Last 30 Days, Dormant Days
- **Lifecycle**: Player Lifecycle Stage (new, active, engaged, at_risk, dormant, churned)
- **Cohorte**: Registration Month/Year Cohort
- **Evenimente**: First Deposit Today/Last 7 Days, No Deposit in 30/60 Days
- **Speciale**: Birthday This Month, Days Until Birthday, Anniversary This Month

### 8. **CUSTOM FILTERS** (20+ filtre)
- **Tag-uri**: Tagged as VIP, Whale, High Risk, Loyal
- **Status special**: Blacklisted, Whitelisted, Priority Player, Test Account
- **Custom Fields**: 5 custom fields configurabile
- **Note**: Internal Notes Contain (keyword search)
- **Rating**: Internal Rating (1-10)

---

## 🔧 Operatori Disponibili

Fiecare filtru suportă următorii operatori (în funcție de tipul de date):

### Operatori Numerici
- `equals` - Egal cu
- `not_equals` - Diferit de
- `greater_than` - Mai mare decât
- `greater_than_or_equal` - Mai mare sau egal cu
- `less_than` - Mai mic decât
- `less_than_or_equal` - Mai mic sau egal cu
- `between` - Între două valori

### Operatori Text
- `equals` - Egal exact
- `not_equals` - Diferit de
- `contains` - Conține
- `not_contains` - Nu conține
- `starts_with` - Începe cu
- `ends_with` - Se termină cu

### Operatori Lista
- `in` - Este în listă
- `not_in` - Nu este în listă

### Operatori Null
- `is_null` - Este NULL
- `is_not_null` - Nu este NULL

### Operatori Temporali
- `in_last` - În ultimele X zile/luni
- `not_in_last` - Nu în ultimele X zile/luni
- `between` - Între două date

---

## 📡 API Endpoints

### 1. **GET /api/admin/crm/segmentation/filters**
Returnează toate filtrele disponibile (300+) cu metadata

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 300,
    "categories": ["demographic", "financial", "gaming", "vip", "risk", "engagement", "temporal", "custom"],
    "filters": [
      {
        "field": "country",
        "label": "Country",
        "category": "demographic",
        "operators": ["equals", "not_equals", "in", "not_in"],
        "valueType": "string"
      },
      // ... 299 more filters
    ]
  }
}
```

### 2. **POST /api/admin/crm/segmentation/preview**
Preview segment (număr jucători + sample)

**Request:**
```json
{
  "filters": [
    {
      "category": "financial",
      "field": "total_deposited",
      "operator": "greater_than",
      "value": 1000,
      "logicOperator": "AND"
    },
    {
      "category": "gaming",
      "field": "days_since_last_bet",
      "operator": "less_than",
      "value": 7,
      "logicOperator": "AND"
    }
  ],
  "limit": 100
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalPlayers": 1247,
    "playerIds": [72, 145, 289, ...],
    "samplePlayers": [
      {
        "id": 72,
        "username": "alexdemo",
        "email": "alex@demo.com",
        "country": "RO",
        "vip_tier": "Gold",
        "current_balance": "2088.54",
        "total_deposited": "5000.00",
        "total_wagered": "12500.00"
      },
      // ... more players
    ],
    "filtersSummary": {
      "totalFilters": 2,
      "categories": ["financial", "gaming"]
    }
  }
}
```

### 3. **POST /api/admin/crm/segmentation/query**
Execută query cu paginare

**Request:**
```json
{
  "filters": [...],
  "page": 1,
  "limit": 100
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "players": [...],
    "total": 1247,
    "page": 1,
    "limit": 100,
    "totalPages": 13
  }
}
```

### 4. **POST /api/admin/crm/segmentation/save**
Salvează segment pentru refolosire

**Request:**
```json
{
  "name": "High Value Active Players",
  "description": "Players with >$1000 deposits and active in last 7 days",
  "filters": [...],
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Segment saved successfully",
  "data": {
    "segmentId": 15,
    "playerCount": 1247
  }
}
```

### 5. **GET /api/admin/crm/segmentation/saved**
Listează toate segmentele salvate

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 15,
      "name": "High Value Active Players",
      "description": "...",
      "filters": [...],
      "player_count": 1247,
      "created_at": "2025-01-08T21:00:00Z",
      "last_refreshed_at": "2025-01-08T21:30:00Z"
    },
    // ... more segments
  ]
}
```

### 6. **POST /api/admin/crm/segmentation/export**
Export segment (JSON sau CSV)

**Request:**
```json
{
  "filters": [...],
  "format": "json" // or "csv"
}
```

**Response (JSON):**
```json
{
  "success": true,
  "data": {
    "totalPlayers": 1247,
    "playerIds": [72, 145, 289, ...],
    "exportedAt": "2025-01-08T21:45:00Z"
  }
}
```

**Response (CSV):**
```
ID,Username,Email,Country,VIP Tier,Current Balance,Total Deposited,Total Wagered
72,"alexdemo","alex@demo.com","RO","Gold",2088.54,5000.00,12500.00
...
```

### 7. **POST /api/admin/crm/segmentation/analyze**
Analizează segment (demografii, metrici agregate)

**Request:**
```json
{
  "filters": [...]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalPlayers": 1247,
    "demographics": {
      "countries": { "RO": 450, "IT": 320, "DE": 277, ... },
      "vipTiers": { "Gold": 150, "Silver": 400, "Bronze": 697 },
      "kycStatuses": { "verified": 1100, "pending": 100, "not_started": 47 }
    },
    "financial": {
      "avgBalance": 1250.45,
      "avgDeposited": 2500.00,
      "totalDeposited": 3116250.00,
      "totalWithdrawn": 2450000.00
    },
    "gaming": {
      "avgWagered": 8500.00,
      "totalWagered": 10597500.00,
      "totalWon": 9200000.00
    },
    "risk": {
      "churnRiskDistribution": { "low": 800, "medium": 350, "high": 97 },
      "avgChurnScore": 35.2
    }
  }
}
```

---

## 💻 Exemple de Utilizare

### Exemplu 1: High Rollers Inactivi
```json
{
  "filters": [
    {
      "category": "financial",
      "field": "total_deposited",
      "operator": "greater_than",
      "value": 10000,
      "logicOperator": "AND"
    },
    {
      "category": "temporal",
      "field": "days_since_last_deposit",
      "operator": "greater_than",
      "value": 30,
      "logicOperator": "AND"
    },
    {
      "category": "vip",
      "field": "vip_tier",
      "operator": "in",
      "value": ["Platinum", "Diamond"],
      "logicOperator": "AND"
    }
  ]
}
```

### Exemplu 2: Risc de Churn - Jucători Valoroși
```json
{
  "filters": [
    {
      "category": "risk",
      "field": "churn_risk_level",
      "operator": "in",
      "value": ["high", "critical"],
      "logicOperator": "AND"
    },
    {
      "category": "financial",
      "field": "ltv",
      "operator": "greater_than",
      "value": 5000,
      "logicOperator": "AND"
    },
    {
      "category": "engagement",
      "field": "days_since_last_login",
      "operator": "between",
      "value": [7, 30],
      "logicOperator": "AND"
    }
  ]
}
```

### Exemplu 3: New Players - Onboarding Target
```json
{
  "filters": [
    {
      "category": "temporal",
      "field": "new_player",
      "operator": "equals",
      "value": true,
      "logicOperator": "AND"
    },
    {
      "category": "financial",
      "field": "first_deposit_last_7_days",
      "operator": "equals",
      "value": true,
      "logicOperator": "AND"
    },
    {
      "category": "risk",
      "field": "kyc_status",
      "operator": "not_equals",
      "value": "verified",
      "logicOperator": "AND"
    }
  ]
}
```

### Exemplu 4: Slots Enthusiasts - Cross-sell to Live Casino
```json
{
  "filters": [
    {
      "category": "gaming",
      "field": "slots_percentage",
      "operator": "greater_than",
      "value": 80,
      "logicOperator": "AND"
    },
    {
      "category": "gaming",
      "field": "live_casino_wagered",
      "operator": "equals",
      "value": 0,
      "logicOperator": "AND"
    },
    {
      "category": "temporal",
      "field": "active_last_7_days",
      "operator": "equals",
      "value": true,
      "logicOperator": "AND"
    }
  ]
}
```

---

## 🗄️ Structură Bază de Date

### Tabel `advanced_segments`
```sql
CREATE TABLE advanced_segments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  filters JSONB NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  player_count INTEGER DEFAULT 0,
  last_refreshed_at TIMESTAMP
);
```

### Tabel `segment_executions` (audit log)
```sql
CREATE TABLE segment_executions (
  id SERIAL PRIMARY KEY,
  advanced_segment_id INTEGER REFERENCES advanced_segments(id),
  executed_by INTEGER REFERENCES users(id),
  executed_at TIMESTAMP DEFAULT NOW(),
  player_count INTEGER,
  execution_time_ms INTEGER,
  filters_used JSONB,
  export_format VARCHAR(50),
  success BOOLEAN DEFAULT true,
  error_message TEXT
);
```

### Tabel `segment_campaigns` (campanii de marketing)
```sql
CREATE TABLE segment_campaigns (
  id SERIAL PRIMARY KEY,
  advanced_segment_id INTEGER REFERENCES advanced_segments(id),
  campaign_name VARCHAR(255) NOT NULL,
  campaign_type VARCHAR(100), -- email, sms, push, bonus
  status VARCHAR(50) DEFAULT 'draft',
  scheduled_at TIMESTAMP,
  executed_at TIMESTAMP,
  target_player_count INTEGER,
  reached_player_count INTEGER,
  conversion_count INTEGER,
  conversion_rate DECIMAL(5,2),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎯 Use Cases

### 1. **Retention Campaigns**
- Segment: "Jucători cu risc înalt de churn dar cu LTV > $1000"
- Acțiune: Email personalizat cu bonus 50% + free spins
- Target: Reducere churn rate cu 30%

### 2. **VIP Upsell**
- Segment: "Jucători apropape de next VIP tier (sub 100 puncte)"
- Acțiune: Notificare push cu beneficiile tier-ului următor
- Target: Creștere VIP conversion cu 25%

### 3. **Cross-sell**
- Segment: "Slot players care nu au jucat niciodată Live Casino"
- Acțiune: Free bet $10 pentru Live Roulette
- Target: Diversificare gaming portfolio

### 4. **Re-engagement**
- Segment: "Jucători dormant 60-90 zile, cu istoric de $2000+ deposits"
- Acțiune: Win-back offer cu match bonus 100% up to $500
- Target: Reactivare 15% din jucători dormanți

### 5. **Compliance**
- Segment: "Jucători cu deposit spikes + chase losses indicators"
- Acțiune: Trigger manual review + RG intervention
- Target: Responsible gaming protection

---

## 📈 Performance & Optimization

- **Query Optimization**: Indexes pe coloanele frecvent filtrate (country, vip_tier, kyc_status)
- **Caching**: Segment results cache pentru 15 minute
- **Pagination**: Suport pentru paginare (max 10,000 players per query)
- **Export Limits**: CSV export limitat la 50,000 records
- **Execution Tracking**: Toate queries sunt loggate în `segment_executions`

---

## 🔐 Securitate & Permisiuni

- **Authentication**: JWT token obligatoriu
- **Authorization**: Doar Admin & Manager roles
- **Rate Limiting**: 100 requests/minut per user
- **Audit Log**: Toate segmentările sunt loggate cu user_id + timestamp
- **Data Privacy**: Nu exportăm date sensibile (password, tokens, etc.)

---

## 📚 Structură Fișiere

```
backend.jackpotx.net/
├── src/
│   ├── services/
│   │   └── crm/
│   │       └── segmentationService.ts (300+ filters logic)
│   ├── controllers/
│   │   └── admin/
│   │       └── segmentationController.ts (API handlers)
│   └── routes/
│       └── admin/
│           └── segmentationRoutes.ts (API routes)
├── dist/ (compiled JS)
└── ADVANCED_SEGMENTATION_GUIDE.md (acest document)
```

---

## 🚀 Next Steps

1. **Frontend Integration**: React UI pentru filter builder
2. **Scheduled Segments**: Cron job pentru auto-refresh segmente
3. **Campaign Automation**: Trigger automat de campanii pe segment match
4. **AI Predictions**: ML model pentru churn prediction scoring
5. **Real-time Updates**: WebSocket pentru live segment updates

---

**Creat**: 2025-01-08
**Versiune**: 1.0
**Autor**: Claude AI + SuperAdmin
**Status**: ✅ Production Ready

---

## Support

Pentru întrebări sau probleme:
1. Check logs: `sudo -u ubuntu pm2 logs backend`
2. Database schema: `\d advanced_segments` în psql
3. API testing: Postman collection disponibilă

**Toate filtrele sunt bazate 100% pe date reale din PostgreSQL - ZERO hardcoded data!**
