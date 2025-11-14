import express, { Request, Response } from 'express';
import pool from '../../db/postgres';
import { authenticate } from '../../middlewares/auth.middleware';
import { adminMiddleware } from '../../middlewares/admin.middleware';

const router = express.Router();

/**
 * @route GET /api/admin/free-spins-campaigns
 * @desc Get all free spins campaigns with user details
 * @access Admin only
 */
router.get('/', authenticate, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { status, source, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT
        fsc.*,
        u.username,
        u.email,
        g.name as game_name
      FROM user_free_spins_campaigns fsc
      LEFT JOIN users u ON fsc.user_id = u.id
      LEFT JOIN games g ON fsc.game_id = g.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND fsc.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (source) {
      query += ` AND fsc.source = $${paramIndex}`;
      params.push(source);
      paramIndex++;
    }

    query += ` ORDER BY fsc.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    console.log('[ADMIN] Fetching free spins campaigns:', { status, source, limit, offset });

    const result = await pool.query(query, params);

    res.json({
      success: true,
      campaigns: result.rows,
      count: result.rowCount
    });
  } catch (error: any) {
    console.error('[ADMIN] Error fetching free spins campaigns:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/admin/free-spins-campaigns/stats
 * @desc Get free spins campaigns statistics
 * @access Admin only
 */
router.get('/stats', authenticate, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const statsQuery = `
      SELECT
        COUNT(*) as total_campaigns,
        COUNT(*) FILTER (WHERE status = 'active') as active_campaigns,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_campaigns,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_campaigns,
        COUNT(*) FILTER (WHERE status = 'expired') as expired_campaigns,
        SUM(freespins_total) as total_spins_granted,
        SUM(freespins_used) as total_spins_used,
        SUM(freespins_remaining) as total_spins_remaining,
        SUM(total_win_amount) as total_win_amount,
        SUM(total_bet_used) as total_bet_used
      FROM user_free_spins_campaigns
    `;

    const result = await pool.query(statsQuery);
    const stats = result.rows[0];

    // Convert bigint to number for JSON serialization
    const formattedStats = {
      total_campaigns: parseInt(stats.total_campaigns) || 0,
      active_campaigns: parseInt(stats.active_campaigns) || 0,
      completed_campaigns: parseInt(stats.completed_campaigns) || 0,
      pending_campaigns: parseInt(stats.pending_campaigns) || 0,
      expired_campaigns: parseInt(stats.expired_campaigns) || 0,
      total_spins_granted: parseInt(stats.total_spins_granted) || 0,
      total_spins_used: parseInt(stats.total_spins_used) || 0,
      total_spins_remaining: parseInt(stats.total_spins_remaining) || 0,
      total_win_amount: parseFloat(stats.total_win_amount) || 0,
      total_bet_used: parseFloat(stats.total_bet_used) || 0,
      usage_percentage: stats.total_spins_granted > 0
        ? ((parseInt(stats.total_spins_used) / parseInt(stats.total_spins_granted)) * 100).toFixed(2)
        : '0',
    };

    console.log('[ADMIN] Free spins campaigns stats:', formattedStats);

    res.json({
      success: true,
      stats: formattedStats
    });
  } catch (error: any) {
    console.error('[ADMIN] Error fetching free spins stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/admin/free-spins-campaigns/:campaignCode
 * @desc Get specific campaign details
 * @access Admin only
 */
router.get('/:campaignCode', authenticate, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { campaignCode } = req.params;

    const query = `
      SELECT
        fsc.*,
        u.username,
        u.email,
        g.name as game_name,
        CASE
          WHEN fsc.source = 'challenge' THEN ct.name
          WHEN fsc.source = 'loyalty' THEN lsi.name
        END as source_name
      FROM user_free_spins_campaigns fsc
      LEFT JOIN users u ON fsc.user_id = u.id
      LEFT JOIN games g ON fsc.game_id = g.id
      LEFT JOIN challenge_templates ct ON fsc.source = 'challenge' AND fsc.source_id = ct.id
      LEFT JOIN loyalty_shop_items lsi ON fsc.source = 'loyalty' AND fsc.source_id = lsi.id
      WHERE fsc.campaign_code = $1
    `;

    const result = await pool.query(query, [campaignCode]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      campaign: result.rows[0]
    });
  } catch (error: any) {
    console.error('[ADMIN] Error fetching campaign details:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/admin/free-spins-campaigns/:campaignCode/cancel
 * @desc Cancel a free spins campaign
 * @access Admin only
 */
router.post('/:campaignCode/cancel', authenticate, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { campaignCode } = req.params;

    // Update campaign status to cancelled
    const result = await pool.query(
      `UPDATE user_free_spins_campaigns
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE campaign_code = $1 AND status IN ('pending', 'active')
       RETURNING *`,
      [campaignCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found or already completed/cancelled'
      });
    }

    // TODO: Also cancel in Innova API
    console.log('[ADMIN] Campaign cancelled:', campaignCode);

    res.json({
      success: true,
      message: 'Campaign cancelled successfully',
      campaign: result.rows[0]
    });
  } catch (error: any) {
    console.error('[ADMIN] Error cancelling campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
