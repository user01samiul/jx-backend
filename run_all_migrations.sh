#!/bin/bash

# =====================================================
# JACKPOTX ENTERPRISE FEATURES - AUTO MIGRATION SCRIPT
# =====================================================

echo "🚀 Starting JackpotX Enterprise Features Migration..."
echo "=================================================="

# Database configuration
DB_HOST="localhost"
DB_USER="postgres"
DB_NAME="jackpotx-db"
export PGPASSWORD="12358Voot#"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run migration
run_migration() {
    local file=$1
    local description=$2

    echo ""
    echo -e "${YELLOW}Running: $description${NC}"
    echo "File: $file"

    if psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f "$file" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ SUCCESS${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        echo "Re-running with errors visible..."
        psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f "$file"
        return 1
    fi
}

# Track success/failure
TOTAL=0
SUCCESS=0
FAILED=0

# Array of migrations
declare -a migrations=(
    "src/db/migrations/020_create_responsible_gaming_limits.sql|Responsible Gaming System"
    "src/db/migrations/021_create_multilanguage_system.sql|Multilanguage System"
    "src/db/migrations/022_enhance_player_status.sql|Enhanced Player Status"
    "src/db/migrations/023_create_metadata_tables.sql|Metadata Tables (Currency, Country, Prefix)"
    "src/db/migrations/024_create_cms_system.sql|CMS System"
    "src/db/migrations/025_create_ip_tracking.sql|IP Tracking & Security"
    "src/db/migrations/026_create_marketing_preferences.sql|Marketing Preferences (GDPR)"
)

# Run each migration
for migration in "${migrations[@]}"; do
    IFS='|' read -r file description <<< "$migration"
    TOTAL=$((TOTAL + 1))

    if run_migration "$file" "$description"; then
        SUCCESS=$((SUCCESS + 1))
    else
        FAILED=$((FAILED + 1))
    fi
done

# Summary
echo ""
echo "=================================================="
echo "📊 MIGRATION SUMMARY"
echo "=================================================="
echo -e "Total Migrations: ${TOTAL}"
echo -e "${GREEN}Successful: ${SUCCESS}${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed: ${FAILED}${NC}"
else
    echo -e "${GREEN}Failed: ${FAILED}${NC}"
fi

echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL MIGRATIONS COMPLETED SUCCESSFULLY!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Restart your backend server"
    echo "2. Check API documentation at http://localhost:3004/api-docs"
    echo "3. Review READ_ADDONS.md for frontend/admin implementation"
    exit 0
else
    echo -e "${RED}⚠️  SOME MIGRATIONS FAILED${NC}"
    echo "Please check the errors above and fix them before proceeding."
    exit 1
fi
