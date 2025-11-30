# Free Spins Campaigns Not Showing - Troubleshooting Guide

## Issue

After clicking "Add All Players" in the admin panel and seeing a success message, the user frontend (`/api/campaigns/user/me`) returns an empty array `{"success":true,"data":[]}`.

## Root Cause Analysis

The backend is working correctly and the data IS being inserted into the database. The issue is that **the logged-in user doesn't have campaigns assigned to their account**.

When you click "Add All Players", it adds campaigns to **all active users in the database** (users with `status_id = 1`). However, your logged-in admin account might not be in that list, or might have a different user ID than you expect.

## Verification Steps

### Step 1: Check Which User You're Logged In As

```bash
# Make a request to get your user info
curl -X GET "https://backend.jackpotx.net/api/user/profile" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

This will show you your `user_id`.

### Step 2: Use the Debug Endpoint

I've added a debug endpoint at `/api/campaigns/user/me/debug`. To use it:

1. **Compile the updated code:**
   ```bash
   cd /var/www/html/backend.jackpotx.net
   npm run build
   pm2 restart backend
   ```

2. **Call the debug endpoint from your frontend or Postman:**
   ```
   GET https://backend.jackpotx.net/api/campaigns/user/me/debug
   Headers:
     Authorization: Bearer YOUR_ACCESS_TOKEN
   ```

3. **The response will show:**
   - Your user ID
   - All campaigns assigned to you (without filters)
   - Campaigns that pass the filters (pending/active + not expired)
   - Current server timestamp

### Step 3: Check the Database Directly

```bash
node -e "
const pool = require('./dist/db/postgres').default;

(async () => {
  try {
    // Replace 123 with your actual user ID
    const userId = 123;

    const result = await pool.query(\`
      SELECT
        id, campaign_code, status,
        begins_at, expires_at,
        freespins_remaining, created_at
      FROM user_free_spins_campaigns
      WHERE user_id = \$1
      ORDER BY created_at DESC
    \`, [userId]);

    console.log('Campaigns for user', userId, ':', result.rows);

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
"
```

## Solution

### Option 1: Add Campaigns to Your Specific User

If you know your user ID (let's say it's `123`):

```bash
node -e "
const pool = require('./dist/db/postgres').default;

(async () => {
  try {
    const userId = 123; // YOUR USER ID HERE
    const campaignCode = '3OAKS_1764307235364'; // Campaign code

    // Get campaign details
    const campaign = await pool.query(\`
      SELECT c.*, cg.game_id, cg.total_bet
      FROM campaigns c
      LEFT JOIN campaign_games cg ON c.id = cg.campaign_id
      WHERE c.campaign_code = \$1
      LIMIT 1
    \`, [campaignCode]);

    if (campaign.rows.length === 0) {
      console.log('Campaign not found');
      process.exit(1);
    }

    const camp = campaign.rows[0];

    // Insert into user_free_spins_campaigns
    await pool.query(\`
      INSERT INTO user_free_spins_campaigns (
        user_id, campaign_code, source, vendor, game_id, currency_code,
        freespins_total, freespins_remaining, total_bet_amount,
        status, begins_at, expires_at
      ) VALUES (\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8, \$9, \$10, \$11, \$12)
      ON CONFLICT (user_id, campaign_code) DO NOTHING
    \`, [
      userId,
      campaignCode,
      'manual',
      camp.vendor_name,
      camp.game_id,
      camp.currency_code,
      camp.freespins_per_player,
      camp.freespins_per_player,
      camp.total_bet * camp.freespins_per_player,
      'pending',
      camp.begins_at,
      camp.expires_at
    ]);

    console.log('Campaign added to user', userId);
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
"
```

### Option 2: Check if Your User Account is Active

The "Add All Players" endpoint only adds campaigns to users with `status_id = 1` (Active). Check your user status:

```bash
node -e "
const pool = require('./dist/db/postgres').default;

(async () => {
  try {
    const userId = 123; // YOUR USER ID

    const result = await pool.query(\`
      SELECT id, username, email, status_id
      FROM users
      WHERE id = \$1
    \`, [userId]);

    console.log('User info:', result.rows[0]);

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
"
```

If `status_id` is not `1`, you need to either:
- Change your user status to active (`UPDATE users SET status_id = 1 WHERE id = 123`)
- Or manually add the campaign to your user using Option 1

### Option 3: Create a Test User Account

1. Create a regular user account (not admin) in the frontend
2. Log in with that account
3. The campaigns should show up if "Add All Players" was run successfully

## Common Issues

### Issue 1: Admin Accounts Not in Active Users List

**Symptom**: "Add All Players" adds campaigns to 57 users, but your admin account doesn't see them.

**Cause**: Your admin account might have a special status that excludes it from the "active users" query.

**Solution**: Manually add the campaign to your admin user using Option 1 above.

### Issue 2: Campaign Dates in the Past

**Symptom**: Campaigns exist but don't show in frontend.

**Cause**: The campaign's `expires_at` date is in the past, or `begins_at` is in the future.

**Solution**: Check campaign dates and create a new campaign with valid dates.

### Issue 3: Frontend Calling Wrong Endpoint

**Symptom**: The API returns empty even though data exists.

**Cause**: Frontend might be calling `/api/campaigns/user/:userId` with the wrong user ID.

**Solution**: Update frontend to use `/api/campaigns/user/me` which automatically uses the authenticated user's ID.

## Testing the Fix

After implementing any solution:

1. **Rebuild and restart:**
   ```bash
   npm run build
   pm2 restart backend
   ```

2. **Clear frontend cache and refresh**

3. **Check the debug endpoint:**
   ```
   GET /api/campaigns/user/me/debug
   ```

4. **Check the regular endpoint:**
   ```
   GET /api/campaigns/user/me
   ```

5. **Frontend should now show campaigns**

## Summary

The backend system is working correctly. The issue is that **the specific user account you're logged in with doesn't have campaigns assigned**. Use the debug endpoint or database queries to:

1. Identify your user ID
2. Check if campaigns exist for that user
3. Manually add campaigns if needed
4. Verify the dates are correct

The "Add All Players" function works, but it only adds to active users (`status_id = 1`). Make sure your test user account is in that list.
