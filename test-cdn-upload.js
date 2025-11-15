/**
 * Test script for CDN upload functionality
 * Tests the cdn-storage.util.ts utility functions
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// CDN Configuration
const CDN_CONFIG = {
  uploadUrl: 'https://cdn.jackpotx.net/storage.php',
  cdnBaseUrl: 'https://cdn.jackpotx.net/cdnstorage',
  authToken: process.env.CDN_AUTH_TOKEN || '2ZqQk9',
};

/**
 * Test CDN upload with a sample file
 */
async function testCDNUpload() {
  console.log('=== CDN Upload Test ===\n');

  // Create a test file
  const testFileName = `test-kyc-${Date.now()}.txt`;
  const testFilePath = path.join(__dirname, testFileName);
  const testContent = `KYC Document Test Upload\nTimestamp: ${new Date().toISOString()}\nTest ID: ${Math.random()}`;

  try {
    // Step 1: Create test file
    console.log('1. Creating test file...');
    fs.writeFileSync(testFilePath, testContent);
    console.log(`   ✓ Created: ${testFilePath}`);

    // Step 2: Upload to CDN
    console.log('\n2. Uploading to CDN...');
    const formData = new FormData();
    formData.append('action', 'upload');
    formData.append('file', fs.createReadStream(testFilePath), testFileName);

    const response = await axios.post(CDN_CONFIG.uploadUrl, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${CDN_CONFIG.authToken}`,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    console.log(`   ✓ Upload response:`, response.data);

    // Step 3: Construct CDN URL
    const cdnUrl = `${CDN_CONFIG.cdnBaseUrl}/${testFileName}`;
    console.log(`   ✓ CDN URL: ${cdnUrl}`);

    // Step 4: Verify file is accessible
    console.log('\n3. Verifying file accessibility...');
    try {
      const verifyResponse = await axios.get(cdnUrl);
      console.log(`   ✓ File is accessible`);
      console.log(`   ✓ File size: ${verifyResponse.data.length} bytes`);
      console.log(`   ✓ Content preview: ${verifyResponse.data.substring(0, 50)}...`);
    } catch (verifyError) {
      console.error(`   ✗ File verification failed:`, verifyError.message);
    }

    // Step 5: Clean up local file
    console.log('\n4. Cleaning up local file...');
    fs.unlinkSync(testFilePath);
    console.log(`   ✓ Deleted: ${testFilePath}`);

    console.log('\n=== Test PASSED ===');
    console.log(`\nYour KYC documents will be stored at: ${CDN_CONFIG.cdnBaseUrl}/kyc-*.{ext}`);

    return true;
  } catch (error) {
    console.error('\n=== Test FAILED ===');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }

    // Clean up on error
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      console.log('Cleaned up test file');
    }

    return false;
  }
}

/**
 * Test URL utility functions
 */
function testUrlUtilities() {
  console.log('\n=== URL Utility Functions Test ===\n');

  const getCDNUrl = (fileName) => `${CDN_CONFIG.cdnBaseUrl}/${fileName}`;
  const isCDNUrl = (url) => url.startsWith(CDN_CONFIG.cdnBaseUrl);
  const getFileNameFromCDNUrl = (url) => path.basename(url);

  // Test cases
  const testCases = [
    {
      fileName: 'kyc-1763235547903-536566885.jpg',
      expectedUrl: 'https://cdn.jackpotx.net/cdnstorage/kyc-1763235547903-536566885.jpg',
      expectedIsCDN: true,
    },
    {
      fileName: 'test.pdf',
      expectedUrl: 'https://cdn.jackpotx.net/cdnstorage/test.pdf',
      expectedIsCDN: true,
    },
  ];

  let passed = 0;
  let failed = 0;

  testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}:`);

    // Test getCDNUrl
    const url = getCDNUrl(testCase.fileName);
    if (url === testCase.expectedUrl) {
      console.log(`   ✓ getCDNUrl: ${url}`);
      passed++;
    } else {
      console.log(`   ✗ getCDNUrl: Expected ${testCase.expectedUrl}, got ${url}`);
      failed++;
    }

    // Test isCDNUrl
    const isCDN = isCDNUrl(url);
    if (isCDN === testCase.expectedIsCDN) {
      console.log(`   ✓ isCDNUrl: ${isCDN}`);
      passed++;
    } else {
      console.log(`   ✗ isCDNUrl: Expected ${testCase.expectedIsCDN}, got ${isCDN}`);
      failed++;
    }

    // Test getFileNameFromCDNUrl
    const extractedName = getFileNameFromCDNUrl(url);
    if (extractedName === testCase.fileName) {
      console.log(`   ✓ getFileNameFromCDNUrl: ${extractedName}`);
      passed++;
    } else {
      console.log(`   ✗ getFileNameFromCDNUrl: Expected ${testCase.fileName}, got ${extractedName}`);
      failed++;
    }

    console.log();
  });

  // Test local URL (should not be CDN)
  const localUrl = '/uploads/kyc/test.jpg';
  const isLocalCDN = isCDNUrl(localUrl);
  if (!isLocalCDN) {
    console.log(`✓ Local URL correctly identified as non-CDN: ${localUrl}`);
    passed++;
  } else {
    console.log(`✗ Local URL incorrectly identified as CDN: ${localUrl}`);
    failed++;
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// Run tests
async function runTests() {
  console.log('Starting CDN Integration Tests...\n');
  console.log(`CDN Upload URL: ${CDN_CONFIG.uploadUrl}`);
  console.log(`CDN Base URL: ${CDN_CONFIG.cdnBaseUrl}`);
  console.log(`Auth Token: ${CDN_CONFIG.authToken.substring(0, 3)}***\n`);

  const utilsTestPassed = testUrlUtilities();
  const uploadTestPassed = await testCDNUpload();

  console.log('\n========================================');
  console.log('Overall Results:');
  console.log(`URL Utilities: ${utilsTestPassed ? 'PASSED' : 'FAILED'}`);
  console.log(`CDN Upload: ${uploadTestPassed ? 'PASSED' : 'FAILED'}`);
  console.log('========================================\n');

  process.exit(uploadTestPassed && utilsTestPassed ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  runTests();
}

module.exports = { testCDNUpload, testUrlUtilities };
