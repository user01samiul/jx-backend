/**
 * Test Currency Conversion using CoinGecko API
 *
 * This script tests the USD to crypto conversion using CoinGecko's free API
 */

const axios = require('axios');

// Currency mapping (same as in payment-integration.service.ts)
const currencyMap = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'LTC': 'litecoin',
  'BCH': 'bitcoin-cash',
  'XRP': 'ripple',
  'TRX': 'tron',
  'BNB': 'binancecoin',
  'ADA': 'cardano',
  'SOL': 'solana',
  'DOT': 'polkadot',
  'DOGE': 'dogecoin',
  'MATIC': 'matic-network',
  'SHIB': 'shiba-inu',
  'AVAX': 'avalanche-2',
  'UNI': 'uniswap',
  'LINK': 'chainlink',
  'XLM': 'stellar',
  'ATOM': 'cosmos',
  'ETC': 'ethereum-classic',
  'XMR': 'monero',
  'TON': 'the-open-network'
};

// Test conversion function
async function testConversion(usdAmount, targetCurrency) {
  try {
    console.log('\n=== Testing Conversion ===');
    console.log(`Converting $${usdAmount} USD to ${targetCurrency}`);

    // Check if it's a stablecoin (no conversion needed)
    const stablecoins = ['USDT', 'USDC', 'BUSD', 'DAI', 'USDD'];
    if (stablecoins.includes(targetCurrency.toUpperCase())) {
      console.log('✓ Stablecoin detected - no conversion needed (1:1 with USD)');
      console.log(`  USD Amount: $${usdAmount}`);
      console.log(`  Crypto Amount: ${usdAmount} ${targetCurrency}`);
      console.log(`  Exchange Rate: 1.00`);
      return {
        success: true,
        cryptoAmount: usdAmount,
        rate: 1.0
      };
    }

    // Get CoinGecko ID for the currency
    const coinId = currencyMap[targetCurrency.toUpperCase()];
    if (!coinId) {
      throw new Error(`Unsupported currency: ${targetCurrency}`);
    }

    // Call CoinGecko API (Free, no API key needed!)
    const endpoint = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;

    console.log('API Endpoint:', endpoint);

    const response = await axios.get(endpoint, {
      timeout: 10000,
      headers: { 'Accept': 'application/json' }
    });

    console.log('Response:', JSON.stringify(response.data, null, 2));

    // Extract price
    const cryptoPrice = response.data?.[coinId]?.usd;

    if (!cryptoPrice || cryptoPrice <= 0) {
      throw new Error(`Failed to get price for ${targetCurrency}`);
    }

    // Calculate crypto amount
    const cryptoAmount = usdAmount / cryptoPrice;

    // Determine precision
    let precision = 8;
    if (cryptoPrice >= 1000) precision = 6;
    else if (cryptoPrice >= 1) precision = 4;
    else if (cryptoPrice >= 0.01) precision = 2;

    const roundedAmount = parseFloat(cryptoAmount.toFixed(precision));

    console.log(`✓ Conversion successful:`);
    console.log(`  USD Amount: $${usdAmount}`);
    console.log(`  ${targetCurrency} Price: $${cryptoPrice.toLocaleString()}`);
    console.log(`  Crypto Amount: ${roundedAmount} ${targetCurrency}`);
    console.log(`  Precision: ${precision} decimals`);

    return {
      success: true,
      cryptoAmount: roundedAmount,
      rate: cryptoPrice
    };

  } catch (error) {
    console.error('✗ Conversion error:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
}

// Main test function
async function runTests() {
  try {
    console.log('='.repeat(60));
    console.log('CURRENCY CONVERSION TEST (CoinGecko API)');
    console.log('='.repeat(60));
    console.log('Using FREE CoinGecko API - No API key needed!');

    // Test different currency conversions
    const testCases = [
      { amount: 100, currency: 'USDT', description: 'USDT Stablecoin' },
      { amount: 100, currency: 'BTC', description: 'Bitcoin' },
      { amount: 100, currency: 'ETH', description: 'Ethereum' },
      { amount: 50, currency: 'TRX', description: 'Tron' },
      { amount: 200, currency: 'LTC', description: 'Litecoin' },
      { amount: 75, currency: 'SOL', description: 'Solana' },
      { amount: 150, currency: 'DOGE', description: 'Dogecoin' }
    ];

    let passedTests = 0;
    let failedTests = 0;

    for (const test of testCases) {
      console.log('\n' + '-'.repeat(60));
      console.log(`Test ${passedTests + failedTests + 1}: $${test.amount} USD → ${test.currency} (${test.description})`);
      const result = await testConversion(test.amount, test.currency);

      if (result.success) {
        console.log('✅ TEST PASSED');
        passedTests++;
      } else {
        console.log('❌ TEST FAILED:', result.message);
        failedTests++;
      }

      // Wait 1 second between requests to avoid rate limiting
      if (test !== testCases[testCases.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('ALL TESTS COMPLETED');
    console.log(`✅ Passed: ${passedTests} | ❌ Failed: ${failedTests}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run tests
runTests();
