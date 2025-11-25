# Game Performance API Fix

## Issue
The `/api/admin/bets/game-performance` endpoint was returning field names that didn't match the frontend's expected format, causing NaN (Not a Number) values to appear for "Total Bets" and "Wagered" amounts.

## Root Cause
The backend was returning camelCase field names (`totalBets`, `totalWagered`) while the frontend expected simpler field names (`bets`, `wagered`).

## Changes Made

### File: `src/services/admin/admin.bet-analytics.service.ts`

**Location:** Lines 177-235 (getGamePerformanceService function)

#### Key Changes:

1. **Field Name Standardization**
   - Changed `totalBets` → `bets`
   - Changed `totalWagered` → `wagered`
   - Changed `totalWon` → `won`
   - Removed unused fields: `provider`, `playerCount`, `popularity`

2. **SQL Query Improvements**
   - Fixed ROUND function syntax for PostgreSQL compatibility: `ROUND(CAST(... AS numeric), 2)`
   - Improved win rate calculation with proper NULL handling
   - Added HAVING clause to filter out games with no bets
   - Changed from `LEFT JOIN games` to `LEFT JOIN bets` for better performance

3. **Data Type Safety**
   - All numeric fields now default to 0 instead of NaN
   - Added `.toFixed(2)` for all currency values to ensure 2 decimal places
   - Proper `parseInt()` and `parseFloat()` conversions with fallback values

## Response Format

### Before (causing NaN):
```json
{
  "success": true,
  "data": [
    {
      "game": "Game Name",
      "totalBets": 100,
      "totalWagered": 5000.00,
      ...
    }
  ]
}
```

### After (Fixed):
```json
{
  "success": true,
  "data": [
    {
      "game": "Game Name",
      "bets": 100,
      "wagered": 5000.00,
      "won": 4500.00,
      "netProfit": 500.00,
      "avgBet": 50.00,
      "winRate": 45.50
    }
  ]
}
```

## Field Descriptions

| Field | Type | Description | Format |
|-------|------|-------------|--------|
| `game` | string | Game name | - |
| `bets` | integer | Total number of bets | Integer |
| `wagered` | number | Total amount wagered | 2 decimals |
| `won` | number | Total amount won by players | 2 decimals |
| `netProfit` | number | Casino profit (wagered - won) | 2 decimals |
| `avgBet` | number | Average bet amount | 2 decimals |
| `winRate` | number | Win rate percentage | 2 decimals |

## Edge Cases Handled

1. **Games with 0 bets**: Filtered out with `HAVING COUNT(b.id) > 0`
2. **Division by zero**: Protected with `CASE WHEN COUNT(b.id) > 0` checks
3. **NULL values**: All fields use `COALESCE()` with 0 as default
4. **NaN values**: All parsing operations have `|| 0` fallback
5. **Decimal precision**: All currency values formatted to 2 decimal places

## SQL Query Overview

```sql
SELECT
  g.name as game,
  COUNT(b.id) as bets,
  COALESCE(SUM(b.bet_amount), 0) as wagered,
  COALESCE(SUM(CASE WHEN b.outcome = 'win' THEN b.win_amount ELSE 0 END), 0) as won,
  COALESCE(SUM(b.bet_amount) - SUM(...), 0) as net_profit,
  CASE WHEN COUNT(b.id) > 0 THEN ... ELSE 0 END as avg_bet,
  CASE WHEN COUNT(b.id) > 0 THEN ROUND(CAST(... AS numeric), 2) ELSE 0 END as win_rate
FROM games g
LEFT JOIN bets b ON g.id = b.game_id
  AND b.placed_at >= NOW() - INTERVAL '...'
  AND b.outcome IN ('win', 'lose', 'loss')
GROUP BY g.id, g.name, g.provider
HAVING COUNT(b.id) > 0
ORDER BY net_profit DESC
LIMIT ...
```

## Testing

A test script (`test-game-performance.js`) was created to verify:
- ✅ Correct field names in response
- ✅ No NaN values in any field
- ✅ Proper decimal formatting (2 places)
- ✅ All numeric types are valid numbers
- ✅ SQL query executes without errors

### Test Results:
```
Found 2 games with betting activity

✅ All fields are properly formatted with correct field names
✅ No NaN values detected - all numeric fields are valid numbers
```

## Deployment Notes

- Changes are backward-compatible if frontend supports both field name formats
- No database migration required
- Server restart needed to apply changes (`npm run dev` or `pm2 restart`)
- Test with: `GET /api/admin/bets/game-performance?timeRange=7d&limit=5`

## Related Files

- Controller: `src/api/admin/admin.bet-analytics.controller.ts` (Line 95-133)
- Routes: `src/routes/admin.routes.ts`
- Service: `src/services/admin/admin.bet-analytics.service.ts` (Lines 177-235)

---

**Fixed by:** Claude Code
**Date:** 2025-11-25
**Issue:** NaN values in game performance statistics
**Status:** ✅ Resolved
