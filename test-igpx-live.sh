#!/bin/bash

echo "================================"
echo "IGPX Live Callback Monitor"
echo "================================"
echo ""
echo "✅ Callback URL: https://backend.jackpotx.net/igpx"
echo "📊 Watching for IGPX callbacks..."
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Follow PM2 logs and filter for IGPX
pm2 logs backend --lines 0 --raw 2>&1 | grep --line-buffered -i "igpx\|callback received"
