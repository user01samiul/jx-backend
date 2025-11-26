const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'jackpotx-db',
  user: 'postgres',
  password: '12358Voot#'
});

async function checkSchema() {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'transactions'
      ORDER BY ordinal_position;
    `);

    console.log('Transactions Table Columns:');
    console.log('='.repeat(60));
    result.rows.forEach(col => {
      console.log(`${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable}`);
    });
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema();
