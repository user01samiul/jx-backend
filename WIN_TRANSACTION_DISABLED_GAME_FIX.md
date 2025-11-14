# WIN Transaction Disabled Game Fix

## Issue Description

When retrying WIN transactions on disabled games, the system was not properly validating the game status and was processing the retry normally instead of returning `OP_35: Game is disabled`.

## Root Cause

The game validation logic in `handleChangeBalance` was only executed when `game_id` was provided in the request:

```typescript
// --- GAME VALIDATION: Check if game is disabled FIRST (before any other processing) ---
if (game_id) {  // ← This condition was the problem
  // Game validation logic
}
```

For WIN transaction retries, especially when the original transaction was already processed, the `game_id` might not be provided in the retry request, which meant the game validation was completely bypassed.

## Solution

### 1. Enhanced Game Validation Logic

Modified the game validation to handle WIN transactions without `game_id` by extracting the `game_id` from the original transaction metadata:

```typescript
let gameToValidate = game_id;

// For WIN transactions without game_id, try to get game_id from original transaction
if (!gameToValidate && transactionType === 'WIN' && transaction_id) {
  try {
    const originalTransactionResult = await pool.query(
      'SELECT metadata FROM transactions WHERE external_reference = $1 AND user_id = $2 LIMIT 1',
      [transaction_id, user.user_id]
    );
    
    if (originalTransactionResult.rows.length > 0) {
      const metadata = originalTransactionResult.rows[0].metadata;
      if (metadata && typeof metadata === 'object' && metadata.game_id) {
        gameToValidate = metadata.game_id;
        console.log(`[DEBUG] CHANGEBALANCE: WIN transaction - extracted game_id ${gameToValidate} from original transaction metadata`);
      }
    }
  } catch (error) {
    console.log(`[DEBUG] CHANGEBALANCE: Could not extract game_id from original transaction: ${error.message}`);
  }
}

if (gameToValidate) {
  // Game validation logic using gameToValidate instead of game_id
}
```

### 2. Updated Idempotency Checks

Updated the idempotency checks to use the same enhanced game validation logic:

```typescript
// CRITICAL FIX: Check if game is disabled even for duplicate bets
if (gameToValidate) {  // ← Changed from game_id to gameToValidate
  try {
    const game = await this.getGameById(gameToValidate);
    // ... validation logic
  } catch (error: any) {
    if (error.message === 'OP_35: Game is disabled') {
      return this.createErrorResponseWrapped(request, 'OP_35', 'Game is disabled');
    }
  }
}
```

### 3. Updated Category Resolution

Updated the category resolution logic to use the validated game information:

```typescript
if (gameToValidate) {  // ← Changed from game_id to gameToValidate
  const gameResult = await pool.query("SELECT * FROM games WHERE id = $1", [gameToValidate]);
  // ... category resolution logic
}
```

## Testing

Created two test scripts to verify the fix:

1. **`test-disabled-game-win.js`** - Tests WIN transactions with `game_id` on disabled games
2. **`test-disabled-game-win-no-gameid.js`** - Tests WIN transactions without `game_id` (retry scenario) on disabled games

Both tests should return `OP_35: Game is disabled` for disabled games.

## Files Modified

- `src/services/provider/provider-callback.service.ts` - Main fix implementation

## Expected Behavior

- **Before Fix**: WIN transactions on disabled games were processed normally, potentially causing balance inconsistencies
- **After Fix**: WIN transactions on disabled games return `OP_35: Game is disabled` error, regardless of whether `game_id` is provided in the request

## Impact

This fix ensures that:
1. WIN transaction retries on disabled games are properly rejected
2. Balance consistency is maintained
3. The provider receives the correct error code (`OP_35`) for disabled games
4. The system follows proper game status validation for all transaction types 