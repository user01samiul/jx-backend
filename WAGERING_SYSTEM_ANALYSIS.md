# Wagering Contribution System - Complete Analysis & Integration Plan

## Current Status: ✅ SYSTEM BUILT | ❌ NOT INTEGRATED

### What's Working ✅

1. **Database Schema** - Complete
   - `game_contributions` table (game-specific settings)
   - `game_category_contributions` table (category-level settings)
   - `bonus_wager_progress` table (tracks contributions by category)

2. **Backend Services** - Complete
   - `WageringEngineService.getGameContribution()` - 3-tier priority (Game > Category > Default)
   - `WageringEngineService.calculateWagerContribution()` - Calculates contribution from game code
   - `WageringEngineService.processBetWagering()` - Updates wagering progress by category

3. **Admin API Endpoints** - Complete
   - Game contribution CRUD
   - Category contribution CRUD
   - Available categories endpoint

4. **Frontend Admin Page** - Complete
   - Game contributions management
   - Category contributions management
   - Tab-based interface

### Critical Issue: ❌ WAGERING NOT INTEGRATED WITH GAME PLAY

**Problem:** When players place bets in games, the provider callback service does NOT call the wagering engine to process wagering progress.

**Impact:**
- ✅ Admins can configure game/category contributions
- ❌ But bets placed in games don't contribute to bonus wagering
- ❌ Bonus wagering progress doesn't update when playing

**Root Cause:** `/src/services/provider/provider-callback.service.ts` handles BET transactions but doesn't call `WageringEngineService.processBetWagering()`

---

## Required Fix: Integrate Wagering with Provider Callback

### File to Modify: `/src/services/provider/provider-callback.service.ts`

**Changes needed:**

1. **Import wagering service** (at top of file):
```typescript
import { WageringEngineService } from '../bonus/wagering-engine.service';
```

2. **Get active bonuses for user** (in CHANGEBALANCE handler):
```typescript
// After user validation and before balance update
if (transactionType === 'BET') {
  // Get active bonuses for this user
  const activeBonusesResult = await pool.query(
    `SELECT id FROM bonus_instances
     WHERE player_id = $1
     AND status IN ('active', 'wagering')
     AND expires_at > NOW()
     ORDER BY granted_at ASC`,
    [user.user_id]
  );

  if (activeBonusesResult.rows.length > 0) {
    // Process wagering for each active bonus
    for (const bonus of activeBonusesResult.rows) {
      try {
        await WageringEngineService.processBetWagering(
          bonus.id,           // bonus_instance_id
          user.user_id,       // player_id
          game_id,            // game_code (from provider callback params)
          Math.abs(parsedAmount) // bet amount (positive)
        );
        console.log(`[WAGERING] Processed bet for bonus ${bonus.id}, amount: ${Math.abs(parsedAmount)}`);
      } catch (wageringError) {
        console.error(`[WAGERING] Error processing wagering for bonus ${bonus.id}:`, wageringError);
        // Don't fail the bet transaction if wagering fails - just log it
      }
    }
  }
}
```

3. **Ensure game_id (game_code) is available:**
   - The provider callback receives `game_id` parameter
   - This should be the game's code (e.g., "SLOT_STARBURST", "26", etc.)
   - Pass this to `processBetWagering()`

### Where to Add This Code:

**Location:** Around line 900-950 in `provider-callback.service.ts`, after user validation but before the balance update transaction.

**Exact placement:**
```typescript
// After user status validation (line ~750)
// Before the main balance update logic (line ~900+)

// ADD WAGERING PROCESSING HERE:
if (transactionType === 'BET') {
  // Check for active bonuses and process wagering
  // [INSERT CODE FROM ABOVE]
}

// Then continue with existing balance update logic...
```

---

## Frontend Enhancement: Display Category Contributions

### File to Modify: `BonusWallet.jsx` (user frontend)

**Add category breakdown to wagering progress display:**

```jsx
{/* In the "Active Bonuses" tab, inside the bonus card */}
{progress && (
  <div className="mt-4 pt-4" style={{ borderTop: '1px solid #E5E1DC' }}>
    <div className="text-sm font-medium mb-3" style={{ color: '#858585' }}>
      Wagering Contributions by Game Type:
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-lg p-3" style={{ backgroundColor: '#F9F7F6' }}>
        <div className="text-xs font-medium mb-1" style={{ color: '#858585' }}>Slots</div>
        <div className="font-bold" style={{ color: '#111827' }}>
          {formatCurrency(progress.slots_contribution || 0)}
        </div>
      </div>
      <div className="rounded-lg p-3" style={{ backgroundColor: '#F9F7F6' }}>
        <div className="text-xs font-medium mb-1" style={{ color: '#858585' }}>Table Games</div>
        <div className="font-bold" style={{ color: '#111827' }}>
          {formatCurrency(progress.table_games_contribution || 0)}
        </div>
      </div>
      <div className="rounded-lg p-3" style={{ backgroundColor: '#F9F7F6' }}>
        <div className="text-xs font-medium mb-1" style={{ color: '#858585' }}>Live Casino</div>
        <div className="font-bold" style={{ color: '#111827' }}>
          {formatCurrency(progress.live_casino_contribution || 0)}
        </div>
      </div>
      <div className="rounded-lg p-3" style={{ backgroundColor: '#F9F7F6' }}>
        <div className="text-xs font-medium mb-1" style={{ color: '#858585' }}>Video Poker</div>
        <div className="font-bold" style={{ color: '#111827' }}>
          {formatCurrency(progress.video_poker_contribution || 0)}
        </div>
      </div>
      <div className="rounded-lg p-3" style={{ backgroundColor: '#F9F7F6' }}>
        <div className="text-xs font-medium mb-1" style={{ color: '#858585' }}>Other Games</div>
        <div className="font-bold" style={{ color: '#111827' }}>
          {formatCurrency(progress.other_games_contribution || 0)}
        </div>
      </div>
    </div>

    {/* Visual pie chart or bars showing category distribution */}
    <div className="mt-3">
      <div className="text-xs font-medium mb-2" style={{ color: '#858585' }}>
        Contribution Breakdown
      </div>
      <div className="flex gap-1 h-3 rounded-full overflow-hidden">
        {/* Slots */}
        <div
          className="bg-blue-500"
          style={{
            width: `${(progress.slots_contribution / (progress.current_wager_amount || 1)) * 100}%`,
            minWidth: progress.slots_contribution > 0 ? '2%' : '0%'
          }}
          title={`Slots: ${formatCurrency(progress.slots_contribution)}`}
        ></div>
        {/* Table Games */}
        <div
          className="bg-green-500"
          style={{
            width: `${(progress.table_games_contribution / (progress.current_wager_amount || 1)) * 100}%`,
            minWidth: progress.table_games_contribution > 0 ? '2%' : '0%'
          }}
          title={`Table Games: ${formatCurrency(progress.table_games_contribution)}`}
        ></div>
        {/* Live Casino */}
        <div
          className="bg-purple-500"
          style={{
            width: `${(progress.live_casino_contribution / (progress.current_wager_amount || 1)) * 100}%`,
            minWidth: progress.live_casino_contribution > 0 ? '2%' : '0%'
          }}
          title={`Live Casino: ${formatCurrency(progress.live_casino_contribution)}`}
        ></div>
        {/* Video Poker */}
        <div
          className="bg-yellow-500"
          style={{
            width: `${(progress.video_poker_contribution / (progress.current_wager_amount || 1)) * 100}%`,
            minWidth: progress.video_poker_contribution > 0 ? '2%' : '0%'
          }}
          title={`Video Poker: ${formatCurrency(progress.video_poker_contribution)}`}
        ></div>
        {/* Other */}
        <div
          className="bg-gray-500"
          style={{
            width: `${(progress.other_games_contribution / (progress.current_wager_amount || 1)) * 100}%`,
            minWidth: progress.other_games_contribution > 0 ? '2%' : '0%'
          }}
          title={`Other: ${formatCurrency(progress.other_games_contribution)}`}
        ></div>
      </div>
      <div className="flex justify-between text-xs mt-1" style={{ color: '#858585' }}>
        <span>🔵 Slots</span>
        <span>🟢 Table</span>
        <span>🟣 Live</span>
        <span>🟡 Poker</span>
        <span>⚪ Other</span>
      </div>
    </div>
  </div>
)}
```

---

## Testing Checklist

### Backend Testing

1. ✅ **Test Category Contributions**
   ```bash
   node test-category-contributions.js
   ```

2. ❌ **Test Wagering Integration** (after fixing provider callback)
   - Create a test bonus
   - Play a game and place a bet
   - Check wagering progress updates
   - Verify category contributions are tracked

3. ✅ **Test Priority System**
   - Set category contribution: `table_games` = 20%
   - Set game-specific contribution for a blackjack game = 50%
   - Verify game-specific takes priority

### Frontend Testing

1. **Admin Panel**
   - ✅ Add game contribution
   - ✅ Add category contribution
   - ✅ Delete contributions
   - ✅ Verify tabs work

2. **User Bonus Wallet** (after wagering integration)
   - Apply bonus code
   - Play games from different categories
   - Verify wagering progress updates
   - Verify category contributions display correctly

---

## Summary

| Component | Status | Action Required |
|-----------|--------|-----------------|
| Database Schema | ✅ Complete | None |
| Wagering Engine Service | ✅ Complete | None |
| Game/Category Admin API | ✅ Complete | None |
| Admin Frontend | ✅ Complete | None |
| **Provider Callback Integration** | ❌ **MISSING** | **ADD WAGERING CALLS** |
| User Frontend Category Display | ⚠️ Partial | Enhance UI |

**Next Steps:**
1. ✅ Fix provider callback to call wagering engine on BET transactions
2. ✅ Add category contribution breakdown to bonus wallet page
3. ✅ Test end-to-end workflow
4. ✅ Monitor wagering processing in production logs
