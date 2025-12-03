#!/bin/bash
# Affiliate Referral Tracking Verification Script

echo "=================================="
echo "AFFILIATE REFERRAL TRACKING TEST"
echo "=================================="
echo ""

# Check recent registrations
echo "📊 Recent User Registrations (last 5):"
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db -c "
SELECT id, username, email, created_at
FROM users
ORDER BY created_at DESC
LIMIT 5;
"
echo ""

# Check affiliate relationships
echo "🔗 Recent Affiliate Relationships:"
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db -c "
SELECT
    ar.id,
    ar.affiliate_id,
    ar.referred_user_id,
    ar.referral_code,
    ar.status,
    ar.level,
    u.username as referred_username,
    ar.created_at
FROM affiliate_relationships ar
LEFT JOIN users u ON u.id = ar.referred_user_id
ORDER BY ar.created_at DESC
LIMIT 5;
"
echo ""

# Check affiliate profile stats
echo "📈 Affiliate Profile Stats (AFFNEWUSER1):"
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db -c "
SELECT
    user_id,
    referral_code,
    display_name,
    total_referrals,
    total_commission_earned,
    total_payouts_received,
    is_active
FROM affiliate_profiles
WHERE referral_code = 'AFFNEWUSER1';
"
echo ""

# Check commissions
echo "💰 Recent Commissions:"
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db -c "
SELECT
    id,
    affiliate_id,
    referred_user_id,
    amount,
    type,
    status,
    created_at
FROM affiliate_commissions
ORDER BY created_at DESC
LIMIT 5;
"
echo ""

# Check user activity logs for referral tracking
echo "📝 User Activity Logs (recent registrations with referral info):"
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db -c "
SELECT
    user_id,
    action,
    category,
    description,
    metadata::json->>'referral_code' as referral_code,
    created_at
FROM user_activity_logs
WHERE action = 'register'
ORDER BY created_at DESC
LIMIT 5;
"
echo ""

echo "✅ Test Complete!"
echo ""
echo "📋 WHAT TO LOOK FOR:"
echo "  1. New user should appear in 'Recent User Registrations'"
echo "  2. 'Recent Affiliate Relationships' should show new entry with:"
echo "     - affiliate_id matching AFFNEWUSER1's user_id (23)"
echo "     - referred_user_id matching the new user's id"
echo "     - referral_code = 'AFFNEWUSER1'"
echo "  3. AFFNEWUSER1's total_referrals should increase by 1"
echo "  4. User activity log should show referral_code in metadata"
echo ""
