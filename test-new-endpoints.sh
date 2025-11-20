#!/bin/bash

WEBHOOK_SECRET="737e36e0-6d0b-4a67-aa50-2c448fe319f3"

echo "======================================"
echo "Testing New IGPX Endpoints"
echo "======================================"
echo ""

# Test /igpx/transaction endpoint
echo "1. Testing /igpx/transaction (bet):"
PAYLOAD='{"action":"bet","user_id":"71","currency":"USD","amount":1,"transaction_id":"test_txn_endpoint"}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')

curl -X POST http://localhost:3004/igpx/transaction \
  -H "Content-Type: application/json" \
  -H "X-Security-Hash: $SIGNATURE" \
  -d "$PAYLOAD" \
  -s | jq '.' 2>/dev/null || cat

echo ""
echo "---"
echo ""

# Test /igpx/transaction-rollback endpoint
echo "2. Testing /igpx/transaction-rollback:"
PAYLOAD2='{"action":"rollback","user_id":"71","currency":"USD","amount":1,"transaction_id":"test_rollback_endpoint","rollback_transaction_id":"test_txn_endpoint"}'
SIGNATURE2=$(echo -n "$PAYLOAD2" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')

curl -X POST http://localhost:3004/igpx/transaction-rollback \
  -H "Content-Type: application/json" \
  -H "X-Security-Hash: $SIGNATURE2" \
  -d "$PAYLOAD2" \
  -s | jq '.' 2>/dev/null || cat

echo ""
echo "======================================"
