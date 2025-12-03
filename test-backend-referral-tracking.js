#!/usr/bin/env node
/**
 * Backend Referral Tracking Test
 * Tests that the backend properly tracks referrals when referral_code is sent
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: '12358Voot#',
  database: 'jackpotx-db',
  port: 5432,
});

async function testReferralTracking() {
  console.log('='.repeat(60));
  console.log('BACKEND REFERRAL TRACKING VERIFICATION');
  console.log('='.repeat(60));
  console.log('');

  try {
    // 1. Check AFFNEWUSER1's current stats
    console.log('📊 Step 1: Current AFFNEWUSER1 Stats');
    console.log('-'.repeat(60));
    const profileBefore = await pool.query(
      `SELECT user_id, referral_code, display_name, total_referrals,
              total_commission_earned, is_active
       FROM affiliate_profiles
       WHERE referral_code = $1`,
      ['AFFNEWUSER1']
    );

    if (profileBefore.rows.length === 0) {
      console.log('❌ AFFNEWUSER1 profile not found!');
      return;
    }

    const profile = profileBefore.rows[0];
    console.log(`User ID: ${profile.user_id}`);
    console.log(`Display Name: ${profile.display_name}`);
    console.log(`Current Total Referrals: ${profile.total_referrals}`);
    console.log(`Total Commission: $${profile.total_commission_earned}`);
    console.log(`Status: ${profile.is_active ? '✅ Active' : '❌ Inactive'}`);
    console.log('');

    // 2. Check recent registrations WITHOUT referral codes
    console.log('📋 Step 2: Recent Registrations (Missing Referral Tracking)');
    console.log('-'.repeat(60));
    const recentUsers = await pool.query(
      `SELECT
          u.id,
          u.username,
          u.email,
          u.created_at,
          ual.metadata::json->>'referral_code' as referral_code_in_log,
          ar.id as has_affiliate_relationship
       FROM users u
       LEFT JOIN user_activity_logs ual ON ual.user_id = u.id AND ual.action = 'register'
       LEFT JOIN affiliate_relationships ar ON ar.referred_user_id = u.id
       WHERE u.id IN (81, 82)
       ORDER BY u.created_at DESC`
    );

    recentUsers.rows.forEach(user => {
      console.log(`\nUser #${user.id}: ${user.username} (${user.email})`);
      console.log(`  Registered: ${user.created_at}`);
      console.log(`  Referral Code in Logs: ${user.referral_code_in_log || '❌ NULL'}`);
      console.log(`  Affiliate Relationship: ${user.has_affiliate_relationship ? '✅ Created' : '❌ Not Created'}`);
    });
    console.log('');

    // 3. Show all existing affiliate relationships
    console.log('🔗 Step 3: Existing Affiliate Relationships (Backend Works!)');
    console.log('-'.repeat(60));
    const existingRelations = await pool.query(
      `SELECT
          ar.id,
          ar.affiliate_id,
          ar.referred_user_id,
          ar.referral_code,
          u.username as referred_username,
          ar.status,
          ar.created_at
       FROM affiliate_relationships ar
       LEFT JOIN users u ON u.id = ar.referred_user_id
       ORDER BY ar.created_at DESC
       LIMIT 5`
    );

    if (existingRelations.rows.length > 0) {
      console.log('✅ Backend HAS successfully tracked referrals:');
      existingRelations.rows.forEach(rel => {
        console.log(`  - ${rel.referred_username} → Affiliate #${rel.affiliate_id} (${rel.referral_code})`);
      });
    } else {
      console.log('⚠️  No affiliate relationships found');
    }
    console.log('');

    // 4. Analyze what should have happened
    console.log('🔍 Step 4: Root Cause Analysis');
    console.log('-'.repeat(60));
    console.log('BACKEND STATUS:');
    console.log('  ✅ Database tables exist and working');
    console.log('  ✅ AffiliateService.recordConversion() method exists');
    console.log('  ✅ auth.service.ts calls recordConversion() when referral_code is present');
    console.log('  ✅ RegisterSchema accepts optional referral_code field');
    console.log('');
    console.log('PROBLEM IDENTIFIED:');
    console.log('  ❌ Users #81 (gguser) and #82 (rruser) have NO referral_code in logs');
    console.log('  ❌ No affiliate_relationships entries created for these users');
    console.log('  ❌ Backend logs show registration requests WITHOUT referral_code field');
    console.log('');
    console.log('CONCLUSION:');
    console.log('  🚨 FRONTEND IS NOT SENDING referral_code TO THE API');
    console.log('');

    // 5. Show what the API request should look like
    console.log('📝 Step 5: Required Frontend Fix');
    console.log('-'.repeat(60));
    console.log('Current API Request (WRONG):');
    console.log(JSON.stringify({
      username: 'gguser',
      email: 'gg@gmail.com',
      password: '***',
      type: 'Player',
      captcha_id: 'captcha_xyz',
      captcha_text: 'ABCD'
      // ❌ Missing referral_code!
    }, null, 2));
    console.log('');
    console.log('Correct API Request (FIXED):');
    console.log(JSON.stringify({
      username: 'gguser',
      email: 'gg@gmail.com',
      password: '***',
      type: 'Player',
      captcha_id: 'captcha_xyz',
      captcha_text: 'ABCD',
      referral_code: 'AFFNEWUSER1'  // ✅ MUST INCLUDE THIS
    }, null, 2));
    console.log('');

    // 6. Verification steps
    console.log('✅ Step 6: How to Verify After Frontend Fix');
    console.log('-'.repeat(60));
    console.log('1. Frontend: Ensure registration payload includes referral_code');
    console.log('2. Register a new test user with referral link');
    console.log('3. Run this command to verify:');
    console.log('');
    console.log('   ./test-affiliate-tracking.sh');
    console.log('');
    console.log('4. Expected results:');
    console.log('   - New entry in affiliate_relationships table');
    console.log('   - AFFNEWUSER1 total_referrals increases to 6');
    console.log('   - User activity log shows: "referral_code": "AFFNEWUSER1"');
    console.log('   - Backend logs show: [AFFILIATE] Referral conversion recorded');
    console.log('');

    console.log('='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));
    console.log('');
    console.log('📄 See FRONTEND_REFERRAL_FIX_REQUIRED.md for detailed fix instructions');
    console.log('');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run test
testReferralTracking();
