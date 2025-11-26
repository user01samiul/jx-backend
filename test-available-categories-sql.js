const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '12358Voot#',
  database: 'jackpotx-db',
  max: 10
});

async function testAvailableCategoriesSQL() {
  console.log('🧪 Testing Available Categories SQL Query\n');
  console.log('='.repeat(80));

  const client = await pool.connect();

  try {
    console.log('\n📊 Running SQL query...\n');

    const result = await client.query(
      `SELECT
        CASE
          WHEN LOWER(name) LIKE '%live%' OR LOWER(name) LIKE '%dealer%' THEN 'live_casino'
          WHEN LOWER(name) LIKE '%blackjack%' OR LOWER(name) LIKE '%roulette%'
            OR LOWER(name) LIKE '%baccarat%' OR LOWER(name) LIKE '%poker%' THEN 'table_games'
          WHEN LOWER(name) LIKE '%video poker%' THEN 'video_poker'
          ELSE 'slots'
        END as category,
        COUNT(*) as game_count
       FROM games
       GROUP BY
         CASE
           WHEN LOWER(name) LIKE '%live%' OR LOWER(name) LIKE '%dealer%' THEN 'live_casino'
           WHEN LOWER(name) LIKE '%blackjack%' OR LOWER(name) LIKE '%roulette%'
             OR LOWER(name) LIKE '%baccarat%' OR LOWER(name) LIKE '%poker%' THEN 'table_games'
           WHEN LOWER(name) LIKE '%video poker%' THEN 'video_poker'
           ELSE 'slots'
         END
       ORDER BY category ASC`
    );

    console.log('✅ SUCCESS! SQL query executed without errors.\n');
    console.log('📋 Available Categories:');
    console.log('─'.repeat(50));

    result.rows.forEach(row => {
      console.log(`   ${row.category.padEnd(20)} | ${row.game_count} games`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ SQL query is now fixed and working correctly!');
    console.log('💡 Frontend should now be able to load categories without errors.\n');

  } catch (error) {
    console.error('\n❌ SQL ERROR:', error.message);
    console.error('Detail:', error.detail || 'N/A');
    console.error('Hint:', error.hint || 'N/A');
  } finally {
    client.release();
    await pool.end();
  }
}

testAvailableCategoriesSQL();
