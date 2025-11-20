#!/bin/bash
echo "=== IGPX Fix Deployment ==="
echo ""
echo "Step 1: Compiling TypeScript..."
npx tsc src/services/payment/igpx-callback.service.ts --outDir dist/services/payment --module commonjs --target ES2024 --esModuleInterop --skipLibCheck
npx tsc src/api/payment/payment.controller.ts --outDir dist/api/payment --module commonjs --target ES2024 --esModuleInterop --skipLibCheck

echo ""
echo "Step 2: Checking compiled files..."
ls -la dist/services/payment/igpx-callback.service.js
ls -la dist/api/payment/payment.controller.js

echo ""
echo "Step 3: Restart backend..."
echo "Run one of these commands depending on your setup:"
echo "  pm2 restart backend"
echo "  pm2 restart ecosystem.config.js"
echo "  npm run start"
echo ""
echo "Step 4: Test the integration..."
echo "  1. Refresh your browser (Ctrl+F5) to clear cache"
echo "  2. Navigate to Sports page (this creates a NEW session)"
echo "  3. Try placing a bet"
echo ""
echo "=== Deployment Complete ==="
