// RTP Control Management Script
// Usage: node rtp-control.js [enable|disable|status]

const { Pool } = require('pg');

const pool = new Pool({
  host: 'pg_db',
  port: 5432,
  database: 'jackpotx-db',
  user: 'postgres',
  password: 'postgres'
});

async function getCurrentRtpSettings() {
  const result = await pool.query(
    "SELECT id, target_profit_percent, effective_rtp, adjustment_mode, updated_at FROM rtp_settings ORDER BY id DESC LIMIT 1"
  );
  
  if (result.rows.length === 0) {
    console.log('❌ No RTP settings found');
    return null;
  }
  
  return result.rows[0];
}

async function updateRtpSettings(effectiveRtp, adjustmentMode = 'manual') {
  const result = await pool.query(
    `INSERT INTO rtp_settings (target_profit_percent, effective_rtp, adjustment_mode, updated_at) 
     VALUES (20.00, $1, $2, NOW()) RETURNING *`,
    [effectiveRtp, adjustmentMode]
  );
  
  return result.rows[0];
}

async function showStatus() {
  const settings = await getCurrentRtpSettings();
  
  if (!settings) {
    console.log('❌ No RTP settings found');
    return;
  }
  
  console.log('\n📊 CURRENT RTP SETTINGS:');
  console.log('========================');
  console.log(`ID: ${settings.id}`);
  console.log(`Target Profit: ${settings.target_profit_percent}%`);
  console.log(`Effective RTP: ${settings.effective_rtp}%`);
  console.log(`Adjustment Mode: ${settings.adjustment_mode}`);
  console.log(`Last Updated: ${settings.updated_at}`);
  
  if (settings.effective_rtp >= 100) {
    console.log('\n✅ RTP CONTROL: DISABLED (No profit reduction)');
  } else {
    console.log(`\n🔒 RTP CONTROL: ENABLED (${100 - settings.effective_rtp}% profit reduction)`);
  }
}

async function enableRtpControl() {
  console.log('\n🔒 ENABLING RTP CONTROL...');
  
  const newSettings = await updateRtpSettings(80.00, 'auto');
  
  console.log('✅ RTP Control Enabled!');
  console.log(`Effective RTP: ${newSettings.effective_rtp}%`);
  console.log('Profit reduction: 20% (80% effective RTP vs 96% provider RTP)');
  console.log('Mode: Auto-adjustment enabled');
}

async function disableRtpControl() {
  console.log('\n🔓 DISABLING RTP CONTROL...');
  
  const newSettings = await updateRtpSettings(100.00, 'manual');
  
  console.log('✅ RTP Control Disabled!');
  console.log(`Effective RTP: ${newSettings.effective_rtp}%`);
  console.log('Profit reduction: 0% (Full win amounts credited)');
  console.log('Mode: Manual (no auto-adjustment)');
}

async function main() {
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'enable':
        await enableRtpControl();
        break;
      case 'disable':
        await disableRtpControl();
        break;
      case 'status':
        await showStatus();
        break;
      default:
        console.log('\n🎯 RTP CONTROL MANAGEMENT');
        console.log('========================');
        console.log('Usage: node rtp-control.js [command]');
        console.log('');
        console.log('Commands:');
        console.log('  enable  - Enable RTP control (80% effective RTP)');
        console.log('  disable - Disable RTP control (100% effective RTP)');
        console.log('  status  - Show current RTP settings');
        console.log('');
        console.log('Examples:');
        console.log('  node rtp-control.js enable   # Enable profit control');
        console.log('  node rtp-control.js disable  # Disable profit control');
        console.log('  node rtp-control.js status   # Check current settings');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

main(); 