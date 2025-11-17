const { Pool } = require('pg');

// Local database configuration
const localPool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '2025',
  database: 'jx-database'
});

// Remote database configuration
const remotePool = new Pool({
  host: '194.102.33.209',
  port: 5432,
  user: 'postgres',
  password: '12358Voot#',
  database: 'jackpotx-db'
});

async function getTableList(pool) {
  const query = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  const result = await pool.query(query);
  return result.rows.map(row => row.table_name);
}

async function getTableStructure(pool, tableName) {
  const query = `
    SELECT
      column_name,
      data_type,
      character_maximum_length,
      column_default,
      is_nullable,
      ordinal_position
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = $1
    ORDER BY ordinal_position;
  `;
  const result = await pool.query(query, [tableName]);
  return result.rows;
}

async function getTableConstraints(pool, tableName) {
  const query = `
    SELECT
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    LEFT JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.table_schema = 'public'
    AND tc.table_name = $1
    ORDER BY tc.constraint_type, tc.constraint_name;
  `;
  const result = await pool.query(query, [tableName]);
  return result.rows;
}

async function getTableIndexes(pool, tableName) {
  const query = `
    SELECT
      i.relname as index_name,
      a.attname as column_name,
      ix.indisunique as is_unique,
      ix.indisprimary as is_primary
    FROM pg_class t
    JOIN pg_index ix ON t.oid = ix.indrelid
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
    WHERE t.relkind = 'r'
    AND t.relname = $1
    AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ORDER BY i.relname, a.attnum;
  `;
  const result = await pool.query(query, [tableName]);
  return result.rows;
}

function compareStructures(localCols, remoteCols) {
  const differences = [];

  // Check for missing columns
  const localColNames = localCols.map(c => c.column_name);
  const remoteColNames = remoteCols.map(c => c.column_name);

  const onlyInLocal = localColNames.filter(name => !remoteColNames.includes(name));
  const onlyInRemote = remoteColNames.filter(name => !localColNames.includes(name));

  if (onlyInLocal.length > 0) {
    differences.push(`  ⚠️  Columns only in LOCAL: ${onlyInLocal.join(', ')}`);
  }

  if (onlyInRemote.length > 0) {
    differences.push(`  ⚠️  Columns only in REMOTE: ${onlyInRemote.join(', ')}`);
  }

  // Check for column differences
  const commonCols = localColNames.filter(name => remoteColNames.includes(name));

  for (const colName of commonCols) {
    const localCol = localCols.find(c => c.column_name === colName);
    const remoteCol = remoteCols.find(c => c.column_name === colName);

    if (localCol.data_type !== remoteCol.data_type) {
      differences.push(`  ⚠️  Column '${colName}': type mismatch (LOCAL: ${localCol.data_type}, REMOTE: ${remoteCol.data_type})`);
    }

    if (localCol.is_nullable !== remoteCol.is_nullable) {
      differences.push(`  ⚠️  Column '${colName}': nullable mismatch (LOCAL: ${localCol.is_nullable}, REMOTE: ${remoteCol.is_nullable})`);
    }

    if (localCol.character_maximum_length !== remoteCol.character_maximum_length) {
      differences.push(`  ⚠️  Column '${colName}': length mismatch (LOCAL: ${localCol.character_maximum_length}, REMOTE: ${remoteCol.character_maximum_length})`);
    }
  }

  return differences;
}

async function compareDatabases() {
  console.log('🔍 Starting database comparison...\n');

  try {
    // Get table lists
    console.log('📊 Fetching table lists...');
    const localTables = await getTableList(localPool);
    const remoteTables = await getTableList(remotePool);

    console.log(`\n📋 LOCAL DATABASE: ${localTables.length} tables`);
    console.log(`📋 REMOTE DATABASE: ${remoteTables.length} tables\n`);

    // Find differences in table names
    const onlyInLocal = localTables.filter(table => !remoteTables.includes(table));
    const onlyInRemote = remoteTables.filter(table => !localTables.includes(table));
    const commonTables = localTables.filter(table => remoteTables.includes(table));

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('TABLE NAME COMPARISON');
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (onlyInLocal.length > 0) {
      console.log(`❌ Tables only in LOCAL (${onlyInLocal.length}):`);
      onlyInLocal.forEach(table => console.log(`   - ${table}`));
      console.log('');
    }

    if (onlyInRemote.length > 0) {
      console.log(`❌ Tables only in REMOTE (${onlyInRemote.length}):`);
      onlyInRemote.forEach(table => console.log(`   - ${table}`));
      console.log('');
    }

    console.log(`✅ Common tables (${commonTables.length}):\n`);

    // Compare structure of common tables
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('TABLE STRUCTURE COMPARISON');
    console.log('═══════════════════════════════════════════════════════════════\n');

    let identicalTables = 0;
    let differentTables = 0;
    const detailedDifferences = [];

    for (const tableName of commonTables) {
      process.stdout.write(`Comparing ${tableName}... `);

      const [localStructure, remoteStructure, localConstraints, remoteConstraints, localIndexes, remoteIndexes] = await Promise.all([
        getTableStructure(localPool, tableName),
        getTableStructure(remotePool, tableName),
        getTableConstraints(localPool, tableName),
        getTableConstraints(remotePool, tableName),
        getTableIndexes(localPool, tableName),
        getTableIndexes(remotePool, tableName)
      ]);

      const structureDiffs = compareStructures(localStructure, remoteStructure);

      // Compare constraints count
      const constraintDiff = localConstraints.length !== remoteConstraints.length;

      // Compare indexes count
      const indexDiff = localIndexes.length !== remoteIndexes.length;

      if (structureDiffs.length === 0 && !constraintDiff && !indexDiff) {
        console.log('✅ IDENTICAL');
        identicalTables++;
      } else {
        console.log('⚠️  DIFFERENT');
        differentTables++;

        const tableDiffs = {
          tableName,
          differences: []
        };

        if (structureDiffs.length > 0) {
          tableDiffs.differences.push(...structureDiffs);
        }

        if (constraintDiff) {
          tableDiffs.differences.push(`  ⚠️  Constraint count mismatch (LOCAL: ${localConstraints.length}, REMOTE: ${remoteConstraints.length})`);
        }

        if (indexDiff) {
          tableDiffs.differences.push(`  ⚠️  Index count mismatch (LOCAL: ${localIndexes.length}, REMOTE: ${remoteIndexes.length})`);
        }

        detailedDifferences.push(tableDiffs);
      }
    }

    // Print detailed differences
    if (detailedDifferences.length > 0) {
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('DETAILED DIFFERENCES');
      console.log('═══════════════════════════════════════════════════════════════\n');

      detailedDifferences.forEach(({ tableName, differences }) => {
        console.log(`\n📋 Table: ${tableName}`);
        differences.forEach(diff => console.log(diff));
      });
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const totalIdentical = (onlyInLocal.length === 0 && onlyInRemote.length === 0 && differentTables === 0);

    console.log(`Total tables in LOCAL: ${localTables.length}`);
    console.log(`Total tables in REMOTE: ${remoteTables.length}`);
    console.log(`Common tables: ${commonTables.length}`);
    console.log(`Identical tables: ${identicalTables}`);
    console.log(`Different tables: ${differentTables}`);
    console.log(`Only in LOCAL: ${onlyInLocal.length}`);
    console.log(`Only in REMOTE: ${onlyInRemote.length}`);

    console.log('\n' + (totalIdentical ? '✅ DATABASES ARE IDENTICAL!' : '❌ DATABASES HAVE DIFFERENCES!') + '\n');

  } catch (error) {
    console.error('❌ Error during comparison:', error.message);
    console.error(error.stack);
  } finally {
    await localPool.end();
    await remotePool.end();
  }
}

// Run comparison
compareDatabases();
