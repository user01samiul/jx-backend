-- Migration: Update existing KYC documents from local storage to CDN
-- This script is for reference only - existing documents remain accessible
-- New uploads will automatically use CDN storage

-- Step 1: Check existing documents with local URLs
SELECT
  id,
  user_id,
  file_name,
  file_url,
  status
FROM kyc_documents
WHERE file_url LIKE '/uploads/kyc/%'
ORDER BY created_at DESC;

-- Step 2: If you want to manually update URLs to CDN (after manually uploading files to CDN)
-- Uncomment and modify the following query:
/*
UPDATE kyc_documents
SET file_url = REPLACE(file_url, '/uploads/kyc/', 'https://cdn.jackpotx.net/cdnstorage/')
WHERE file_url LIKE '/uploads/kyc/%';
*/

-- Note: Before running the UPDATE, ensure all files in uploads/kyc/
-- have been manually uploaded to the CDN storage using the storage.php API
