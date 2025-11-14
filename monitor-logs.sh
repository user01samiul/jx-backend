#!/bin/bash

echo "🔍 **MONITORING CASINO API LOGS**"
echo "================================="
echo "📁 Log file: log.txt"
echo "🔄 Monitoring in real-time..."
echo "⏹️  Press Ctrl+C to stop monitoring"
echo ""

# Monitor the log file in real-time
tail -f log.txt 