#!/bin/bash

# Test Oxapay Withdrawal
# Replace YOUR_JWT_TOKEN with your actual JWT token from login

echo "Testing Oxapay Withdrawal..."
echo ""

# Test 1: TRX Withdrawal (5 TRX to valid address)
curl -X POST http://localhost:3004/api/payment/withdraw \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "gateway_code": "oxapay",
    "amount": 5,
    "currency": "TRX",
    "address": "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
    "network": "TRC20"
  }'

echo ""
echo "---"
echo ""

# Test 2: USDT Withdrawal (10 USDT to valid address)
curl -X POST http://localhost:3004/api/payment/withdraw \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "gateway_code": "oxapay",
    "amount": 10,
    "currency": "USDT",
    "address": "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
    "network": "TRC20"
  }'

echo ""
echo "Done!"
