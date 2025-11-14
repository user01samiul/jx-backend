# 🔄 Idempotency Implementation for Provider Callbacks

## Overview

This document explains the idempotency implementation for provider callback transactions. Idempotency ensures that the same transaction can be sent multiple times by the provider, but will only be processed once by our system.

## 🎯 What is Idempotency?

**Idempotency** means that making multiple identical requests has the same effect as making a single request. This is crucial for:

- **Network reliability**: Retries due to network issues
- **Provider retry logic**: Provider may resend the same transaction
- **Data consistency**: Prevent duplicate processing
- **Error recovery**: Safe retry mechanisms

## 🔧 Implementation Details

### 1. CHANGEBALANCE (BET/WIN Transactions)

**Location**: `src/services/provider/provider-callback.service.ts` - `handleChangeBalance` method

**Idempotency Check**:
```typescript
// Check if transaction already exists
const existingTransaction = await pool.query(
  'SELECT id, type, amount, status FROM transactions WHERE external_reference = $1 AND user_id = $2 LIMIT 1',
  [transaction_id, user.user_id]
);

if (existingTransaction.rows.length > 0) {
  // Return success response for idempotency
  return {
    response: {
      status: 'OK',
      data: {
        transaction_id: transaction_id,
        status: 'OK'
      }
    }
  };
}
```

**Behavior**:
- ✅ **First request**: Process transaction normally
- ✅ **Duplicate request**: Return `status=OK` without processing
- ✅ **Same transaction_id**: Always returns same result

### 2. STATUS Command

**Location**: `src/services/provider/provider-callback.service.ts` - `handleStatus` method

**Idempotency Check**:
```typescript
// Check if transaction exists
const transactionResult = await pool.query(
  `SELECT status, type, amount, created_at FROM transactions WHERE external_reference = $1 AND user_id = $2 LIMIT 1`,
  [transaction_id, user.user_id]
);

if (transactionResult.rows.length > 0) {
  // Return transaction status
  return {
    response: {
      status: 'OK',
      data: {
        user_id: user.user_id.toString(),
        transaction_id: transaction_id,
        transaction_status: 'OK'
      }
    }
  };
}
```

**Behavior**:
- ✅ **Transaction exists**: Return current status
- ✅ **Transaction doesn't exist**: Return error
- ✅ **Multiple calls**: Always return same status

### 3. CANCEL Command

**Location**: `src/services/provider/provider-callback.service.ts` - `handleCancel` method

**Idempotency Check**:
```typescript
// Check current transaction status
const existingTransaction = await pool.query(
  'SELECT id, status FROM transactions WHERE external_reference = $1 AND user_id = $2 LIMIT 1',
  [transaction_id, user.user_id]
);

if (transaction.status === 'cancelled') {
  // Already cancelled, return success
  return {
    response: {
      status: 'OK',
      data: {
        user_id: user.user_id.toString(),
        transaction_status: 'OK'
      }
    }
  };
}
```

**Behavior**:
- ✅ **First cancel**: Mark transaction as cancelled
- ✅ **Already cancelled**: Return success without action
- ✅ **Transaction not found**: Return error

### 4. FINISHROUND Command

**Location**: `src/services/provider/provider-callback.service.ts` - `handleFinishRound` method

**Idempotency Check**:
```typescript
// Check if round already finished
const existingRound = await pool.query(
  `SELECT id FROM user_activity_logs 
   WHERE user_id = $1 AND action = 'finish_round' 
   AND metadata->>'round_id' = $2 
   AND metadata->>'game_id' = $3 
   LIMIT 1`,
  [user.user_id, round_id.toString(), game_id.toString()]
);

if (existingRound.rows.length > 0) {
  // Round already finished, return success
  return {
    response: {
      status: 'OK',
      data: {
        user_id: user.user_id.toString(),
        transaction_status: 'OK'
      }
    }
  };
}
```

**Behavior**:
- ✅ **First finish**: Log round completion
- ✅ **Already finished**: Return success without action
- ✅ **Same round_id**: Always returns same result

## 📊 Database Indexes for Performance

### Optimized Indexes

```sql
-- Composite index for user_id + external_reference
CREATE INDEX idx_transactions_user_external_ref ON transactions(user_id, external_reference);

-- Index for finish_round activity logs
CREATE INDEX idx_user_activity_logs_finish_round ON user_activity_logs(user_id, action) 
WHERE action = 'finish_round';

-- GIN index for JSON metadata queries
CREATE INDEX idx_user_activity_logs_metadata_round ON user_activity_logs USING GIN (metadata) 
WHERE action = 'finish_round';

-- Index for transaction status checks
CREATE INDEX idx_transactions_status ON transactions(status);

-- Composite index for status + external_reference
CREATE INDEX idx_transactions_status_external ON transactions(status, external_reference);
```

### Performance Benefits

- **Fast lookups**: O(log n) instead of O(n) scans
- **Reduced latency**: Quick idempotency checks
- **Better scalability**: Handles high transaction volumes
- **Efficient queries**: Optimized for common patterns

## 🔍 Idempotency Flow Examples

### Example 1: BET Transaction Retry

```
Provider sends: BET $50 (transaction_id: 12345)
↓
Our system: Process bet, create transaction
↓
Response: status=OK, balance updated

Provider retries: BET $50 (transaction_id: 12345)
↓
Our system: Check existing transaction
↓
Response: status=OK (no processing, idempotent)
```

### Example 2: WIN Transaction Retry

```
Provider sends: WIN $100 (transaction_id: 12346)
↓
Our system: Process win, apply profit control, create transaction
↓
Response: status=OK, balance updated

Provider retries: WIN $100 (transaction_id: 12346)
↓
Our system: Check existing transaction
↓
Response: status=OK (no processing, idempotent)
```

### Example 3: CANCEL Transaction Retry

```
Provider sends: CANCEL (transaction_id: 12345)
↓
Our system: Mark transaction as cancelled
↓
Response: status=OK

Provider retries: CANCEL (transaction_id: 12345)
↓
Our system: Check transaction status (already cancelled)
↓
Response: status=OK (no action, idempotent)
```

## 🛡️ Error Handling

### Network Errors
- **Provider retry**: Safe to retry same transaction
- **Our system**: Returns same result for same transaction_id
- **No duplicates**: Idempotency prevents double processing

### Database Errors
- **Transaction rollback**: Failed transactions can be retried
- **Consistent state**: No partial updates
- **Error logging**: Track failed attempts

### Validation Errors
- **Invalid parameters**: Return error, safe to retry
- **Missing data**: Return error, provider can fix and retry
- **Business logic**: Return appropriate error codes

## 📈 Monitoring and Logging

### Idempotency Logs

```typescript
console.log(`[IDEMPOTENCY] Checking if transaction ${transaction_id} has already been processed`);
console.log(`[IDEMPOTENCY] Transaction ${transaction_id} already exists, returning success`);
console.log(`[IDEMPOTENCY] Transaction ${transaction_id} is new, proceeding with processing`);
```

### Metrics to Monitor

- **Idempotency hits**: How often duplicate requests are received
- **Processing time**: Impact of idempotency checks
- **Error rates**: Failed idempotency validations
- **Database performance**: Index usage and query times

## 🔧 Configuration

### Environment Variables

```bash
# Optional: Enable detailed idempotency logging
ENABLE_IDEMPOTENCY_LOGGING=true

# Optional: Idempotency check timeout (ms)
IDEMPOTENCY_CHECK_TIMEOUT=5000
```

### Database Configuration

```sql
-- Ensure proper isolation level for idempotency
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Enable row-level locking for concurrent safety
SELECT ... FOR UPDATE;
```

## ✅ Testing Idempotency

### Manual Testing

```bash
# Test BET idempotency
curl -X POST /api/provider/callback \
  -H "Content-Type: application/json" \
  -d '{"command": "changebalance", "data": {"transaction_id": "test123", "amount": -50}}'

# Retry same request
curl -X POST /api/provider/callback \
  -H "Content-Type: application/json" \
  -d '{"command": "changebalance", "data": {"transaction_id": "test123", "amount": -50}}'

# Should return same result without processing
```

### Automated Testing

```typescript
// Test idempotency for all commands
describe('Provider Callback Idempotency', () => {
  it('should handle duplicate BET transactions', async () => {
    const betRequest = { transaction_id: 'test123', amount: -50 };
    
    // First request
    const response1 = await sendChangeBalance(betRequest);
    expect(response1.status).toBe('OK');
    
    // Duplicate request
    const response2 = await sendChangeBalance(betRequest);
    expect(response2.status).toBe('OK');
    expect(response2.data).toEqual(response1.data);
  });
});
```

## 🚨 Important Notes

### Best Practices

1. **Always check idempotency first**: Before any processing
2. **Use transaction_id as key**: Unique identifier for each transaction
3. **Return consistent responses**: Same result for same input
4. **Log idempotency events**: For monitoring and debugging
5. **Handle edge cases**: Network timeouts, partial failures

### Limitations

- **Transaction_id must be unique**: Provider responsibility
- **Same user_id required**: For proper validation
- **Database consistency**: Depends on transaction isolation
- **Clock synchronization**: For timestamp-based checks

### Security Considerations

- **Validate transaction_id**: Prevent injection attacks
- **Check user ownership**: Ensure user owns the transaction
- **Rate limiting**: Prevent abuse of retry mechanisms
- **Audit logging**: Track all idempotency checks

---

**This implementation ensures that your provider callback system is robust, reliable, and handles retries gracefully while maintaining data consistency.** 