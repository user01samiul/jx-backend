# Frontend Update Prompt for Bonus Wallet Page

## Context
The backend bonus system has been updated to fix balance display issues and add proper bonus-to-main wallet transfer functionality. You need to update the `BonusWallet.tsx` component to reflect these changes.

## Task Overview
Update the Bonus Wallet page to:
1. Fix Total Balance display (show only main wallet, not main + bonus)
2. Restructure Bonus Wallet card with two sections
3. Rename "Total Released" to "Total Transferred"
4. Add transfer functionality to move completed bonus funds to main wallet

---

## API Changes

### 1. Updated GET /api/bonus/wallet Response

**New Fields**:
```typescript
{
  "success": true,
  "data": {
    "player_id": 123,
    "total_bonus_balance": 150.00,
    "locked_bonus_balance": 0.00,
    "playable_bonus_balance": 150.00,
    "releasable_amount": 150.00,          // NEW: Ready to transfer to main wallet
    "total_bonus_received": 200.00,
    "total_bonus_wagered": 500.00,
    "total_bonus_released": 150.00,
    "total_bonus_forfeited": 0.00,
    "total_bonus_transferred": 0.00,      // NEW: Lifetime transferred to main wallet
    "active_bonus_count": 1,
    "currency": "USD"
  }
}
```

### 2. Updated GET /api/bonus/combined-balance Response

**IMPORTANT CHANGE**:
```typescript
{
  "success": true,
  "data": {
    "mainWallet": 40725.34,
    "bonusWallet": 150.00,
    "totalAvailable": 40725.34,   // NOW SHOWS ONLY MAIN WALLET (not main + bonus)
    "activeBonusCount": 1
  }
}
```

### 3. New POST /api/bonus/transfer-to-main Endpoint

**Request**:
```typescript
POST /api/bonus/transfer-to-main
Headers: { Authorization: "Bearer <token>" }
Body: { amount?: number }  // Optional: defaults to all releasable
```

**Response**:
```typescript
{
  "success": true,
  "message": "Bonus funds transferred to main wallet successfully",
  "data": {
    "transferred_amount": 150.00
  }
}
```

---

## Required Changes

### 1. Update Total Balance Card

**Current Issue**: Shows $150,875.36 (main + bonus) but user's main balance is $40,725.34

**Fix**:
```tsx
// BEFORE (WRONG):
<motion.div className="rounded-2xl p-7">
  <div className="flex items-start justify-between mb-6">
    <div>
      <p className="text-sm font-medium mb-1" style={{ color: '#858585' }}>Total Balance</p>
      <p className="font-title text-4xl font-bold tracking-tight" style={{ color: '#111827' }}>
        {formatCurrency(combinedBalance?.totalAvailable)}  {/* WRONG: Shows main + bonus */}
      </p>
    </div>
  </div>
  <div className="text-sm" style={{ color: '#858585' }}>
    Main: {formatCurrency(combinedBalance?.mainWallet)} + Bonus: {formatCurrency(combinedBalance?.bonusWallet)}
  </div>
</motion.div>

// AFTER (CORRECT):
<motion.div className="rounded-2xl p-7">
  <div className="flex items-start justify-between mb-6">
    <div>
      <p className="text-sm font-medium mb-1" style={{ color: '#858585' }}>Main Wallet Balance</p>
      <p className="font-title text-4xl font-bold tracking-tight" style={{ color: '#111827' }}>
        {formatCurrency(combinedBalance?.totalAvailable)}  {/* CORRECT: Shows only main wallet */}
      </p>
    </div>
  </div>
  <div className="flex items-center gap-2 mb-6 px-3 py-2 rounded-lg" style={{ backgroundColor: '#ECFDF5' }}>
    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#22C55E' }}></div>
    <span className="text-xs font-medium" style={{ color: '#059669' }}>Withdrawable Balance</span>
  </div>
  <div className="text-sm" style={{ color: '#858585' }}>
    Bonus funds tracked separately
  </div>
</motion.div>
```

### 2. Restructure Bonus Wallet Card

**Requirements**:
- Main display shows **only** `releasable_amount` (completed bonuses ready to transfer)
- Add "Transfer to Main Wallet" button
- Secondary section shows wagering progress (active bonuses)
- Secondary section shows locked bonuses (not yet active)

**Implementation**:
```tsx
<motion.div className="rounded-2xl p-7">
  <div className="flex items-start justify-between mb-4">
    <div>
      <p className="text-sm font-medium mb-1" style={{ color: '#858585' }}>Bonus Wallet</p>
      <p className="font-title text-4xl font-bold tracking-tight" style={{ color: '#111827' }}>
        {formatCurrency(bonusWallet?.releasable_amount || 0)}
      </p>
    </div>
    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FFFFFF' }}>
      <Gift className="h-6 w-6" style={{ color: '#6B7280' }} />
    </div>
  </div>

  {/* Transfer Button */}
  <motion.button
    whileHover={{ scale: bonusWallet?.releasable_amount > 0 ? 1.02 : 1 }}
    whileTap={{ scale: bonusWallet?.releasable_amount > 0 ? 0.98 : 1 }}
    onClick={handleTransferToMain}
    disabled={!bonusWallet?.releasable_amount || bonusWallet.releasable_amount <= 0 || transferring}
    className="w-full mb-4 px-4 py-3 rounded-xl font-semibold transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
    style={{
      background: bonusWallet?.releasable_amount > 0
        ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
        : '#E5E1DC',
      color: bonusWallet?.releasable_amount > 0 ? '#FFFFFF' : '#858585'
    }}
  >
    {transferring ? (
      <div className="flex items-center justify-center gap-2">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
        />
        Transferring...
      </div>
    ) : (
      <>
        <RefreshCw className="w-5 h-5 inline mr-2" />
        Transfer to Main Wallet
      </>
    )}
  </motion.button>

  {/* Secondary Sections */}
  <div className="grid grid-cols-2 gap-3 pt-4" style={{ borderTop: '1px solid #E5E1DC' }}>
    {/* Active Bonuses (Wagering) */}
    <div>
      <div className="text-xs mb-1" style={{ color: '#858585' }}>Active (Wagering)</div>
      <div className="font-bold text-lg" style={{ color: '#F2590D' }}>
        {formatCurrency(bonusWallet?.playable_bonus_balance || 0)}
      </div>
      <div className="text-xs" style={{ color: '#858585' }}>
        {bonusWallet?.active_bonus_count || 0} active
      </div>
    </div>

    {/* Locked Bonuses */}
    <div>
      <div className="text-xs mb-1" style={{ color: '#858585' }}>Locked (Pending)</div>
      <div className="font-bold text-lg" style={{ color: '#6B7280' }}>
        {formatCurrency(bonusWallet?.locked_bonus_balance || 0)}
      </div>
      <div className="text-xs" style={{ color: '#858585' }}>Not yet active</div>
    </div>
  </div>
</motion.div>
```

### 3. Rename "Total Released" to "Total Transferred"

```tsx
// BEFORE:
<motion.div className="rounded-2xl p-7">
  <div className="flex items-start justify-between mb-6">
    <div>
      <p className="text-sm font-medium mb-1" style={{ color: '#858585' }}>Total Released</p>
      <p className="font-title text-4xl font-bold tracking-tight" style={{ color: '#111827' }}>
        {formatCurrency(bonusWallet?.total_bonus_released)}
      </p>
    </div>
  </div>
  <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#ECFDF5' }}>
    <span className="text-xs font-medium" style={{ color: '#059669' }}>Lifetime earnings</span>
  </div>
</motion.div>

// AFTER:
<motion.div className="rounded-2xl p-7">
  <div className="flex items-start justify-between mb-6">
    <div>
      <p className="text-sm font-medium mb-1" style={{ color: '#858585' }}>Total Transferred</p>
      <p className="font-title text-4xl font-bold tracking-tight" style={{ color: '#111827' }}>
        {formatCurrency(bonusWallet?.total_bonus_transferred)}
      </p>
    </div>
    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FFFFFF' }}>
      <TrendingUp className="h-6 w-6" style={{ color: '#6B7280' }} />
    </div>
  </div>
  <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#ECFDF5' }}>
    <svg className="w-4 h-4" style={{ color: '#059669' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span className="text-xs font-medium" style={{ color: '#059669' }}>Transferred to main wallet</span>
  </div>
</motion.div>
```

### 4. Add Transfer Function

```typescript
// Add state
const [transferring, setTransferring] = useState(false);

// Add transfer function
const handleTransferToMain = async () => {
  if (!bonusWallet?.releasable_amount || bonusWallet.releasable_amount <= 0) {
    toast.error('No bonus funds available to transfer');
    return;
  }

  try {
    setTransferring(true);

    const response = await bonusAPI.transferToMain();

    if (response.data.success) {
      const transferred = response.data.data.transferred_amount;

      // Show success message
      toast.success(
        `Successfully transferred ${formatCurrency(transferred)} to main wallet!`,
        { duration: 4000 }
      );

      // Refresh all balance data
      await Promise.all([
        fetchBonusData(),
        refreshBalances()
      ]);
    }
  } catch (error) {
    console.error('Error transferring bonus:', error);
    const errorMessage = error.response?.data?.message || 'Failed to transfer bonus funds';
    toast.error(errorMessage);
  } finally {
    setTransferring(false);
  }
};
```

### 5. Update API Client

```typescript
// src/api/bonus.ts

export const bonusAPI = {
  // ... existing methods

  /**
   * Transfer completed bonus funds to main wallet
   * @param amount - Optional: specific amount to transfer (defaults to all releasable)
   */
  transferToMain: (amount?: number) => {
    const allTokens = localStorage.getItem("token");
    const token = JSON.parse(allTokens || "{}").access_token || "";

    return axios.post(
      '/api/bonus/transfer-to-main',
      amount ? { amount } : {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }
};
```

---

## Important Notes

### Balance Calculation Logic

**Main Wallet**:
- Shows ONLY the main wallet balance
- This is withdrawable funds
- Bonus funds are separate

**Bonus Wallet - Releasable Amount**:
- Calculated from completed bonuses (wagering done)
- Can be transferred to main wallet
- This is the main display in the Bonus Wallet card

**Bonus Wallet - Playable Balance**:
- Funds currently being wagered (active bonuses)
- Cannot be transferred until wagering is complete
- Shown in secondary section

**Bonus Wallet - Locked Balance**:
- Bonuses not yet activated
- Cannot be used or transferred
- Shown in secondary section

### User Flow

1. User claims a bonus (e.g., WELCOME100 - $100)
2. Bonus appears in "Active (Wagering)" section ($100)
3. User plays games, wagering requirement progresses
4. When wagering is complete:
   - Bonus status changes to "completed"
   - Funds move to "Available to Transfer" (releasable_amount)
   - User can click "Transfer to Main Wallet"
5. After transfer:
   - Main wallet increases by $100
   - Bonus wallet releasable_amount decreases to $0
   - Total Transferred increases by $100

### Error Handling

Handle these error cases:
- No releasable funds: Disable button, show tooltip
- Transfer in progress: Show loading state
- API error: Show error toast with message
- Network error: Show retry option

### Testing Checklist

After implementing:
- [ ] Total Balance shows only main wallet amount (matches actual balance)
- [ ] Bonus Wallet main display shows only releasable_amount
- [ ] Transfer button disabled when releasable_amount is 0
- [ ] Transfer button shows loading state during transfer
- [ ] Success toast shown after successful transfer
- [ ] Main wallet balance increases after transfer
- [ ] Bonus wallet releasable_amount decreases after transfer
- [ ] Total Transferred increments by transferred amount
- [ ] Active bonuses shown in secondary section
- [ ] Locked bonuses shown in secondary section

---

## Visual Design Guidelines

### Card Hierarchy
1. **Primary**: Releasable amount (biggest, most prominent)
2. **Secondary**: Active/wagering bonuses
3. **Tertiary**: Locked bonuses

### Colors
- **Releasable/Transfer**: Green (#10B981, #059669) - ready to transfer
- **Active/Wagering**: Orange (#F2590D) - in progress
- **Locked**: Gray (#6B7280) - pending

### Button States
- **Enabled**: Green gradient, hover effect
- **Disabled**: Gray (#E5E1DC), no hover
- **Loading**: Spinner animation, disabled

---

## Summary

This update fixes critical balance display issues and adds essential transfer functionality. The key changes are:

1. ✅ Total Balance now shows only main wallet (not main + bonus)
2. ✅ Bonus Wallet restructured with clear sections
3. ✅ Transfer functionality added for completed bonuses
4. ✅ Proper labeling ("Total Transferred" instead of "Total Released")

The backend is ready and deployed. Please implement these frontend changes to complete the bonus system update.
