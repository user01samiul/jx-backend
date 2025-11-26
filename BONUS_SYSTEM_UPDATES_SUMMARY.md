# Bonus System Updates - Backend Summary

## Overview
This document outlines the comprehensive updates made to the bonus system to fix balance display issues, add proper wallet structure, and enable bonus-to-main wallet transfers.

## Issues Fixed

### 1. Total Balance Display Issue
**Problem**: Total Balance was showing `main + bonus` ($150,875.36) instead of just main wallet balance.
**Solution**: Updated `getCombinedBalance()` in `bonus-engine.service.ts` to return only main wallet balance in `totalAvailable` field.

### 2. Bonus Wallet Structure
**Problem**: Bonus wallet didn't distinguish between:
- Funds available to release (wagering completed)
- Funds still being wagered (locked)

**Solution**: Added new `releasable_amount` field to track completed bonuses ready for transfer.

### 3. Transfer Functionality Missing
**Problem**: No way to transfer completed bonus funds to main wallet.
**Solution**: Created new transfer endpoint and service method.

### 4. Transferred Amount Tracking
**Problem**: "Total Released" was showing lifetime bonus releases, not transfers to main wallet.
**Solution**: Added `total_bonus_transferred` field to track actual transfers to main wallet.

---

## Database Changes

### Migration: `migration-add-bonus-transferred-field.sql`

```sql
-- Added new column to bonus_wallets table
ALTER TABLE bonus_wallets
ADD COLUMN total_bonus_transferred DECIMAL(15, 2) DEFAULT 0 NOT NULL;
```

**Purpose**: Track lifetime amount transferred from bonus wallet to main wallet.

---

## Backend API Changes

### 1. Updated Bonus Wallet Interface

**File**: `src/services/bonus/bonus-wallet.service.ts`

```typescript
export interface BonusWalletInfo {
  player_id: number;
  total_bonus_balance: number;
  locked_bonus_balance: number;
  playable_bonus_balance: number;
  releasable_amount: number; // NEW: Amount ready to transfer (wagering complete)
  total_bonus_received: number;
  total_bonus_wagered: number;
  total_bonus_released: number;
  total_bonus_forfeited: number;
  total_bonus_transferred: number; // NEW: Lifetime transferred to main wallet
  active_bonus_count: number;
  currency: string;
}
```

### 2. New Transfer Method

**File**: `src/services/bonus/bonus-wallet.service.ts`

```typescript
static async transferToMainWallet(playerId: number, amount?: number): Promise<number>
```

**Functionality**:
- Transfers completed bonus funds to main wallet
- Accepts optional `amount` parameter (defaults to all releasable)
- Updates bonus_instances, bonus_wallets, and creates transaction record
- Returns transferred amount

**Logic**:
1. Calculates releasable amount (completed bonuses with remaining funds)
2. Validates transfer amount
3. Deducts from oldest completed bonuses first (FIFO)
4. Updates bonus wallet balances
5. Creates transaction in main wallet
6. Returns transferred amount

### 3. Updated Combined Balance

**File**: `src/services/bonus/bonus-engine.service.ts`

```typescript
static async getCombinedBalance(playerId: number): Promise<{
  mainWallet: number;
  bonusWallet: number;
  totalAvailable: number; // NOW SHOWS ONLY MAIN WALLET (not main + bonus)
  activeBonusCount: number;
}>
```

**IMPORTANT**: `totalAvailable` now returns **only** the main wallet balance, not main + bonus.

### 4. New API Endpoint

**Route**: `POST /api/bonus/transfer-to-main`

**Request Body** (optional):
```json
{
  "amount": 50.00  // Optional: specific amount to transfer (defaults to all releasable)
}
```

**Response**:
```json
{
  "success": true,
  "message": "Bonus funds transferred to main wallet successfully",
  "data": {
    "transferred_amount": 50.00
  }
}
```

**Error Cases**:
- `400`: No releasable bonus funds available
- `400`: Invalid transfer amount
- `400`: Amount exceeds releasable balance

### 5. Updated Bonus Wallet Endpoint

**Route**: `GET /api/bonus/wallet`

**New Response Fields**:
```json
{
  "success": true,
  "data": {
    "player_id": 123,
    "total_bonus_balance": 150.00,
    "locked_bonus_balance": 0.00,
    "playable_bonus_balance": 150.00,
    "releasable_amount": 150.00,  // NEW: Ready to transfer
    "total_bonus_received": 200.00,
    "total_bonus_wagered": 500.00,
    "total_bonus_released": 150.00,
    "total_bonus_forfeited": 0.00,
    "total_bonus_transferred": 0.00,  // NEW: Lifetime transferred
    "active_bonus_count": 1,
    "currency": "USD"
  }
}
```

---

## API Summary

### Existing Endpoints (Updated)
- `GET /api/bonus/wallet` - Now includes `releasable_amount` and `total_bonus_transferred`
- `GET /api/bonus/combined-balance` - `totalAvailable` now shows only main wallet

### New Endpoints
- `POST /api/bonus/transfer-to-main` - Transfer completed bonus funds to main wallet

---

## Testing Checklist

### Backend Tests
- [x] Migration successfully adds `total_bonus_transferred` column
- [x] `getBalance()` calculates `releasable_amount` correctly
- [x] `transferToMainWallet()` transfers funds correctly
- [x] `getCombinedBalance()` returns only main wallet balance
- [x] Transfer endpoint responds correctly
- [x] PM2 restart successful with no errors

### Manual Testing Steps

1. **Apply a bonus code** (e.g., WELCOME100)
2. **Play games** to complete wagering requirement
3. **Check bonus wallet**:
   - `playable_bonus_balance` should have funds
   - `releasable_amount` should match completed bonus amount
4. **Call transfer endpoint**:
   ```bash
   curl -X POST http://localhost:3001/api/bonus/transfer-to-main \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```
5. **Verify**:
   - Main wallet balance increased
   - Bonus wallet balance decreased
   - `total_bonus_transferred` incremented
   - Transaction created with type='bonus'

---

## Frontend Integration Guide

### Data Structure Changes

#### Bonus Wallet Object
```typescript
interface BonusWallet {
  player_id: number;
  total_bonus_balance: number;      // Total in bonus wallet
  locked_bonus_balance: number;     // Locked (active/wagering)
  playable_bonus_balance: number;   // Playable (active/wagering)
  releasable_amount: number;        // NEW: Can be transferred to main
  total_bonus_received: number;     // Lifetime received
  total_bonus_wagered: number;      // Lifetime wagered
  total_bonus_released: number;     // Lifetime released
  total_bonus_forfeited: number;    // Lifetime forfeited
  total_bonus_transferred: number;  // NEW: Lifetime transferred to main
  active_bonus_count: number;       // Active bonuses count
  currency: string;
}
```

#### Combined Balance Object
```typescript
interface CombinedBalance {
  mainWallet: number;           // Main wallet balance
  bonusWallet: number;          // Bonus wallet balance (playable)
  totalAvailable: number;       // MAIN WALLET ONLY (not main + bonus)
  activeBonusCount: number;     // Active bonuses count
}
```

### UI Requirements

#### 1. Update Total Balance Card
```tsx
// OLD (WRONG):
<p>Total Balance: ${combinedBalance.totalAvailable}</p>
<small>Main: ${combinedBalance.mainWallet} + Bonus: ${combinedBalance.bonusWallet}</small>

// NEW (CORRECT):
<p>Main Wallet Balance: ${combinedBalance.totalAvailable}</p>
<small>Main wallet only - bonus tracked separately</small>
```

#### 2. Update Bonus Wallet Card Structure
```tsx
<div className="bonus-wallet-card">
  <h3>Bonus Wallet</h3>

  {/* Main Display: Show ONLY releasable amount */}
  <div className="main-amount">
    <p className="label">Available to Transfer</p>
    <p className="amount">${bonusWallet.releasable_amount}</p>
    <button
      onClick={transferToMain}
      disabled={bonusWallet.releasable_amount <= 0}
    >
      Transfer to Main Wallet
    </button>
  </div>

  {/* Secondary Display: Show wagering progress */}
  <div className="secondary-section">
    <div className="wagering-section">
      <p className="label">Active Bonuses (Wagering)</p>
      <p className="amount">${bonusWallet.playable_bonus_balance}</p>
      <small>{bonusWallet.active_bonus_count} active bonus{bonusWallet.active_bonus_count !== 1 ? 'es' : ''}</small>
    </div>

    <div className="locked-section">
      <p className="label">Locked (Not Yet Active)</p>
      <p className="amount">${bonusWallet.locked_bonus_balance}</p>
    </div>
  </div>
</div>
```

#### 3. Rename "Total Released" to "Total Transferred"
```tsx
// OLD:
<div className="stat-card">
  <p className="label">Total Released</p>
  <p className="value">${bonusWallet.total_bonus_released}</p>
  <small>Lifetime earnings</small>
</div>

// NEW:
<div className="stat-card">
  <p className="label">Total Transferred</p>
  <p className="value">${bonusWallet.total_bonus_transferred}</p>
  <small>Lifetime transferred to main wallet</small>
</div>
```

#### 4. Add Transfer Function
```typescript
const transferBonusToMain = async (amount?: number) => {
  try {
    setTransferring(true);

    const response = await bonusAPI.transferToMain(amount);

    if (response.data.success) {
      toast.success(`Transferred ${formatCurrency(response.data.data.transferred_amount)} to main wallet!`);

      // Refresh balances
      await Promise.all([
        refreshBalances(),
        fetchBonusWallet()
      ]);
    }
  } catch (error) {
    const message = error.response?.data?.message || 'Transfer failed';
    toast.error(message);
  } finally {
    setTransferring(false);
  }
};
```

#### 5. Update API Client
```typescript
// src/api/bonus.ts
export const bonusAPI = {
  // ... existing methods

  transferToMain: (amount?: number) =>
    axios.post('/api/bonus/transfer-to-main',
      amount ? { amount } : {},
      { headers: { Authorization: `Bearer ${token}` } }
    )
};
```

---

## Summary of Changes

### Database
- ✅ Added `total_bonus_transferred` column to `bonus_wallets` table

### Backend Services
- ✅ Updated `BonusWalletInfo` interface with new fields
- ✅ Added `transferToMainWallet()` method
- ✅ Updated `getBalance()` to calculate `releasable_amount`
- ✅ Fixed `getCombinedBalance()` to show only main wallet
- ✅ Added `transferBonusToMain()` controller

### Backend Routes
- ✅ Added `POST /api/bonus/transfer-to-main` endpoint
- ✅ Updated Swagger documentation

### Frontend Updates Required
- ⚠️ Update Total Balance card to show only main wallet
- ⚠️ Restructure Bonus Wallet card with two sections
- ⚠️ Rename "Total Released" to "Total Transferred"
- ⚠️ Add transfer button and functionality
- ⚠️ Update API client with new endpoint

---

## Deployment Notes

1. **Run migration first**:
   ```bash
   psql -h localhost -U postgres -d jackpotx-db -f migration-add-bonus-transferred-field.sql
   ```

2. **Restart backend**:
   ```bash
   pm2 restart backend
   ```

3. **Verify API**:
   - Test `GET /api/bonus/wallet` for new fields
   - Test `POST /api/bonus/transfer-to-main` with completed bonus

4. **Deploy frontend** with updated UI components

---

## Contact & Support

For questions or issues, contact the development team or refer to:
- `/docs/bonus-system/` directory for detailed documentation
- `BONUS_UPDATES_SUMMARY.md` for previous updates
- API documentation at `/api-docs` (Swagger)
