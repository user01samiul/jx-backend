-- ============================================================================
-- KYC Data Cleanup Script
-- Purpose: Remove all KYC data for fresh testing
-- Date: 2025-11-16
-- WARNING: This will delete ALL KYC data. Use only for testing!
-- ============================================================================

-- Step 1: Display current KYC data counts (before cleanup)
SELECT
  'kyc_documents' as table_name,
  COUNT(*) as record_count
FROM kyc_documents
UNION ALL
SELECT
  'kyc_verifications' as table_name,
  COUNT(*) as record_count
FROM kyc_verifications
UNION ALL
SELECT
  'kyc_risk_assessments' as table_name,
  COUNT(*) as record_count
FROM kyc_risk_assessments
UNION ALL
SELECT
  'kyc_audit_logs' as table_name,
  COUNT(*) as record_count
FROM kyc_audit_logs;

-- Step 2: Delete all KYC data (cascade order - child tables first)

-- Delete audit logs
DELETE FROM kyc_audit_logs;

-- Delete risk assessments
DELETE FROM kyc_risk_assessments;

-- Delete KYC documents
DELETE FROM kyc_documents;

-- Delete KYC verifications
DELETE FROM kyc_verifications;

-- Step 3: Reset user KYC status fields
UPDATE users
SET
  kyc_verified = false,
  kyc_verified_at = NULL,
  kyc_status = NULL
WHERE kyc_verified = true OR kyc_verified_at IS NOT NULL OR kyc_status IS NOT NULL;

-- Reset user profiles verification level
UPDATE user_profiles
SET
  verification_level = 0,
  is_verified = false
WHERE verification_level > 0 OR is_verified = true;

-- Step 4: Reset sequence IDs (optional - for clean ID numbering)
ALTER SEQUENCE kyc_documents_id_seq RESTART WITH 1;
ALTER SEQUENCE kyc_verifications_id_seq RESTART WITH 1;
ALTER SEQUENCE kyc_risk_assessments_id_seq RESTART WITH 1;
ALTER SEQUENCE kyc_audit_logs_id_seq RESTART WITH 1;

-- Step 5: Display final counts (should all be 0)
SELECT
  'kyc_documents' as table_name,
  COUNT(*) as record_count,
  'AFTER CLEANUP' as status
FROM kyc_documents
UNION ALL
SELECT
  'kyc_verifications' as table_name,
  COUNT(*) as record_count,
  'AFTER CLEANUP' as status
FROM kyc_verifications
UNION ALL
SELECT
  'kyc_risk_assessments' as table_name,
  COUNT(*) as record_count,
  'AFTER CLEANUP' as status
FROM kyc_risk_assessments
UNION ALL
SELECT
  'kyc_audit_logs' as table_name,
  COUNT(*) as record_count,
  'AFTER CLEANUP' as status
FROM kyc_audit_logs;

-- Step 6: Display affected users count
SELECT
  COUNT(*) as users_reset_count,
  'Users with KYC status reset' as description
FROM users
WHERE kyc_verified = false AND kyc_status IS NULL;

-- Success message
SELECT 'KYC Data Cleanup Completed Successfully!' as message;
