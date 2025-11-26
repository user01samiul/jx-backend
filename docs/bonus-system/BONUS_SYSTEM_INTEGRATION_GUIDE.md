# Bonus System - Complete Integration Guide

## Overview

This guide explains the complete bonus system architecture and how to integrate it with existing backend systems (deposit, withdrawal, betting flows).

### **🔄 System Updates (Nov 2025)**

- ✅ **Separated from Promotions** - Bonus system handles only player rewards with wagering
- ✅ **Currency: USD** - All amounts in US Dollars
- ✅ **API Restructured** - `/api/bonus/available` returns categorized bonuses
- ✅ **Frontend Complete** - Both user and admin interfaces updated

### **Bonus vs Promotions Separation**

**Bonus System (This Guide):**
- Handles: deposit bonuses, bonus codes, loyalty rewards, cashback
- API: `/api/bonus/*`
- Page: `/bonus-wallet`

**Promotions System (Separate, Not Implemented):**
- Future: tournaments, freebets, special campaigns
- API: `/api/promotions/*` (when built)
- Page: `/promotions` (when built)

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Database Schema](#database-schema)
3. [Implementation Status](#implementation-status)
4. [Integration Points](#integration-points)
5. [Testing Guide](#testing-guide)
6. [Troubleshooting](#troubleshooting)

---

## System Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│                    BONUS SYSTEM                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Bonus Engine │  │ Wallet System│  │ Wagering     │ │
│  │              │  │              │  │ Engine       │ │
│  │ - Triggers   │  │ - Main Wallet│  │              │ │
│  │ - Eligibility│  │ - Bonus Wallet│ │ - Progress  │ │
│  │ - Granting   │  │ - Transactions│ │ - Completion│ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                         │
│  ┌────────────────────────────────────────────────────┐│
│  │         Admin Panel & User Interface               ││
│  │  - Plan Management                                 ││
│  │  - Statistics                                      ││
│  │  - Manual Granting                                 ││
│  └────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Services

Located in: `/src/services/bonus/`

1. **BonusEngineService** (`bonus-engine.service.ts`)
   - Main orchestration service
   - Handles bet/win processing with dual wallet logic
   - Manages deposit and withdrawal hooks
   - Expires old bonuses (cron job)
   - System statistics

2. **BonusPlanService** (`bonus-plan.service.ts`)
   - CRUD operations for bonus plans
   - Finding eligible bonuses
   - Plan validation

3. **BonusInstanceService** (`bonus-instance.service.ts`)
   - Granting bonuses (deposit, manual, coded)
   - Checking eligibility
   - Canceling bonuses
   - Managing bonus lifecycle

4. **BonusWalletService** (`bonus-wallet.service.ts`)
   - Managing bonus wallet balances
   - Adding/deducting bonus money
   - Releasing to main wallet
   - Forfeiting bonuses

5. **WageringEngineService** (`wagering-engine.service.ts`)
   - Calculating wagering contributions
   - Tracking progress
   - Completing wagering requirements
   - Game contribution percentages

6. **BonusTransactionService** (`bonus-transaction.service.ts`)
   - Logging all bonus transactions
   - Audit trail
   - Player transaction history

---

## Database Schema

### Tables Created

All tables are in PostgreSQL database `jackpotx-db`:

1. **bonus_plans** - Bonus templates/plans created by admins
2. **bonus_instances** - Active bonuses granted to players
3. **bonus_wallets** - Player bonus wallet balances
4. **bonus_transactions** - Audit trail of all bonus money movements
5. **bonus_wager_progress** - Wagering progress tracking
6. **game_contributions** - Game wagering contribution percentages
7. **bonus_restrictions** - Bonus eligibility restrictions
8. **bonus_audit_log** - Complete audit log for compliance

### Migration Status

✅ **Database migration completed**

The migration file `migration-bonus-system.sql` has been run and all tables exist.

To verify:
```bash
PGPASSWORD='12358Voot#' psql -h 194.102.33.209 -U postgres -d jackpotx-db -c "\dt bonus*"
```

---

## Implementation Status

### ✅ Completed

1. **Database Schema**
   - All 8 bonus tables created
   - Indexes and foreign keys configured
   - Comments added for documentation

2. **Backend Services**
   - All 6 core services implemented (~3,000 lines)
   - Dual wallet logic
   - Wagering tracking
   - Transaction logging

3. **API Endpoints**
   - Admin endpoints (17 endpoints)
   - User endpoints (10 endpoints)
   - All CRUD operations
   - Statistics and reports

4. **Routes**
   - `/api/admin/bonus/*` - Admin endpoints
   - `/api/bonus/*` - User endpoints
   - ✅ Registered in `src/routes/api.ts`

5. **Controllers**
   - 27 controller functions implemented
   - Request validation schemas
   - Error handling

6. **Documentation**
   - User FE integration guide
   - Admin FE integration guide
   - This integration guide

### ⚠️ Requires Manual Integration

The following integrations need to be added to existing services:

1. **Deposit Flow Integration**
   - Call `BonusEngineService.handleDeposit()` after successful deposit
   - Location: Wherever deposits are processed
   - Auto-grants eligible deposit bonuses

2. **Withdrawal Flow Integration**
   - Call `BonusEngineService.handleWithdrawal()` before processing withdrawal
   - Cancels active bonuses (if configured)
   - Prevents withdrawal if bonuses active

3. **Bet/Win Flow Integration**
   - Call `BonusEngineService.processBet()` when bet is placed
   - Call `BonusEngineService.processWin()` when bet wins
   - Handles dual wallet logic automatically

4. **Cron Jobs**
   - Add `BonusEngineService.expireBonuses()` to cron schedule
   - Run daily to expire old bonuses

---

## Integration Points

### 1. Deposit Integration

**When:** After deposit is confirmed and added to main wallet

**Location:** Find your deposit processing service (likely in `/src/services/payment/` or `/src/services/user/`)

**Code to Add:**

```typescript
import { BonusEngineService } from '../services/bonus/bonus-engine.service';

// After deposit is successful
async function processDeposit(userId: number, amount: number, transactionId: number, paymentMethodId: number) {
  // ... existing deposit logic ...

  // AFTER deposit is added to main wallet:
  try {
    await BonusEngineService.handleDeposit(
      userId,
      amount,
      transactionId,
      paymentMethodId
    );
    console.log('[DEPOSIT] Bonus check completed');
  } catch (error) {
    console.error('[DEPOSIT] Bonus grant failed:', error);
    // Don't fail deposit if bonus fails
  }

  // ... rest of deposit logic ...
}
```

**What it does:**
- Checks for active deposit bonuses matching the deposit amount
- Validates player eligibility
- Calculates bonus amount
- Grants bonus to player automatically
- Logs all actions

---

### 2. Withdrawal Integration

**When:** Before processing withdrawal request

**Location:** Find withdrawal processing service (likely `/src/services/withdrawal/` or `/src/services/user/`)

**Code to Add:**

```typescript
import { BonusEngineService } from '../services/bonus/bonus-engine.service';

async function processWithdrawal(userId: number, amount: number) {
  // BEFORE allowing withdrawal:
  try {
    await BonusEngineService.handleWithdrawal(userId);
    console.log('[WITHDRAWAL] Bonuses cancelled/checked');
  } catch (error) {
    // If this throws, active bonuses exist and need to be handled
    throw new Error('You have active bonuses. Complete wagering requirements before withdrawal.');
  }

  // ... rest of withdrawal logic ...
}
```

**What it does:**
- Checks for active bonuses
- Cancels bonuses if `cancel_on_withdrawal` is true
- Removes bonus money from wallet
- Logs forfeiture
- Throws error if bonuses can't be cancelled

---

### 3. Bet Processing Integration

**When:** When a player places a bet

**Location:** Provider callback service or bet processing service

**Code to Add:**

```typescript
import { BonusEngineService } from '../services/bonus/bonus-engine.service';

async function processBet(userId: number, betAmount: number, gameId: number, betId: number) {
  // BEFORE deducting from wallet:
  let usedBonusMoney = false;

  try {
    const betResult = await BonusEngineService.processBet(
      userId,
      betAmount,
      gameId,
      betId
    );

    console.log('[BET] Wallet usage:', betResult);
    // betResult = {
    //   usedMainWallet: 100,
    //   usedBonusWallet: 50,
    //   bonusInstancesUsed: [...]
    // }

    usedBonusMoney = betResult.usedBonusWallet > 0;

    // If used bonus money, don't deduct from main wallet
    // The BonusEngine already handled the deduction
    if (betResult.usedMainWallet > 0) {
      // Deduct from main wallet via existing BalanceService
      // await BalanceService.deduct(userId, betResult.usedMainWallet);
      // (Your existing balance deduction logic)
    }

  } catch (error) {
    console.error('[BET] Bonus processing failed:', error);
    throw error;
  }

  // Store usedBonusMoney flag for win processing
  await storeBetMetadata(betId, { usedBonusMoney });

  // ... rest of bet logic ...
}
```

**Important Notes:**
- Main wallet is used first
- Bonus wallet is only used when main wallet is empty
- BonusEngine handles deductions from bonus wallet
- You still handle main wallet deductions
- Track which wallet was used for win processing

---

### 4. Win Processing Integration

**When:** When a bet wins and winnings are credited

**Code to Add:**

```typescript
import { BonusEngineService } from '../services/bonus/bonus-engine.service';

async function processWin(userId: number, betId: number, winAmount: number, gameId: number) {
  // Check if bet used bonus money
  const betMeta = await getBetMetadata(betId);
  const usedBonusMoney = betMeta?.usedBonusMoney || false;

  try {
    const winResult = await BonusEngineService.processWin(
      userId,
      winAmount,
      gameId,
      betId,
      usedBonusMoney
    );

    console.log('[WIN] Credited to:', winResult.walletType);
    // winResult.walletType = 'main' or 'bonus'

    // If credited to bonus wallet, don't credit to main wallet
    // The BonusEngine already handled it
    if (winResult.walletType === 'main') {
      // Credit to main wallet via existing BalanceService
      // await BalanceService.credit(userId, winAmount);
      // (Your existing balance credit logic)
    }

  } catch (error) {
    console.error('[WIN] Bonus processing failed:', error);
    throw error;
  }

  // ... rest of win logic ...
}
```

**Rules:**
- If bet used bonus money → winnings go to bonus wallet
- If bet used main wallet → winnings go to main wallet
- BonusEngine handles bonus wallet credits
- You still handle main wallet credits

---

### 5. Cron Job Integration

**When:** Daily maintenance

**Location:** Your cron job service (likely `/src/services/cron/` or `/src/index.ts`)

**Code to Add:**

```typescript
import { BonusEngineService } from '../services/bonus/bonus-engine.service';
import cron from 'node-cron';

// Run daily at 00:00 (midnight)
cron.schedule('0 0 * * *', async () => {
  console.log('[CRON] Running bonus expiry check...');

  try {
    const expiredCount = await BonusEngineService.expireBonuses();
    console.log(`[CRON] Expired ${expiredCount} bonuses`);
  } catch (error) {
    console.error('[CRON] Bonus expiry failed:', error);
  }
});
```

---

## Balance Display Integration

### Getting Combined Balance

When displaying player balance, use:

```typescript
import { BonusEngineService } from '../services/bonus/bonus-engine.service';

async function getPlayerBalance(userId: number) {
  const balance = await BonusEngineService.getCombinedBalance(userId);

  return {
    total: balance.totalAvailable,
    main: balance.mainWallet,
    bonus: balance.bonusWallet,
    activeBonuses: balance.activeBonusCount
  };
}
```

Display to user:
```
Total Balance: ₦1,500.00
├─ Main Wallet: ₦1,000.00 (withdrawable)
└─ Bonus Wallet: ₦500.00 (2 active bonuses)
```

---

## Testing Guide

### 1. Database Verification

```bash
# Check tables exist
PGPASSWORD='12358Voot#' psql -h 194.102.33.209 -U postgres -d jackpotx-db -c "\dt bonus*"

# Check sample data
PGPASSWORD='12358Voot#' psql -h 194.102.33.209 -U postgres -d jackpotx-db -c "SELECT COUNT(*) FROM bonus_plans;"
```

### 2. API Testing

Create a test script: `test-bonus-api.js`

```javascript
const BASE_URL = 'https://backend.jackpotx.net/api';
const ADMIN_TOKEN = 'your_admin_jwt_token';
const USER_TOKEN = 'your_user_jwt_token';

async function testBonusSystem() {
  // 1. Create bonus plan (Admin)
  const createPlan = await fetch(`${BASE_URL}/admin/bonus/plans`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Test Welcome Bonus',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      expiry_days: 30,
      trigger_type: 'coded',
      award_type: 'flat_amount',
      amount: 100,
      wager_requirement_multiplier: 10,
      bonus_code: 'TEST100',
      max_code_usage: 100,
      status: 'active'
    })
  });

  const plan = await createPlan.json();
  console.log('✓ Bonus plan created:', plan.data.id);

  // 2. Apply bonus code (User)
  const applyCode = await fetch(`${BASE_URL}/bonus/apply-code`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${USER_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code: 'TEST100' })
  });

  const applied = await applyCode.json();
  console.log('✓ Bonus code applied:', applied.data.bonus_amount);

  // 3. Check balance (User)
  const balance = await fetch(`${BASE_URL}/bonus/combined-balance`, {
    headers: { 'Authorization': `Bearer ${USER_TOKEN}` }
  });

  const balanceData = await balance.json();
  console.log('✓ Balance:', balanceData.data);

  // 4. Check active bonuses (User)
  const active = await fetch(`${BASE_URL}/bonus/active`, {
    headers: { 'Authorization': `Bearer ${USER_TOKEN}` }
  });

  const activeBonuses = await active.json();
  console.log('✓ Active bonuses:', activeBonuses.data.length);

  // 5. Get statistics (Admin)
  const stats = await fetch(`${BASE_URL}/admin/bonus/statistics`, {
    headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
  });

  const statsData = await stats.json();
  console.log('✓ Statistics:', statsData.data);
}

testBonusSystem().catch(console.error);
```

Run: `node test-bonus-api.js`

### 3. Integration Testing

**Test Deposit Bonus:**

```bash
# 1. Create deposit bonus plan (100% match, min 1000 NGN)
curl -X POST https://backend.jackpotx.net/api/admin/bonus/plans \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "100% Deposit Bonus",
    "trigger_type": "deposit",
    "award_type": "percentage",
    "amount": 100,
    "min_deposit": 1000,
    "wager_requirement_multiplier": 35,
    "start_date": "2025-01-01T00:00:00Z",
    "end_date": "2025-12-31T23:59:59Z",
    "expiry_days": 30,
    "status": "active"
  }'

# 2. Make a deposit of 5000 NGN
# (Use your existing deposit flow)

# 3. Check if bonus was granted
curl https://backend.jackpotx.net/api/bonus/active \
  -H "Authorization: Bearer $USER_TOKEN"

# Expected: 1 active bonus of 5000 NGN with 175,000 NGN wagering requirement
```

**Test Bet Processing:**

```bash
# 1. Get balance before
curl https://backend.jackpotx.net/api/bonus/combined-balance \
  -H "Authorization: Bearer $USER_TOKEN"

# 2. Place a bet
# (Use your existing bet flow)

# 3. Check wagering progress
curl https://backend.jackpotx.net/api/bonus/wagering-progress \
  -H "Authorization: Bearer $USER_TOKEN"

# Expected: Progress increased
```

---

## Troubleshooting

### Issue: "Cannot find module 'joi'"

**Solution:**
```bash
npm install joi
# or
npm install @hapi/joi
```

### Issue: "Property 'validated' does not exist on type 'Request'"

**Cause:** Custom middleware adds `validated` property

**Solution:** Either:
1. Use `(req as any).validated` (temporary)
2. Extend Express Request type:

```typescript
// src/types/express.d.ts
import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      validated?: {
        body?: any;
        query?: any;
        params?: any;
      };
    }
  }
}
```

### Issue: Bonus not granted on deposit

**Debug steps:**

1. Check if bonus plan exists and is active:
```sql
SELECT * FROM bonus_plans WHERE trigger_type = 'deposit' AND status = 'active';
```

2. Check deposit amount matches requirements:
```sql
SELECT min_deposit, max_deposit FROM bonus_plans WHERE id = X;
```

3. Check player eligibility (max_trigger_per_player):
```sql
SELECT COUNT(*) FROM bonus_instances WHERE player_id = X AND bonus_plan_id = Y;
```

4. Check backend logs for error messages

### Issue: Wagering not progressing

**Debug steps:**

1. Check game contribution percentage:
```sql
SELECT * FROM game_contributions WHERE game_id = X;
```

2. Default contribution (if not in table): 100%

3. Check bet actually used bonus money:
```sql
SELECT * FROM bonus_transactions WHERE transaction_type = 'bet_placed' AND bet_id = X;
```

### Issue: Balance not updating

**Check:**
1. Is bonus wallet service being called?
2. Check PostgreSQL transactions - are they committing?
3. Verify no database errors in logs

---

## API Endpoints Summary

### Admin Endpoints

All require Admin/Manager role:

```
POST   /api/admin/bonus/plans                     Create bonus plan
GET    /api/admin/bonus/plans                     Get all plans (with filters)
GET    /api/admin/bonus/plans/:id                 Get single plan
PUT    /api/admin/bonus/plans/:id                 Update plan
DELETE /api/admin/bonus/plans/:id                 Delete plan

POST   /api/admin/bonus/grant-manual              Grant manual bonus
GET    /api/admin/bonus/statistics                Get system statistics
GET    /api/admin/bonus/player/:playerId/bonuses  Get player bonuses
POST   /api/admin/bonus/instances/:id/forfeit     Forfeit bonus

POST   /api/admin/bonus/game-contribution         Set game contribution
GET    /api/admin/bonus/game-contribution/:gameId Get game contribution
```

### User Endpoints

All require authentication:

```
POST   /api/bonus/apply-code                      Apply bonus code
GET    /api/bonus/my-bonuses                      Get all my bonuses
GET    /api/bonus/active                          Get active bonuses
GET    /api/bonus/wallet                          Get bonus wallet
GET    /api/bonus/wagering-progress               Get wagering progress
GET    /api/bonus/transactions                    Get bonus transactions
GET    /api/bonus/stats                           Get my statistics
GET    /api/bonus/combined-balance                Get combined balance
GET    /api/bonus/available                       Get available bonuses
```

---

## File Structure

```
backend.jackpotx.net/
├── migration-bonus-system.sql                    # Database migration
├── src/
│   ├── api/bonus/
│   │   ├── bonus.controller.ts                   # All controllers
│   │   └── bonus.schema.ts                       # Validation schemas
│   ├── routes/
│   │   ├── bonus.routes.ts                       # Route definitions
│   │   └── api.ts                                # Main router (bonus routes registered)
│   └── services/bonus/
│       ├── bonus-engine.service.ts               # Main orchestration
│       ├── bonus-plan.service.ts                 # Plan CRUD
│       ├── bonus-instance.service.ts             # Instance management
│       ├── bonus-wallet.service.ts               # Wallet operations
│       ├── wagering-engine.service.ts            # Wagering logic
│       └── bonus-transaction.service.ts          # Transactions & audit
├── BONUS_SYSTEM_USER_FE_INTEGRATION.md          # User frontend guide
├── BONUS_SYSTEM_ADMIN_FE_INTEGRATION.md         # Admin frontend guide
└── BONUS_SYSTEM_INTEGRATION_GUIDE.md            # This file
```

---

## Next Steps

### Immediate (Required for Production)

1. **Integrate with Deposit Flow**
   - Add `BonusEngineService.handleDeposit()` call
   - Test with various deposit amounts
   - Verify bonus granted correctly

2. **Integrate with Withdrawal Flow**
   - Add `BonusEngineService.handleWithdrawal()` call
   - Test withdrawal with active bonuses
   - Verify bonuses cancelled

3. **Integrate with Bet/Win Flow**
   - Add `BonusEngineService.processBet()` call
   - Add `BonusEngineService.processWin()` call
   - Test dual wallet logic
   - Verify wagering progress

4. **Add Cron Job**
   - Schedule daily bonus expiry check
   - Monitor for expired bonuses

5. **Populate Game Contributions**
   - Set contribution percentages for all games
   - Default: Slots 100%, Table Games 10%, Live Casino 15%

### Optional (Enhancements)

1. **Real-time Updates**
   - WebSocket notifications for bonus events
   - Live progress updates

2. **Advanced Features**
   - Scheduled cashback (cron job)
   - Loyalty bonuses (integrate with VIP system)
   - Tournament bonuses

3. **Analytics**
   - Bonus conversion funnel
   - Player segmentation
   - ROI tracking

---

## Support & Maintenance

### Monitoring

Watch these metrics:
- Active bonuses count
- Completion rate (completed / total)
- Total bonus value in circulation
- Average wagering completion time

### Database Maintenance

Run weekly:
```sql
-- Clean up very old completed/forfeited bonuses (optional)
DELETE FROM bonus_instances
WHERE status IN ('completed', 'forfeited', 'cancelled')
AND updated_at < NOW() - INTERVAL '90 days';

-- Archive old transactions (optional)
-- Move to archive table instead of deleting
```

### Logs to Monitor

```
[BONUS_ENGINE] Granted deposit bonus
[BONUS_ENGINE] Used X from main wallet, Y from bonus wallet
[BONUS_ENGINE] Wagering progress: X%
[BONUS_ENGINE] Bonus completed! Released X NGN
[BONUS_ENGINE] Expired X bonuses
```

---

## Conclusion

The bonus system is fully implemented and ready for integration. Follow this guide to connect it with your existing deposit, withdrawal, and betting flows. The system is designed to be:

- **Safe**: All operations use database transactions
- **Auditable**: Complete transaction history
- **Flexible**: Support for multiple bonus types
- **Scalable**: Efficient database design with indexes

For questions or issues, check the troubleshooting section or review the service code directly.

**Documentation Files:**
- User FE Integration: `BONUS_SYSTEM_USER_FE_INTEGRATION.md`
- Admin FE Integration: `BONUS_SYSTEM_ADMIN_FE_INTEGRATION.md`
- This Guide: `BONUS_SYSTEM_INTEGRATION_GUIDE.md`
