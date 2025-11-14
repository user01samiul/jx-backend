import express, { Request, Response } from 'express';
import pool from '../db/postgres';

const router = express.Router();

/**
 * Innova Webhook Handler
 * Receives notifications from Innova TimelessTech for:
 * - Jackpots (NEW_INSTANCE, INSTANCE_WIN, UPDATE_SIZE)
 * - Tournaments (NEW_INSTANCE, UPDATE_STATUS)
 */

/**
 * @route POST /api/innova/webhooks/jackpot
 * @desc Receive jackpot webhook notifications from Innova
 * @access Public (validated by Innova secret)
 */
router.post('/jackpot', async (req: Request, res: Response) => {
  try {
    const { event, data } = req.body;

    console.log('[INNOVA WEBHOOK] Jackpot event received:', event, data);

    switch (event) {
      case 'NEW_INSTANCE':
        // New jackpot instance created by Innova
        await handleNewJackpotInstance(data);
        break;

      case 'INSTANCE_WIN':
        // Player won the jackpot!
        await handleJackpotWin(data);
        break;

      case 'UPDATE_SIZE':
        // Jackpot size updated (e.g., reached 50%, 75%, etc.)
        await handleJackpotSizeUpdate(data);
        break;

      default:
        console.warn('[INNOVA WEBHOOK] Unknown jackpot event:', event);
    }

    res.json({ success: true, message: 'Webhook received' });
  } catch (error: any) {
    console.error('[INNOVA WEBHOOK] Error processing jackpot webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/innova/webhooks/tournament
 * @desc Receive tournament webhook notifications from Innova
 * @access Public (validated by Innova secret)
 */
router.post('/tournament', async (req: Request, res: Response) => {
  try {
    const { event, data } = req.body;

    console.log('[INNOVA WEBHOOK] Tournament event received:', event, data);

    switch (event) {
      case 'NEW_INSTANCE':
        // New tournament instance created by Innova
        await handleNewTournamentInstance(data);
        break;

      case 'UPDATE_STATUS':
        // Tournament status changed (PENDING -> ACTIVE, ACTIVE -> FINISHED, etc.)
        await handleTournamentStatusUpdate(data);
        break;

      default:
        console.warn('[INNOVA WEBHOOK] Unknown tournament event:', event);
    }

    res.json({ success: true, message: 'Webhook received' });
  } catch (error: any) {
    console.error('[INNOVA WEBHOOK] Error processing tournament webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Handle new jackpot instance from Innova
 */
async function handleNewJackpotInstance(data: any) {
  const {
    id: innova_instance_id,
    jackpot: innova_schedule_id,
    name,
    size,
    seed,
    currency,
    timestamp
  } = data;

  // Check if schedule exists in our database
  let scheduleResult = await pool.query(
    'SELECT id FROM jackpot_schedules WHERE innova_schedule_id = $1',
    [innova_schedule_id]
  );

  let scheduleId;

  if (scheduleResult.rows.length === 0) {
    // Create new schedule if it doesn't exist
    const newSchedule = await pool.query(
      `INSERT INTO jackpot_schedules (
        innova_schedule_id, name, currency_code, seed_amount,
        current_amount, status, type
      ) VALUES ($1, $2, $3, $4, $5, 'ACTIVE', 'CASINO')
      RETURNING id`,
      [innova_schedule_id, name, currency, seed, size]
    );
    scheduleId = newSchedule.rows[0].id;
  } else {
    scheduleId = scheduleResult.rows[0].id;
  }

  // Check if instance already exists
  const existingInstance = await pool.query(
    'SELECT id FROM jackpot_instances WHERE innova_instance_id = $1',
    [innova_instance_id]
  );

  if (existingInstance.rows.length === 0) {
    // Create new jackpot instance
    await pool.query(
      `INSERT INTO jackpot_instances (
        schedule_id, innova_instance_id, current_amount, seed_size, status, started_at
      ) VALUES ($1, $2, $3, $4, 'ACTIVE', $5)`,
      [scheduleId, innova_instance_id, size, seed, new Date(timestamp)]
    );

    // Update schedule current amount
    await pool.query(
      'UPDATE jackpot_schedules SET current_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [size, scheduleId]
    );

    console.log(`[INNOVA] Created new jackpot instance: ${name} - ${currency} ${size}`);
  }
}

/**
 * Handle jackpot win from Innova
 */
async function handleJackpotWin(data: any) {
  const {
    id: innova_instance_id,
    name,
    size: winAmount,
    currency,
    winner_entity: winnerId,
    winner: walletName,
    timestamp
  } = data;

  // Find jackpot instance
  const instanceResult = await pool.query(
    `SELECT ji.id, ji.schedule_id, js.name as schedule_name
     FROM jackpot_instances ji
     JOIN jackpot_schedules js ON ji.schedule_id = js.id
     WHERE ji.innova_instance_id = $1`,
    [innova_instance_id]
  );

  if (instanceResult.rows.length === 0) {
    console.error(`[INNOVA] Jackpot instance not found: ${innova_instance_id}`);
    return;
  }

  const instance = instanceResult.rows[0];

  // Record jackpot win
  await pool.query(
    `INSERT INTO jackpot_winners (
      instance_id, user_id, wallet_name, win_amount, won_at
    ) VALUES ($1, $2, $3, $4, $5)`,
    [instance.id, winnerId, walletName, winAmount, new Date(timestamp)]
  );

  // Update instance status
  await pool.query(
    'UPDATE jackpot_instances SET status = $1, ended_at = $2 WHERE id = $3',
    ['FINISHED', new Date(timestamp), instance.id]
  );

  console.log(`[INNOVA] Jackpot WIN! Player ${winnerId} (${walletName}) won ${currency} ${winAmount} in ${instance.schedule_name}`);

  // NOTE: The actual balance credit is handled by Innova's changebalance callback
  // We just record the win here for history and display
}

/**
 * Handle jackpot size update from Innova
 */
async function handleJackpotSizeUpdate(data: any) {
  const {
    id: innova_instance_id,
    size: currentAmount,
    progress,
    timestamp
  } = data;

  // Update jackpot instance current amount
  const result = await pool.query(
    `UPDATE jackpot_instances ji
     SET current_amount = $1, updated_at = $2
     FROM jackpot_schedules js
     WHERE ji.innova_instance_id = $3 AND ji.schedule_id = js.id
     RETURNING js.id as schedule_id`,
    [currentAmount, new Date(timestamp), innova_instance_id]
  );

  if (result.rows.length > 0) {
    // Also update schedule current amount
    await pool.query(
      'UPDATE jackpot_schedules SET current_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [currentAmount, result.rows[0].schedule_id]
    );

    console.log(`[INNOVA] Jackpot size updated: ${currentAmount} (${progress}% progress)`);
  }
}

/**
 * Handle new tournament instance from Innova
 */
async function handleNewTournamentInstance(data: any) {
  const {
    id: innova_instance_id,
    tournament: innova_schedule_id,
    name,
    currency,
    status,
    start,
    end,
    timestamp
  } = data;

  // Check if schedule exists
  let scheduleResult = await pool.query(
    'SELECT id FROM tournament_schedules WHERE innova_schedule_id = $1',
    [innova_schedule_id]
  );

  let scheduleId;

  if (scheduleResult.rows.length === 0) {
    // Create new schedule
    const newSchedule = await pool.query(
      `INSERT INTO tournament_schedules (
        innova_schedule_id, name, currency_code, status,
        start_time, end_time, prize_pool, min_bet
      ) VALUES ($1, $2, $3, $4, $5, $6, 0, 0)
      RETURNING id`,
      [innova_schedule_id, name, currency, status, new Date(start), new Date(end)]
    );
    scheduleId = newSchedule.rows[0].id;
  } else {
    scheduleId = scheduleResult.rows[0].id;
  }

  // Check if instance already exists
  const existingInstance = await pool.query(
    'SELECT id FROM tournament_instances WHERE innova_instance_id = $1',
    [innova_instance_id]
  );

  if (existingInstance.rows.length === 0) {
    // Create new tournament instance
    await pool.query(
      `INSERT INTO tournament_instances (
        schedule_id, innova_instance_id, status, started_at
      ) VALUES ($1, $2, $3, $4)`,
      [scheduleId, innova_instance_id, status, new Date(timestamp)]
    );

    console.log(`[INNOVA] Created new tournament instance: ${name} - ${currency} (${status})`);
  }
}

/**
 * Handle tournament status update from Innova
 */
async function handleTournamentStatusUpdate(data: any) {
  const {
    id: innova_instance_id,
    status,
    previousStatus,
    timestamp
  } = data;

  // Update tournament instance status
  const result = await pool.query(
    `UPDATE tournament_instances ti
     SET status = $1, updated_at = $2
     FROM tournament_schedules ts
     WHERE ti.innova_instance_id = $3 AND ti.schedule_id = ts.id
     RETURNING ts.id as schedule_id, ts.name`,
    [status, new Date(timestamp), innova_instance_id]
  );

  if (result.rows.length > 0) {
    // Also update schedule status
    await pool.query(
      'UPDATE tournament_schedules SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, result.rows[0].schedule_id]
    );

    console.log(`[INNOVA] Tournament status updated: ${result.rows[0].name} - ${previousStatus} -> ${status}`);

    // If tournament finished, we should fetch final leaderboard and distribute prizes
    if (status === 'FINISHED') {
      console.log(`[INNOVA] Tournament ${result.rows[0].name} finished. Prize distribution should be handled.`);
      // TODO: Implement prize distribution logic
    }
  }
}

export default router;
