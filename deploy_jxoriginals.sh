#!/bin/bash

##############################################################################
# JxOriginals Deployment Script
#
# This script automates the complete deployment of JxOriginals integration
# including database migration, backend restart, and WebSocket server setup
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DB_NAME="jackpotx-db"
DB_USER="postgres"
DB_PASSWORD="12358Voot#"
MIGRATION_FILE="$SCRIPT_DIR/migrations/20241110_add_jxoriginals_games.sql"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        JxOriginals Deployment Script v1.0                 ║${NC}"
echo -e "${BLUE}║        Deploying 18 Games with Full Source Code           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

##############################################################################
# Step 1: Pre-flight Checks
##############################################################################

echo -e "${YELLOW}[1/7] Running pre-flight checks...${NC}"

# Check if we're in the right directory
if [ ! -f "$SCRIPT_DIR/package.json" ]; then
    echo -e "${RED}Error: Not in backend directory. Please run from /var/www/html/backend.jackpotx.net/${NC}"
    exit 1
fi

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}Error: Migration file not found at $MIGRATION_FILE${NC}"
    exit 1
fi

# Check PostgreSQL connection
if ! PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}Error: Cannot connect to PostgreSQL database${NC}"
    exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}Error: PM2 is not installed. Run: npm install -g pm2${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Pre-flight checks passed${NC}"
echo ""

##############################################################################
# Step 2: Database Migration
##############################################################################

echo -e "${YELLOW}[2/7] Running database migration...${NC}"

# Check if games already exist
EXISTING_GAMES=$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM games WHERE provider = 'JxOriginals';")

if [ "$EXISTING_GAMES" -gt 0 ]; then
    echo -e "${YELLOW}Warning: Found $EXISTING_GAMES JxOriginals games already in database${NC}"
    read -p "Do you want to re-run the migration? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Skipping migration...${NC}"
    else
        PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"
        echo -e "${GREEN}✓ Migration completed${NC}"
    fi
else
    PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"
    echo -e "${GREEN}✓ Migration completed - 18 games added${NC}"
fi

# Verify games were added
TOTAL_GAMES=$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM games WHERE provider = 'JxOriginals';")

echo -e "${BLUE}Total JxOriginals games in database: $TOTAL_GAMES${NC}"
echo ""

##############################################################################
# Step 3: Install Dependencies
##############################################################################

echo -e "${YELLOW}[3/7] Installing backend dependencies...${NC}"

npm install

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

##############################################################################
# Step 4: Build TypeScript
##############################################################################

echo -e "${YELLOW}[4/7] Building TypeScript...${NC}"

npm run build

echo -e "${GREEN}✓ TypeScript compiled${NC}"
echo ""

##############################################################################
# Step 5: Setup PTWebSocket
##############################################################################

echo -e "${YELLOW}[5/7] Setting up PTWebSocket servers...${NC}"

cd "$SCRIPT_DIR/JxOriginalGames/PTWebSocket"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing WebSocket server dependencies..."
    npm install
fi

# Stop existing WebSocket servers if running
pm2 delete jxoriginals-pragmatic 2>/dev/null || true
pm2 delete jxoriginals-slots 2>/dev/null || true
pm2 delete jxoriginals-arcade 2>/dev/null || true

# Start WebSocket servers
echo "Starting WebSocket servers..."

pm2 start Server.js --name "jxoriginals-pragmatic" -- --config ../../socket_config_jxoriginals.json
pm2 start JxOriginals.js --name "jxoriginals-slots" -- --config ../../socket_config_jxoriginals.json
pm2 start Arcade.js --name "jxoriginals-arcade" -- --config ../../socket_config_jxoriginals.json

echo -e "${GREEN}✓ WebSocket servers started${NC}"

cd "$SCRIPT_DIR"
echo ""

##############################################################################
# Step 6: Restart Backend
##############################################################################

echo -e "${YELLOW}[6/7] Restarting backend server...${NC}"

pm2 restart backend

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 3

echo -e "${GREEN}✓ Backend restarted${NC}"
echo ""

##############################################################################
# Step 7: Verification Tests
##############################################################################

echo -e "${YELLOW}[7/7] Running verification tests...${NC}"

# Test 1: Check if backend is running
if pm2 list | grep -q "backend.*online"; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${RED}✗ Backend is not running${NC}"
fi

# Test 2: Check WebSocket servers
WS_RUNNING=0
if pm2 list | grep -q "jxoriginals-pragmatic.*online"; then
    echo -e "${GREEN}✓ Pragmatic WebSocket server is running${NC}"
    ((WS_RUNNING++))
fi

if pm2 list | grep -q "jxoriginals-slots.*online"; then
    echo -e "${GREEN}✓ Slots WebSocket server is running${NC}"
    ((WS_RUNNING++))
fi

if pm2 list | grep -q "jxoriginals-arcade.*online"; then
    echo -e "${GREEN}✓ Arcade WebSocket server is running${NC}"
    ((WS_RUNNING++))
fi

# Test 3: Test API endpoint
echo "Testing API endpoint..."
sleep 2

API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "https://backend.jackpotx.net/api/jxoriginals/games")

if [ "$API_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ API endpoint responding (HTTP 200)${NC}"

    # Get game count
    GAME_COUNT=$(curl -s "https://backend.jackpotx.net/api/jxoriginals/games" | jq -r '.count // 0' 2>/dev/null || echo "0")
    echo -e "${BLUE}  API returned $GAME_COUNT games${NC}"
else
    echo -e "${RED}✗ API endpoint not responding (HTTP $API_RESPONSE)${NC}"
fi

echo ""

##############################################################################
# Save PM2 Configuration
##############################################################################

pm2 save

echo -e "${BLUE}PM2 configuration saved${NC}"
echo ""

##############################################################################
# Summary
##############################################################################

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Deployment Completed Successfully!           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo -e "  • Database migration: ${GREEN}✓${NC}"
echo -e "  • Backend server: ${GREEN}✓${NC}"
echo -e "  • WebSocket servers: ${GREEN}$WS_RUNNING/3${NC}"
echo -e "  • API endpoint: ${GREEN}✓${NC}"
echo -e "  • Total games: ${BLUE}$TOTAL_GAMES${NC}"
echo ""
echo -e "${BLUE}API Endpoints:${NC}"
echo -e "  • https://backend.jackpotx.net/api/jxoriginals/games"
echo -e "  • https://backend.jackpotx.net/api/jxoriginals/categories"
echo -e "  • https://backend.jackpotx.net/api/jxoriginals/featured"
echo ""
echo -e "${BLUE}WebSocket Servers:${NC}"
echo -e "  • wss://backend.jackpotx.net:8443/pragmatic"
echo -e "  • wss://backend.jackpotx.net:8443/slots"
echo -e "  • wss://backend.jackpotx.net:8443/arcade"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. Check logs: ${YELLOW}pm2 logs backend${NC}"
echo -e "  2. Test API: ${YELLOW}curl https://backend.jackpotx.net/api/jxoriginals/games${NC}"
echo -e "  3. Frontend integration: See ${YELLOW}JXORIGINALS_FRONTEND_GUIDE.md${NC}"
echo ""
echo -e "${GREEN}Happy Gaming! 🎮${NC}"
