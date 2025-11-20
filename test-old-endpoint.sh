#!/bin/bash

WEBHOOK_SECRET="737e36e0-6d0b-4a67-aa50-2c448fe319f3"
PAYLOAD='{"action":"getBalance","user_id":"56","currency":"USD"}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')

echo "Testing OLD endpoint: /api/payment/webhook/igpx"
curl -X POST http://localhost:3004/api/payment/webhook/igpx \
  -H "Content-Type: application/json" \
  -H "X-Security-Hash: $SIGNATURE" \
  -d "$PAYLOAD" | jq '.' 2>/dev/null || cat

echo ""
echo "---"
echo ""
echo "Testing NEW endpoint: /igpx"
curl -X POST http://localhost:3004/igpx \
  -H "Content-Type: application/json" \
  -H "X-Security-Hash: $SIGNATURE" \
  -d "$PAYLOAD" | jq '.' 2>/dev/null || cat
