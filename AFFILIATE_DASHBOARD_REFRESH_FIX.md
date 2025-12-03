# Affiliate Dashboard Refresh Fix

## Problem
The affiliate dashboard shows stale/cached data and doesn't refresh when new referrals are tracked.

## Root Causes
1. Dashboard data (`fetchDashboardData`) is only called when:
   - Component mounts (initial load)
   - User switches to dashboard tab
2. No auto-refresh or manual refresh button
3. Data doesn't update when user navigates back to the page

## Solution: Add Auto-Refresh + Manual Refresh Button

### Fix 1: Add Refresh Button to Dashboard

In `AffiliatePanelContent`, add a refresh function and pass it to `DashboardTab`:

```jsx
// In AffiliatePanelContent component, add this state:
const [refreshing, setRefreshing] = useState(false);

// Add refresh function:
const handleRefreshDashboard = async () => {
  setRefreshing(true);
  try {
    await fetchDashboardData();
    toast.success('Dashboard refreshed!');
  } catch (err) {
    console.error('Failed to refresh:', err);
    toast.error('Failed to refresh dashboard');
  } finally {
    setRefreshing(false);
  }
};

// Pass it to DashboardTab:
{activeTab === 'dashboard' && (
  <DashboardTab
    key="dashboard"
    dashboardData={dashboardData}
    profile={profile}
    copyToClipboard={copyToClipboard}
    onRefresh={handleRefreshDashboard}  // ← ADD THIS
    refreshing={refreshing}              // ← ADD THIS
  />
)}
```

### Fix 2: Update DashboardTab Component

Add refresh button to the top of `DashboardTab`:

```jsx
const DashboardTab = ({ dashboardData, profile, copyToClipboard, onRefresh, refreshing }) => {
  const overview = dashboardData?.overview || {};
  const recentReferrals = dashboardData?.recent_referrals || [];
  const recentCommissions = dashboardData?.recent_commissions || [];
  const monthlyChart = dashboardData?.monthly_chart_data || dashboardData?.monthly_chart || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      {/* ADD THIS: Refresh Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold" style={{ color: '#111827' }}>Dashboard Overview</h2>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-white transition-all duration-300"
          style={{
            background: refreshing ? '#D94E0C' : 'linear-gradient(135deg, #F2590D 0%, #FF7A3D 100%)',
            opacity: refreshing ? 0.7 : 1
          }}
        >
          {refreshing ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Refreshing...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </>
          )}
        </motion.button>
      </div>

      {/* Rest of dashboard content... */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stats cards... */}
      </div>
      {/* ... rest of component unchanged ... */}
    </motion.div>
  );
};
```

### Fix 3: Add Auto-Refresh on Tab Focus (Optional)

Add this to `AffiliatePanelContent` component to auto-refresh when user comes back to the page:

```jsx
// Add this useEffect to auto-refresh when tab becomes visible
useEffect(() => {
  if (!hasProfile) return;

  const handleVisibilityChange = () => {
    if (!document.hidden && activeTab === 'dashboard') {
      console.log('[Affiliate] Page became visible, refreshing dashboard...');
      fetchDashboardData();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, [hasProfile, activeTab]);
```

### Fix 4: Add Periodic Auto-Refresh (Optional)

Add auto-refresh every 30 seconds when dashboard tab is active:

```jsx
// Add this useEffect for periodic refresh
useEffect(() => {
  if (!hasProfile || activeTab !== 'dashboard') return;

  // Initial fetch
  fetchDashboardData();

  // Set up interval for auto-refresh every 30 seconds
  const intervalId = setInterval(() => {
    console.log('[Affiliate] Auto-refreshing dashboard...');
    fetchDashboardData();
  }, 30000); // 30 seconds

  return () => clearInterval(intervalId);
}, [hasProfile, activeTab]);
```

## Testing

After applying fixes:

1. **Test Manual Refresh:**
   - Go to dashboard
   - Click "Refresh" button
   - Should see updated stats

2. **Test Auto-Refresh:**
   - Leave page open
   - Wait 30 seconds
   - Should see console log: "[Affiliate] Auto-refreshing dashboard..."
   - Stats should update

3. **Test Registration Flow:**
   - Register new user with referral link
   - Go to affiliate dashboard
   - Click refresh
   - Should see `total_referrals` increase by 1

## Backend Verification

To manually verify referrals are being tracked:

```bash
# Check recent affiliate relationships
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db -c "
SELECT
    ar.id,
    ar.affiliate_id,
    ar.referred_user_id,
    ar.referral_code,
    u.username as referred_username,
    ar.created_at
FROM affiliate_relationships ar
LEFT JOIN users u ON u.id = ar.referred_user_id
ORDER BY ar.created_at DESC
LIMIT 5;
"

# Check affiliate stats
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db -c "
SELECT
    referral_code,
    display_name,
    total_referrals,
    total_commission_earned
FROM affiliate_profiles
WHERE referral_code = 'AFFNEWUSER1';
"
```

## Quick Fix Summary

**Minimum changes needed:**

1. Add `onRefresh` prop to `DashboardTab`
2. Add refresh button in dashboard UI
3. Call `fetchDashboardData()` when button clicked
4. Show loading state during refresh

**That's it!** Users can now manually refresh to see updated stats.
