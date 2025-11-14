#!/bin/bash

echo "🔍 **CHECKING CANCEL OPERATION LOGS**"
echo "===================================="
echo "📁 Log file: log.txt"
echo ""

# Check for cancel-related logs
echo "🔄 **CANCEL OPERATIONS FOUND:**"
grep -i "cancel" log.txt | tail -10

echo ""
echo "💰 **BALANCE OPERATIONS FOUND:**"
grep -i "balance" log.txt | tail -10

echo ""
echo "🎮 **GAME OPERATIONS FOUND:**"
grep -i "game" log.txt | tail -10

echo ""
echo "📊 **DEBUG LOGS FOUND:**"
grep -i "debug" log.txt | tail -10

echo ""
echo "✅ **SUCCESS OPERATIONS FOUND:**"
grep -i "success" log.txt | tail -10

echo ""
echo "❌ **ERROR OPERATIONS FOUND:**"
grep -i "error" log.txt | tail -10 