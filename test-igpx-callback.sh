#!/bin/bash

# IGPX Callback Test Script
# Tests the /igpx endpoint with proper HMAC-SHA256 signatures

WEBHOOK_SECRET="737e36e0-6d0b-4a67-aa50-2c448fe319f3"
ENDPOINT="https://backend.jackpotx.net/igpx"
# Use localhost for faster testing (no SSL):
# ENDPOINT="http://localhost:3004/igpx"

echo "======================================"
echo "IGPX Callback Test Script"
echo "======================================"
echo ""

# Function to generate HMAC signature and make request
test_callback() {
    local action=$1
    local user_id=$2
    local amount=$3
    local transaction_id=$4
    local test_name=$5

    echo "📝 Test: $test_name"
    echo "   Action: $action"
    echo "   User ID: $user_id"

    # Build JSON payload
    if [ "$action" = "getBalance" ]; then
        PAYLOAD=$(cat <<EOF
{"action":"$action","user_id":"$user_id","currency":"USD"}
EOF
)
    elif [ "$action" = "rollback" ]; then
        PAYLOAD=$(cat <<EOF
{"action":"$action","user_id":"$user_id","currency":"USD","amount":$amount,"transaction_id":"$transaction_id","rollback_transaction_id":"original_txn_123"}
EOF
)
    else
        PAYLOAD=$(cat <<EOF
{"action":"$action","user_id":"$user_id","currency":"USD","amount":$amount,"transaction_id":"$transaction_id"}
EOF
)
    fi

    # Generate HMAC-SHA256 signature
    SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')

    echo "   Payload: $PAYLOAD"
    echo "   Signature: ${SIGNATURE:0:20}..."
    echo ""

    # Make the request
    RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
        -X POST "$ENDPOINT" \
        -H "Content-Type: application/json" \
        -H "X-Security-Hash: $SIGNATURE" \
        -d "$PAYLOAD")

    HTTP_BODY=$(echo "$RESPONSE" | sed -e 's/HTTP_STATUS\:.*//g')
    HTTP_STATUS=$(echo "$RESPONSE" | tr -d '\n' | sed -e 's/.*HTTP_STATUS://')

    echo "   Status: $HTTP_STATUS"
    echo "   Response: $HTTP_BODY"
    echo ""

    if [ "$HTTP_STATUS" = "200" ]; then
        echo "   ✅ Success"
    else
        echo "   ❌ Failed"
    fi
    echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

echo "Starting tests..."
echo ""

# Test 1: Get Balance
test_callback "getBalance" "56" "0" "" "Get Balance (Admin User)"

# Test 2: Place Bet
test_callback "bet" "56" "10.00" "test_bet_$(date +%s)" "Place Bet (\$10)"

# Test 3: Bet Result (Win)
test_callback "result" "56" "25.00" "test_win_$(date +%s)" "Bet Result - Win (\$25)"

# Test 4: Rollback Bet
test_callback "rollback" "56" "10.00" "test_rollback_$(date +%s)" "Rollback Bet (\$10 refund)"

echo "======================================"
echo "All tests completed!"
echo "======================================"
echo ""
echo "💡 Tips:"
echo "  - Check PM2 logs: pm2 logs backend --lines 50"
echo "  - Check database: SELECT * FROM transactions WHERE description LIKE '%IGPX%' ORDER BY created_at DESC LIMIT 5;"
echo "  - Monitor live: pm2 logs backend --lines 0 | grep -i igpx"
echo ""
