#!/bin/bash

# Quick IGPX Callback Test - Single Test
# Usage: ./test-igpx-quick.sh [action] [user_id] [amount]
# Example: ./test-igpx-quick.sh getBalance 56
# Example: ./test-igpx-quick.sh bet 56 10

WEBHOOK_SECRET="737e36e0-6d0b-4a67-aa50-2c448fe319f3"
ENDPOINT="http://localhost:3004/igpx"

ACTION=${1:-getBalance}
USER_ID=${2:-56}
AMOUNT=${3:-10}
TXN_ID="test_$(date +%s)"

echo "Testing IGPX Callback: $ACTION for user $USER_ID"

# Build payload based on action
if [ "$ACTION" = "getBalance" ]; then
    PAYLOAD='{"action":"'$ACTION'","user_id":"'$USER_ID'","currency":"USD"}'
elif [ "$ACTION" = "rollback" ]; then
    PAYLOAD='{"action":"'$ACTION'","user_id":"'$USER_ID'","currency":"USD","amount":'$AMOUNT',"transaction_id":"'$TXN_ID'","rollback_transaction_id":"original_123"}'
else
    PAYLOAD='{"action":"'$ACTION'","user_id":"'$USER_ID'","currency":"USD","amount":'$AMOUNT',"transaction_id":"'$TXN_ID'"}'
fi

# Generate signature
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')

echo "Payload: $PAYLOAD"
echo ""

# Make request
curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "X-Security-Hash: $SIGNATURE" \
  -d "$PAYLOAD" \
  -w "\nHTTP Status: %{http_code}\n" \
  | jq '.' 2>/dev/null || cat

echo ""
