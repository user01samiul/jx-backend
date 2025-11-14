#!/bin/bash

# RTP Control Management Script
# Usage: ./rtp-control.sh [enable|disable|status]

DB_CONTAINER="pg_db"
DB_NAME="jackpotx-db"
DB_USER="postgres"

show_status() {
    echo ""
    echo "📊 CURRENT RTP SETTINGS:"
    echo "========================"
    
    docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
        SELECT 
            id,
            target_profit_percent,
            effective_rtp,
            adjustment_mode,
            updated_at
        FROM rtp_settings 
        ORDER BY id DESC 
        LIMIT 1;
    " 2>/dev/null
    
    # Get current effective RTP
    CURRENT_RTP=$(docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "
        SELECT effective_rtp FROM rtp_settings ORDER BY id DESC LIMIT 1;
    " 2>/dev/null | xargs | cut -d'.' -f1)
    
    if [[ "$CURRENT_RTP" == "100" ]]; then
        echo ""
        echo "✅ RTP CONTROL: DISABLED (No profit reduction)"
    else
        REDUCTION=$((100 - CURRENT_RTP))
        echo ""
        echo "🔒 RTP CONTROL: ENABLED ($REDUCTION% profit reduction)"
    fi
}

enable_rtp_control() {
    echo ""
    echo "🔒 ENABLING RTP CONTROL..."
    
    docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
        INSERT INTO rtp_settings (target_profit_percent, effective_rtp, adjustment_mode, updated_at) 
        VALUES (20.00, 80.00, 'auto', NOW());
    " >/dev/null 2>&1
    
    echo "✅ RTP Control Enabled!"
    echo "Effective RTP: 80%"
    echo "Profit reduction: 20% (80% effective RTP vs 96% provider RTP)"
    echo "Mode: Auto-adjustment enabled"
}

disable_rtp_control() {
    echo ""
    echo "🔓 DISABLING RTP CONTROL..."
    
    docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
        INSERT INTO rtp_settings (target_profit_percent, effective_rtp, adjustment_mode, updated_at) 
        VALUES (20.00, 100.00, 'manual', NOW());
    " >/dev/null 2>&1
    
    echo "✅ RTP Control Disabled!"
    echo "Effective RTP: 100%"
    echo "Profit reduction: 0% (Full win amounts credited)"
    echo "Mode: Manual (no auto-adjustment)"
}

show_help() {
    echo ""
    echo "🎯 RTP CONTROL MANAGEMENT"
    echo "========================"
    echo "Usage: ./rtp-control.sh [command]"
    echo ""
    echo "Commands:"
    echo "  enable  - Enable RTP control (80% effective RTP)"
    echo "  disable - Disable RTP control (100% effective RTP)"
    echo "  status  - Show current RTP settings"
    echo ""
    echo "Examples:"
    echo "  ./rtp-control.sh enable   # Enable profit control"
    echo "  ./rtp-control.sh disable  # Disable profit control"
    echo "  ./rtp-control.sh status   # Check current settings"
}

# Main script logic
case "$1" in
    "enable")
        enable_rtp_control
        ;;
    "disable")
        disable_rtp_control
        ;;
    "status")
        show_status
        ;;
    *)
        show_help
        ;;
esac 