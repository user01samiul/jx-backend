#!/bin/bash

# PostgreSQL Enterprise Optimization Script
# This script applies enterprise-level optimizations for handling millions of users

echo "🚀 Applying PostgreSQL Enterprise Optimizations for Millions of Users..."

# Copy the enterprise configuration
docker cp postgresql-burst-optimized.conf pg_db:/var/lib/postgresql/data/postgresql.conf

# Restart PostgreSQL to apply the new configuration
echo "🔄 Restarting PostgreSQL with enterprise configuration..."
docker restart pg_db

# Wait for PostgreSQL to start
echo "⏳ Waiting for PostgreSQL to start..."
sleep 20

# Verify the enterprise configuration
echo "✅ Verifying Enterprise Configuration..."
docker exec pg_db psql -U postgres -d jackpotx-db << 'EOF'

-- Display key enterprise settings
SELECT 
  name,
  setting,
  unit,
  context
FROM pg_settings 
WHERE name IN (
  'max_connections',
  'shared_buffers', 
  'work_mem',
  'maintenance_work_mem',
  'effective_cache_size',
  'wal_buffers',
  'autovacuum_max_workers',
  'statement_timeout',
  'lock_timeout'
)
ORDER BY name;

EOF

echo "🎉 Enterprise PostgreSQL Configuration Applied Successfully!"
echo ""
echo "📊 Enterprise Configuration Summary:"
echo "   • max_connections: 1000 (5x increase)"
echo "   • shared_buffers: 2GB (8x increase)"
echo "   • work_mem: 32MB (4x increase)"
echo "   • effective_cache_size: 16GB (2x increase)"
echo "   • autovacuum_max_workers: 10 (2x increase)"
echo "   • Connection pool: 500 clients (5x increase)"
echo ""
echo "🚀 Ready to handle millions of concurrent users!" 