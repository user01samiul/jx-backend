# 🎯 ENTERPRISE FEATURES - Complete Documentation

## Overview

Această platformă include toate feature-urile enterprise pe care EveryMatrix le oferă, implementate complet și funcțional.

---

## 📊 Database Schema

Toate tabelele au fost create în PostgreSQL:

### Challenges System
- `challenge_templates` - Template-uri pentru provocări
- `player_challenges` - Provocările active ale jucătorilor

### Loyalty System
- `loyalty_tiers` - Nivelurile de loialitate (Bronze, Silver, Gold, Platinum, Diamond)
- `player_loyalty` - Statusul de loialitate al fiecărui jucător
- `loyalty_point_transactions` - Istoric puncte loialitate
- `loyalty_shop_items` - Premii disponibile în shop
- `loyalty_shop_purchases` - Achiziții din shop

### Mini-Games (Prize Engine)
- `mini_game_types` - Tipuri de jocuri (Wheel, Mystery Chest, Dice, etc.)
- `mini_game_prizes` - Premii configurabile cu probabilități
- `player_mini_game_plays` - Istoric jocuri jucate
- `player_mini_game_spins` - Cooldown tracking

### Personal Jackpots
- `personal_jackpot_configs` - Configurații jackpot
- `player_personal_jackpots` - Jackpot-uri active per jucător
- `personal_jackpot_wins` - Istoric câștiguri jackpot

### Risk Management
- `risk_rules` - Reguli de risc
- `risk_events` - Evenimente de risc detectate
- `player_risk_scores` - Scoruri de risc per jucător

### Custom Reports
- `custom_reports` - Definiții rapoarte SQL
- `report_executions` - Istoric execuții rapoarte

---

## 🔌 API Endpoints

### 1. CHALLENGES SYSTEM

#### Player Endpoints (Authenticated)
```
GET    /api/challenges/my-challenges
GET    /api/challenges/available
POST   /api/challenges/claim/:challengeId
```

#### Admin Endpoints
```
GET    /api/challenges/admin/templates
GET    /api/challenges/admin/templates/:id
POST   /api/challenges/admin/templates
PUT    /api/challenges/admin/templates/:id
DELETE /api/challenges/admin/templates/:id
POST   /api/challenges/admin/assign
POST   /api/challenges/admin/auto-assign
POST   /api/challenges/admin/expire
```

#### Challenge Types
- `DEPOSIT` - Depune X suma
- `WAGER` - Pariază X suma
- `GAME_PLAY` - Joacă X jocuri
- `WIN_COUNT` - Câștigă X runde
- `STREAK` - Serie de X câștiguri consecutive
- `TOURNAMENT` - Participă la turnee
- `REFERRAL` - Referă X prieteni

#### Reward Types
- `CASH` - Bani reali
- `BONUS` - Bonus bani
- `FREE_SPINS` - Rotiri gratuite
- `LOYALTY_POINTS` - Puncte loialitate

---

### 2. LOYALTY SYSTEM

#### Player Endpoints
```
GET    /api/loyalty/my-status
GET    /api/loyalty/tiers
GET    /api/loyalty/transactions
GET    /api/loyalty/leaderboard
GET    /api/loyalty/shop
GET    /api/loyalty/shop/:id
POST   /api/loyalty/shop/purchase/:id
GET    /api/loyalty/my-purchases
```

#### Admin Endpoints
```
POST   /api/loyalty/admin/tiers
PUT    /api/loyalty/admin/tiers/:id
POST   /api/loyalty/admin/shop/items
PUT    /api/loyalty/admin/shop/items/:id
POST   /api/loyalty/admin/points/add
POST   /api/loyalty/admin/points/deduct
GET    /api/loyalty/admin/shop/items
```

#### Loyalty Tiers (Default)
1. **Bronze** - 0+ points (1% cashback, 1x multiplier)
2. **Silver** - 1,000+ points (2% cashback, 1.2x multiplier)
3. **Gold** - 5,000+ points (3% cashback, 1.5x multiplier)
4. **Platinum** - 20,000+ points (5% cashback, 2x multiplier)
5. **Diamond** - 100,000+ points (10% cashback, 3x multiplier)

#### Points Earning
- 1 punct per 10 unități pariată
- Auto-update tier bazat pe lifetime points
- Transaction history complet

---

### 3. MINI-GAMES (PRIZE ENGINE)

#### Player Endpoints
```
GET    /api/mini-games
GET    /api/mini-games/:id
POST   /api/mini-games/:id/play
GET    /api/mini-games/:id/can-play
GET    /api/mini-games/history/my-plays
GET    /api/mini-games/cooldowns/active
```

#### Admin Endpoints
```
GET    /api/mini-games/admin/games
POST   /api/mini-games/admin/games
PUT    /api/mini-games/admin/games/:id
GET    /api/mini-games/admin/games/:id/prizes
POST   /api/mini-games/admin/prizes
PUT    /api/mini-games/admin/prizes/:id
GET    /api/mini-games/admin/games/:id/statistics
```

#### Game Types
- `WHEEL` - Roata norocului
- `MYSTERY_CHEST` - Cufăr misterios
- `DICE` - Zaruri
- `SCRATCH_CARD` - Card răzuit
- `COIN_FLIP` - Aruncare monedă

#### Features
- Cooldown configurabil per joc
- Limite zilnice de jocuri
- Cost per joc (FREE, LOYALTY_POINTS, CASH)
- Prize distribution bazat pe probabilități

---

### 4. PERSONAL JACKPOTS

#### Player Endpoints
```
GET    /api/personal-jackpots/my-jackpots
GET    /api/personal-jackpots/my-wins
POST   /api/personal-jackpots/check-trigger/:jackpotId
```

#### Admin Endpoints
```
GET    /api/personal-jackpots/admin/configs
GET    /api/personal-jackpots/admin/configs/:id
POST   /api/personal-jackpots/admin/configs
PUT    /api/personal-jackpots/admin/configs/:id
POST   /api/personal-jackpots/admin/initialize
POST   /api/personal-jackpots/admin/trigger-win
GET    /api/personal-jackpots/admin/statistics/:configId
POST   /api/personal-jackpots/admin/auto-initialize
```

#### Trigger Types
- `RANDOM` - Șansă random la fiecare spin
- `SPIN_COUNT` - După X spinuri
- `WAGER_AMOUNT` - După pariere X suma
- `TIME_BASED` - După X ore

#### Configuration
- Seed amount (suma inițială)
- Increment percentage (% din fiecare pariu)
- Max amount (limită maximă)
- Game restrictions (jocuri eligibile)
- VIP tier requirements

---

### 5. RISK MANAGEMENT

#### Admin Endpoints
```
GET    /api/risk/admin/rules
GET    /api/risk/admin/rules/:id
POST   /api/risk/admin/rules
PUT    /api/risk/admin/rules/:id
DELETE /api/risk/admin/rules/:id
POST   /api/risk/admin/evaluate/:userId
GET    /api/risk/admin/events/:userId
GET    /api/risk/admin/score/:userId
POST   /api/risk/admin/resolve/:eventId
GET    /api/risk/admin/high-risk-players
```

#### Rule Types
- `DEPOSIT_PATTERN` - Patron depuneri suspecte
- `WITHDRAWAL_PATTERN` - Patron retrageri suspecte
- `BETTING_PATTERN` - Patron pariuri anormal
- `WIN_RATE` - Rată câștig suspectă
- `BONUS_ABUSE` - Abuz bonusuri
- `MULTI_ACCOUNT` - Conturi multiple

#### Risk Levels
- `LOW` - Risc scăzut (+1 point)
- `MEDIUM` - Risc mediu (+3 points)
- `HIGH` - Risc ridicat (+5 points)
- `CRITICAL` - Risc critic (+10 points)

#### Actions
- `LOG` - Doar înregistrare
- `FLAG` - Marchează contul
- `LIMIT` - Aplică limite
- `BLOCK` - Blochează contul
- `REVIEW` - Trimite la review manual

---

### 6. CUSTOM REPORTS

#### Admin Endpoints
```
GET    /api/reports/admin/all
GET    /api/reports/admin/:id
POST   /api/reports/admin/create
PUT    /api/reports/admin/:id
DELETE /api/reports/admin/:id
POST   /api/reports/admin/execute/:id
GET    /api/reports/admin/executions/:reportId
GET    /api/reports/admin/all-executions
GET    /api/reports/admin/templates
POST   /api/reports/admin/from-template
```

#### Report Categories
- `FINANCIAL` - Rapoarte financiare
- `PLAYER` - Rapoarte jucători
- `GAME` - Rapoarte jocuri
- `MARKETING` - Rapoarte marketing
- `RISK` - Rapoarte risc
- `OPERATIONAL` - Rapoarte operaționale

#### Predefined Templates
1. Daily Revenue Report
2. Top Players by Wagering
3. Game Performance Report
4. New Players Report
5. High Risk Players Report

#### SQL Query Validation
- Doar SELECT queries permise
- DROP, DELETE, UPDATE, ALTER blocat
- Parametri sanitizați automat
- Execution time tracking

---

### 7. ENTERPRISE DASHBOARD

#### Endpoints
```
GET    /api/enterprise/dashboard
POST   /api/enterprise/initialize
```

#### Dashboard Response
```json
{
  "loyalty": {
    "tier": "Gold",
    "points": 7500,
    "lifetime_points": 7500,
    "cashback_percentage": 3,
    "bonus_multiplier": 1.5
  },
  "challenges": {
    "active": 3,
    "list": [
      {
        "id": 1,
        "name": "Daily Wagering Challenge",
        "progress": 450,
        "target": 1000,
        "percentage": 45,
        "reward_type": "CASH",
        "reward_amount": 50
      }
    ]
  },
  "personalJackpots": {
    "active": 2,
    "totalValue": 245.50,
    "list": [...]
  },
  "recentWins": [...]
}
```

---

## ⚙️ INTEGRATION

### Automatic Integration (EnterpriseIntegrationService)

Toate feature-urile se integrează automat în gameplay:

#### On Bet Placed
```typescript
await EnterpriseIntegrationService.processBet(userId, betAmount, gameId);
```
- ✅ Award loyalty points
- ✅ Contribute to personal jackpots
- ✅ Update WAGER challenges
- ✅ Update GAME_PLAY challenges

#### On Win
```typescript
await EnterpriseIntegrationService.processWin(userId, winAmount, gameId);
```
- ✅ Update WIN_COUNT challenges
- ✅ Check personal jackpot triggers

#### On Deposit
```typescript
await EnterpriseIntegrationService.processDeposit(userId, depositAmount);
```
- ✅ Update DEPOSIT challenges
- ✅ Evaluate risk rules

#### On Withdrawal
```typescript
await EnterpriseIntegrationService.processWithdrawal(userId, withdrawalAmount);
```
- ✅ Evaluate risk rules

#### On New Player
```typescript
await EnterpriseIntegrationService.initializeNewPlayer(userId);
```
- ✅ Initialize loyalty account
- ✅ Initialize personal jackpots
- ✅ Auto-assign welcome challenges

---

## 🔄 CRON JOBS

### Automated Tasks (EnterpriseCronService)

#### Every Hour
- Auto-assign challenges (0 * * * *)
- Expire old challenges (15 * * * *)

#### Every 6 Hours
- Auto-initialize personal jackpots (0 */6 * * *)

#### Daily (00:00)
- Recalculate loyalty tiers (0 0 * * *)
- Reset daily mini-game play counts (1 0 * * *)

#### Weekly (Sunday 02:00)
- Cleanup old report executions (0 2 * * 0)

---

## 📈 USAGE EXAMPLES

### Example 1: Create a Challenge
```bash
POST /api/challenges/admin/templates
{
  "name": "Weekend Warrior",
  "description": "Wager 1000 RON this weekend",
  "type": "WAGER",
  "target_value": 1000,
  "reward_type": "CASH",
  "reward_amount": 100,
  "duration_hours": 48,
  "status": "ACTIVE",
  "auto_assign": true,
  "priority": 10
}
```

### Example 2: Add Loyalty Shop Item
```bash
POST /api/loyalty/admin/shop/items
{
  "name": "100 RON Bonus",
  "description": "Redeem 1000 points for 100 RON bonus",
  "cost_points": 1000,
  "reward_type": "BONUS",
  "reward_amount": 100,
  "status": "ACTIVE",
  "category": "bonus"
}
```

### Example 3: Create Mini-Game
```bash
POST /api/mini-games/admin/games
{
  "name": "Lucky Wheel",
  "description": "Spin the wheel once per day",
  "game_type": "WHEEL",
  "config": {
    "segments": 8,
    "animation_duration": 5000
  },
  "status": "ACTIVE",
  "play_cost_type": "FREE",
  "cooldown_minutes": 1440,
  "max_plays_per_day": 1
}
```

### Example 4: Create Risk Rule
```bash
POST /api/risk/admin/rules
{
  "name": "High Deposit Frequency",
  "description": "Flag accounts with more than 5 deposits in 24h",
  "rule_type": "DEPOSIT_PATTERN",
  "condition": {
    "timeframe_hours": 24,
    "min_count": 5
  },
  "risk_level": "MEDIUM",
  "action": "FLAG",
  "status": "ACTIVE",
  "priority": 5
}
```

---

## 🎯 BENEFITS

### For Operators
- ✅ Complete player engagement system
- ✅ Automated player retention
- ✅ Risk management automation
- ✅ Custom analytics & reporting
- ✅ Revenue optimization

### For Players
- ✅ Personalized challenges
- ✅ Loyalty rewards program
- ✅ Free mini-games
- ✅ Personal jackpots
- ✅ Better gaming experience

---

## 🔐 Security

- ✅ JWT authentication on all endpoints
- ✅ Role-based access control (Admin/Player)
- ✅ SQL injection prevention
- ✅ Input validation & sanitization
- ✅ Rate limiting
- ✅ Audit logging

---

## 📊 Performance

- ✅ Database indexes on all queries
- ✅ Parallel processing for integrations
- ✅ Optimized SQL queries
- ✅ Caching strategies
- ✅ Background job processing

---

## 🚀 NEXT STEPS

1. Test all endpoints cu Postman/Insomnia
2. Creează template-uri pentru challenges populare
3. Configurează loyalty shop items
4. Setup risk rules pentru platformă
5. Creează mini-games pentru players
6. Configurează personal jackpots
7. Build rapoarte custom pentru analytics

---

## 📞 Support

Pentru întrebări sau probleme, contactează echipa de dezvoltare.

**Generated with Claude Code** 🤖
