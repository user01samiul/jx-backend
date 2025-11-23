#!/bin/bash
echo "Testing Vimplay API connection..."
curl -s --max-time 15 -X POST "https://api.int-vimplay.com/api/games/partner/list" \
  -H "Content-Type: application/json" \
  -d '{"secret": "e60eedfa6fb4549fcc5dda03acce2630ad974f57d6131cdf46d057fb54d68acc"}' \
  -w "\n\nHTTP Status: %{http_code}" 2>&1 | head -50
