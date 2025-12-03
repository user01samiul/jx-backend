const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/auth';

async function testUsernameCheck() {
  console.log('\n=== Testing Username Check Endpoint ===');

  // Test with existing username
  try {
    const response = await axios.get(`${BASE_URL}/check-username?username=newuser1`);
    console.log('✓ Existing username (newuser1):', response.data);
  } catch (error) {
    console.error('✗ Error:', error.response?.data || error.message);
  }

  // Test with available username
  try {
    const response = await axios.get(`${BASE_URL}/check-username?username=uniqueuser999`);
    console.log('✓ Available username (uniqueuser999):', response.data);
  } catch (error) {
    console.error('✗ Error:', error.response?.data || error.message);
  }

  // Test case-insensitivity
  try {
    const response = await axios.get(`${BASE_URL}/check-username?username=NEWUSER1`);
    console.log('✓ Case-insensitive (NEWUSER1):', response.data);
  } catch (error) {
    console.error('✗ Error:', error.response?.data || error.message);
  }

  // Test short username
  try {
    const response = await axios.get(`${BASE_URL}/check-username?username=ab`);
    console.log('✓ Short username (ab):', response.data);
  } catch (error) {
    console.error('✗ Error:', error.response?.data || error.message);
  }
}

async function testEmailCheck() {
  console.log('\n=== Testing Email Check Endpoint ===');

  // Test with existing email
  try {
    const response = await axios.get(`${BASE_URL}/check-email?email=newuser1@email.com`);
    console.log('✓ Existing email (newuser1@email.com):', response.data);
  } catch (error) {
    console.error('✗ Error:', error.response?.data || error.message);
  }

  // Test with available email
  try {
    const response = await axios.get(`${BASE_URL}/check-email?email=unique999@test.com`);
    console.log('✓ Available email (unique999@test.com):', response.data);
  } catch (error) {
    console.error('✗ Error:', error.response?.data || error.message);
  }

  // Test case-insensitivity
  try {
    const response = await axios.get(`${BASE_URL}/check-email?email=NEWUSER1@EMAIL.COM`);
    console.log('✓ Case-insensitive (NEWUSER1@EMAIL.COM):', response.data);
  } catch (error) {
    console.error('✗ Error:', error.response?.data || error.message);
  }

  // Test invalid email format
  try {
    const response = await axios.get(`${BASE_URL}/check-email?email=invalidemail`);
    console.log('✓ Invalid email format (invalidemail):', response.data);
  } catch (error) {
    console.error('✗ Error:', error.response?.data || error.message);
  }
}

async function testRegistrationUniqueness() {
  console.log('\n=== Testing Registration Uniqueness Validation ===');

  // Get captcha
  try {
    const captchaResponse = await axios.get(`${BASE_URL}/captcha`);
    const captchaId = captchaResponse.data.data.id;
    const captchaSvg = captchaResponse.data.data.svg;

    // Extract captcha text from SVG (simple regex - might not work for all captchas)
    const captchaMatch = captchaSvg.match(/>([A-Z0-9]{4})</);
    const captchaText = captchaMatch ? captchaMatch[1] : null;

    console.log('Captcha ID:', captchaId);
    console.log('Extracted Captcha Text:', captchaText);

    if (!captchaText) {
      console.log('⚠ Could not extract captcha text from SVG, skipping registration test');
      return;
    }

    // Try to register with existing username
    try {
      const response = await axios.post(`${BASE_URL}/register`, {
        username: 'newuser1',
        email: 'unique-email-test@test.com',
        password: 'password123',
        type: 'Player',
        captcha_id: captchaId,
        captcha_text: captchaText
      });
      console.log('✗ Registration should have failed with duplicate username:', response.data);
    } catch (error) {
      if (error.response?.status === 409 || error.response?.data?.message?.includes('Username already exists')) {
        console.log('✓ Registration correctly rejected duplicate username:', error.response.data);
      } else {
        console.error('✗ Unexpected error:', error.response?.data || error.message);
      }
    }

    // Get new captcha for email test
    const captchaResponse2 = await axios.get(`${BASE_URL}/captcha`);
    const captchaId2 = captchaResponse2.data.data.id;
    const captchaSvg2 = captchaResponse2.data.data.svg;
    const captchaMatch2 = captchaSvg2.match(/>([A-Z0-9]{4})</);
    const captchaText2 = captchaMatch2 ? captchaMatch2[1] : null;

    if (!captchaText2) {
      console.log('⚠ Could not extract second captcha text, skipping email test');
      return;
    }

    // Try to register with existing email
    try {
      const response = await axios.post(`${BASE_URL}/register`, {
        username: 'uniqueusername999',
        email: 'newuser1@email.com',
        password: 'password123',
        type: 'Player',
        captcha_id: captchaId2,
        captcha_text: captchaText2
      });
      console.log('✗ Registration should have failed with duplicate email:', response.data);
    } catch (error) {
      if (error.response?.status === 409 || error.response?.data?.message?.includes('Email already registered')) {
        console.log('✓ Registration correctly rejected duplicate email:', error.response.data);
      } else {
        console.error('✗ Unexpected error:', error.response?.data || error.message);
      }
    }

  } catch (error) {
    console.error('✗ Error in registration test:', error.response?.data || error.message);
  }
}

async function testRateLimiting() {
  console.log('\n=== Testing Rate Limiting ===');
  console.log('Making 12 requests to check-username endpoint (limit is 10 per minute)...');

  const requests = [];
  for (let i = 0; i < 12; i++) {
    requests.push(
      axios.get(`${BASE_URL}/check-username?username=test${i}`)
        .then(res => ({ status: res.status, success: true, i }))
        .catch(err => ({ status: err.response?.status, success: false, i, message: err.response?.data?.error_message }))
    );
  }

  const results = await Promise.all(requests);
  const rateLimited = results.filter(r => r.status === 429);
  const successful = results.filter(r => r.status === 200);

  console.log(`✓ Successful requests: ${successful.length}`);
  console.log(`✓ Rate limited requests: ${rateLimited.length}`);

  if (rateLimited.length > 0) {
    console.log('✓ Rate limiting is working correctly');
    console.log('Rate limit message:', rateLimited[0].message);
  } else {
    console.log('⚠ No rate limiting detected - might need more requests or timing adjustment');
  }
}

async function runAllTests() {
  try {
    await testUsernameCheck();
    await testEmailCheck();
    await testRegistrationUniqueness();
    await testRateLimiting();

    console.log('\n=== All Tests Completed ===\n');
  } catch (error) {
    console.error('Test execution error:', error);
  }
}

runAllTests();
