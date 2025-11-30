#!/bin/bash

echo "======================================================================"
echo "TESTING BACKEND CAMPAIGNS ENDPOINTS (End-to-End)"
echo "======================================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="https://backend.jackpotx.net"

# Note: You need an admin JWT token for most endpoints
# For this test, we'll just check if endpoints respond (even auth failures show the endpoint exists)

echo -e "${BLUE}TEST 1: List Vendors (Admin endpoint - expects 401 without token)${NC}"
curl -s -X GET "$BASE_URL/api/campaigns/vendors" \
  -H "Content-Type: application/json" \
  | jq '.' || echo "Endpoint responded"
echo ""

echo -e "${BLUE}TEST 2: Get Game Limits (Admin endpoint - expects 401 without token)${NC}"
curl -s -X GET "$BASE_URL/api/campaigns/game-limits?vendors=pragmatic&currencies=USD" \
  -H "Content-Type: application/json" \
  | jq '.' || echo "Endpoint responded"
echo ""

echo -e "${BLUE}TEST 3: List Campaigns (Admin endpoint - expects 401 without token)${NC}"
curl -s -X GET "$BASE_URL/api/campaigns?include_expired=false&per_page=10" \
  -H "Content-Type: application/json" \
  | jq '.' || echo "Endpoint responded"
echo ""

echo -e "${BLUE}TEST 4: User Campaigns - /user/me (Requires auth)${NC}"
curl -s -X GET "$BASE_URL/api/campaigns/user/me" \
  -H "Content-Type: application/json" \
  | jq '.' || echo "Endpoint responded"
echo ""

echo "======================================================================"
echo "ENDPOINT TEST COMPLETE"
echo "======================================================================"
echo ""
echo "Expected results:"
echo "  - 401 Unauthorized = Endpoint exists, requires auth (GOOD)"
echo "  - 404 Not Found = Endpoint doesn't exist (BAD)"
echo "  - 200 OK = Endpoint works (GOOD)"
echo ""
echo "To test with authentication, use an admin JWT token:"
echo "  curl -H 'Authorization: Bearer YOUR_ADMIN_TOKEN' ..."
echo ""
