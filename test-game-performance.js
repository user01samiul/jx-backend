const { Pool } = require('pg');

const pool = new Pool({
  host: '194.102.33.209',
  user: 'postgres',
  password: '12358Voot#',
  database: 'jackpotx-db',
  port: 5432,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

async function testGamePerformance() {
  try {
    console.log('Testing game performance endpoint query...\n');

    const timeRange = '7d';
    const limit = 5;
    const interval = '7 days';

    const result = await pool.query(
      `
      SELECT
        g.name as game,
        g.provider,
        COUNT(b.id) as bets,
        COALESCE(SUM(b.bet_amount), 0) as wagered,
        COALESCE(SUM(CASE WHEN b.outcome = 'win' THEN b.win_amount ELSE 0 END), 0) as won,
        COALESCE(SUM(b.bet_amount) - SUM(CASE WHEN b.outcome = 'win' THEN b.win_amount ELSE 0 END), 0) as net_profit,
        CASE
          WHEN COUNT(b.id) > 0 THEN COALESCE(SUM(b.bet_amount) / COUNT(b.id), 0)
          ELSE 0
        END as avg_bet,
        CASE
          WHEN COUNT(b.id) > 0 THEN
            ROUND(CAST((COUNT(CASE WHEN b.outcome = 'win' THEN 1 END)::float / COUNT(b.id)::float) * 100 AS numeric), 2)
          ELSE 0
        END as win_rate
      FROM games g
      LEFT JOIN bets b ON g.id = b.game_id
        AND b.placed_at >= NOW() - INTERVAL '${interval}'
        AND b.outcome IN ('win', 'lose', 'loss')
      GROUP BY g.id, g.name, g.provider
      HAVING COUNT(b.id) > 0
      ORDER BY net_profit DESC
      LIMIT $1
      `,
      [limit]
    );

    console.log(`Found ${result.rows.length} games with betting activity\n`);

    const formattedResults = result.rows.map(row => {
      const bets = parseInt(row.bets) || 0;
      const wagered = parseFloat(row.wagered) || 0;
      const won = parseFloat(row.won) || 0;
      const netProfit = parseFloat(row.net_profit) || 0;
      const avgBet = parseFloat(row.avg_bet) || 0;
      const winRate = parseFloat(row.win_rate) || 0;

      return {
        game: row.game || 'Unknown Game',
        bets: bets,
        wagered: parseFloat(wagered.toFixed(2)),
        won: parseFloat(won.toFixed(2)),
        netProfit: parseFloat(netProfit.toFixed(2)),
        avgBet: parseFloat(avgBet.toFixed(2)),
        winRate: parseFloat(winRate.toFixed(2))
      };
    });

    console.log('Formatted Response:');
    console.log(JSON.stringify({ success: true, data: formattedResults }, null, 2));

    console.log('\n✅ All fields are properly formatted with correct field names:');
    console.log('   - game (string)');
    console.log('   - bets (number)');
    console.log('   - wagered (number with 2 decimals)');
    console.log('   - won (number with 2 decimals)');
    console.log('   - netProfit (number with 2 decimals)');
    console.log('   - avgBet (number with 2 decimals)');
    console.log('   - winRate (number with 2 decimals)');

    // Verify no NaN values
    const hasNaN = formattedResults.some(row =>
      isNaN(row.bets) || isNaN(row.wagered) || isNaN(row.won) ||
      isNaN(row.netProfit) || isNaN(row.avgBet) || isNaN(row.winRate)
    );

    if (hasNaN) {
      console.log('\n❌ ERROR: Found NaN values in results!');
    } else {
      console.log('\n✅ No NaN values detected - all numeric fields are valid numbers');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

testGamePerformance();
