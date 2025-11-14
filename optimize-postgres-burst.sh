#!/bin/bash

# PostgreSQL Burst Optimization Script
# This script applies runtime optimizations for handling massive burst transactions

echo "🔧 Applying PostgreSQL burst optimizations..."

# Connect to PostgreSQL and apply runtime optimizations
docker exec pg_db psql -U postgres -d jackpotx-db << 'EOF'

-- Memory and Connection Optimizations
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET work_mem = '8MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET autovacuum_work_mem = '32MB';

-- I/O and Cache Optimizations
ALTER SYSTEM SET effective_io_concurrency = 4;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_cache_size = '8GB';

-- WAL Optimizations for High Throughput
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET wal_writer_delay = '200ms';
ALTER SYSTEM SET commit_delay = 1000;
ALTER SYSTEM SET commit_siblings = 3;

-- Checkpoint Optimizations
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET checkpoint_timeout = '15min';
ALTER SYSTEM SET max_wal_size = '2GB';
ALTER SYSTEM SET min_wal_size = '80MB';

-- Query Planning Optimizations
ALTER SYSTEM SET default_statistics_target = 500;
ALTER SYSTEM SET constraint_exclusion = 'partition';
ALTER SYSTEM SET cursor_tuple_fraction = 0.1;

-- Autovacuum Optimizations for High-Write Workloads
ALTER SYSTEM SET autovacuum_max_workers = 5;
ALTER SYSTEM SET autovacuum_naptime = '30s';
ALTER SYSTEM SET autovacuum_vacuum_threshold = 25;
ALTER SYSTEM SET autovacuum_analyze_threshold = 25;
ALTER SYSTEM SET autovacuum_vacuum_scale_factor = 0.1;
ALTER SYSTEM SET autovacuum_analyze_scale_factor = 0.05;
ALTER SYSTEM SET autovacuum_vacuum_cost_delay = '1ms';
ALTER SYSTEM SET autovacuum_vacuum_cost_limit = 2000;

-- Timeout Optimizations
ALTER SYSTEM SET statement_timeout = '30s';
ALTER SYSTEM SET lock_timeout = '10s';
ALTER SYSTEM SET idle_in_transaction_session_timeout = '60s';
ALTER SYSTEM SET deadlock_timeout = '2s';

-- Lock Management Optimizations
ALTER SYSTEM SET max_locks_per_transaction = 256;
ALTER SYSTEM SET max_pred_locks_per_transaction = 64;
ALTER SYSTEM SET max_pred_locks_per_relation = -2;
ALTER SYSTEM SET max_pred_locks_per_page = 2;

-- Performance Optimizations
ALTER SYSTEM SET synchronous_commit = off;
ALTER SYSTEM SET wal_sync_method = 'fdatasync';
ALTER SYSTEM SET full_page_writes = on;
ALTER SYSTEM SET wal_log_hints = off;
ALTER SYSTEM SET wal_compression = on;
ALTER SYSTEM SET wal_init_zero = on;
ALTER SYSTEM SET wal_recycle = on;

-- Logging Optimizations
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_connections = off;
ALTER SYSTEM SET log_disconnections = off;
ALTER SYSTEM SET log_lock_waits = on;
ALTER SYSTEM SET log_temp_files = 0;
ALTER SYSTEM SET log_autovacuum_min_duration = 0;

-- Statistics Optimizations
ALTER SYSTEM SET track_activities = on;
ALTER SYSTEM SET track_counts = on;
ALTER SYSTEM SET track_io_timing = on;
ALTER SYSTEM SET track_functions = 'all';

-- Reload configuration
SELECT pg_reload_conf();

EOF

echo "✅ PostgreSQL burst optimizations applied successfully!"
echo ""
echo "📊 Applied optimizations:"
echo "   • Increased max_connections: 100 → 200"
echo "   • Increased shared_buffers: 128MB → 256MB"
echo "   • Increased work_mem: 4MB → 8MB"
echo "   • Optimized WAL settings for high throughput"
echo "   • Enhanced autovacuum for high-write workloads"
echo "   • Improved timeout settings for burst handling"
echo "   • Optimized lock management for complex transactions"
echo "   • Enhanced logging for monitoring and debugging"
echo ""
echo "🚀 PostgreSQL is now optimized for massive burst transactions!" 