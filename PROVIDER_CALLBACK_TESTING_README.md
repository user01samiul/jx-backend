# Provider Callback Test Suite

This directory contains comprehensive testing scripts for all provider callback endpoints in the JackpotX backend system.

## Overview

The provider callback system handles communication between game providers and the JackpotX platform. This test suite validates all endpoints and generates detailed reports to ensure system reliability.

## Available Scripts

### 1. `provider-callback-test-suite.js` (Node.js Version)
A comprehensive Node.js script that tests all provider endpoints and generates detailed reports.

**Features:**
- Tests all provider commands (authenticate, balance, changebalance, status, cancel, finishround, ping)
- Multiple test scenarios for each command
- Detailed reporting with success/failure statistics
- Error analysis and debugging information
- Export results to JSON and HTML reports
- Retry logic for failed requests
- Response time tracking

### 2. `provider-callback-tester.py` (Python Version - Interactive)
A Python script that follows the interactive task loop pattern with user feedback.

**Features:**
- Interactive menu-driven interface
- Real-time test execution
- Same comprehensive testing as the Node.js version
- User-friendly command interface
- Follows the project's interactive task loop pattern

## Provider Endpoints Tested

### 1. **PING** (`GET /api/provider-callback/ping`)
- **Purpose**: Health check endpoint
- **Tests**: Basic connectivity and response validation

### 2. **AUTHENTICATE** (`POST /api/provider-callback/authenticate`)
- **Purpose**: Validate user tokens and authenticate game sessions
- **Tests**:
  - Valid token authentication
  - Invalid token handling
  - Missing token scenarios
  - Token with game ID validation

### 3. **BALANCE** (`POST /api/provider-callback/balance`)
- **Purpose**: Retrieve user balance information
- **Tests**:
  - Valid token balance retrieval
  - Invalid token handling
  - Missing token scenarios

### 4. **CHANGEBALANCE** (`POST /api/provider-callback/changebalance`)
- **Purpose**: Handle bet and win transactions
- **Tests**:
  - Bet transactions (negative amounts)
  - Win transactions (positive amounts)
  - Zero amount balance checks
  - New provider format with transaction_type
  - Loss transactions (zero win amounts)
  - Invalid token scenarios
  - Missing required fields

### 5. **STATUS** (`POST /api/provider-callback/status`)
- **Purpose**: Check transaction status
- **Tests**:
  - Valid transaction ID status check
  - Invalid transaction ID handling
  - Missing transaction ID scenarios

### 6. **CANCEL** (`POST /api/provider-callback/cancel`)
- **Purpose**: Cancel pending transactions
- **Tests**:
  - Valid transaction cancellation
  - Invalid transaction handling
  - Missing required fields

### 7. **FINISHROUND** (`POST /api/provider-callback/finishround`)
- **Purpose**: Finalize game rounds
- **Tests**:
  - Valid round completion
  - Invalid round ID handling
  - Missing required fields

## Configuration

### Environment Variables

```bash
# Base URL for the API
BASE_URL=http://localhost:3000

# Secret key for request signing
SUPPLIER_SECRET_KEY=your_secret_key_here

# Operator ID for authentication
SUPPLIER_OPERATOR_ID=your_operator_id_here
```

### Test Configuration

The scripts use a default test user configuration:

```javascript
{
  testUser: {
    id: 1,
    token: '87794f8b2f27f64e3a51b5ef342334c8',
    game_id: 53,
    session_id: '1_53_1752376795446'
  },
  retryAttempts: 3,
  timeout: 10000
}
```

## Usage

### Node.js Version

```bash
# Run all tests
node provider-callback-test-suite.js

# Show help
node provider-callback-test-suite.js --help

# Use custom base URL
node provider-callback-test-suite.js --base-url https://api.example.com
```

### Python Version (Interactive)

```bash
# Run interactive mode
python3 provider-callback-tester.py
```

**Interactive Commands:**
- `run-all` - Run all tests
- `ping` - Test ping endpoint only
- `auth` - Test authenticate endpoint only
- `balance` - Test balance endpoint only
- `change` - Test changebalance endpoint only
- `status` - Test status endpoint only
- `cancel` - Test cancel endpoint only
- `finish` - Test finishround endpoint only
- `report` - Generate reports from last run
- `config` - Show current configuration
- `stop` - Exit the program

## Report Generation

Both scripts generate comprehensive reports in multiple formats:

### 1. Text Report (`report.txt`)
- Summary statistics
- Command breakdown
- Failed test details
- Recommendations

### 2. JSON Report (`report.json`)
- Complete test data in machine-readable format
- Request/response details
- Error information
- Performance metrics

### 3. HTML Report (`report.html`)
- Visual representation of test results
- Color-coded success/failure indicators
- Detailed request/response information
- Interactive elements

## Report Structure

### Summary Section
```
SUMMARY:
Total Tests: 25
Passed: 22
Failed: 3
Success Rate: 88.00%
Duration: 15420ms
```

### Command Breakdown
```
COMMAND BREAKDOWN:
PING: 1/1 (100.00%)
AUTHENTICATE: 4/4 (100.00%)
BALANCE: 3/3 (100.00%)
CHANGEBALANCE: 8/8 (100.00%)
STATUS: 3/3 (100.00%)
CANCEL: 3/3 (100.00%)
FINISHROUND: 3/3 (100.00%)
```

### Failed Tests Section
```
FAILED TESTS:
1. ChangeBalance - Invalid Token (changebalance)
   Error: HTTP 400 Bad Request
2. Status - Invalid Transaction ID (status)
   Error: HTTP 404 Not Found
```

## Error Handling

The scripts include comprehensive error handling:

1. **Retry Logic**: Failed requests are retried with exponential backoff
2. **Timeout Handling**: Requests timeout after 10 seconds
3. **Network Errors**: Connection issues are logged and reported
4. **Validation Errors**: Invalid responses are captured and analyzed

## Security Features

1. **Request Signing**: All requests are signed using SHA1 hashing
2. **Authorization Headers**: Proper X-Authorization headers are included
3. **Operator ID**: X-Operator-Id headers for multi-tenant support
4. **Hash Validation**: Request and response hashes are validated

## Performance Monitoring

The scripts track:
- Response times for each request
- Average response times per endpoint
- Performance recommendations for slow endpoints
- Retry statistics

## Troubleshooting

### Common Issues

1. **Server Not Running**
   ```
   Error: connect ECONNREFUSED 127.0.0.1:3000
   ```
   **Solution**: Ensure the JackpotX backend server is running

2. **Invalid Secret Key**
   ```
   Error: HTTP 403 Forbidden
   ```
   **Solution**: Check SUPPLIER_SECRET_KEY environment variable

3. **Invalid Token**
   ```
   Error: HTTP 400 Bad Request - Invalid token
   ```
   **Solution**: Update test user token in configuration

4. **Database Connection Issues**
   ```
   Error: Database connection failed
   ```
   **Solution**: Check database configuration and connectivity

### Debug Mode

Enable debug logging by setting environment variables:

```bash
export DEBUG=true
export LOG_LEVEL=debug
```

## Integration with CI/CD

The scripts can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Test Provider Callbacks
  run: |
    node provider-callback-test-suite.js
    python3 provider-callback-tester.py
```

## Customization

### Adding New Test Cases

To add new test scenarios, modify the test cases arrays in the respective test functions:

```javascript
// Example: Adding a new authenticate test case
{
  name: 'Custom Test Case',
  data: {
    token: 'custom_token',
    game_id: 999
  }
}
```

### Modifying Test Configuration

Update the `TEST_CONFIG` object to change:
- Test user credentials
- Retry attempts
- Timeout values
- Test amounts

## Best Practices

1. **Run tests in a staging environment first**
2. **Monitor server logs during testing**
3. **Review failed tests carefully**
4. **Keep test data separate from production**
5. **Regularly update test tokens**
6. **Document any custom test scenarios**

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs for detailed error information
3. Verify environment configuration
4. Test individual endpoints manually

## Version History

- **v1.0**: Initial release with basic endpoint testing
- **v2.0**: Added comprehensive reporting and error handling
- **v3.0**: Added interactive Python version and performance monitoring 