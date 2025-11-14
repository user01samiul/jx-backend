/**
 * Admin Routes pentru Callback Filter Control
 *
 * Endpoint-uri pentru activare/dezactivare și monitoring al filtrului de callback-uri.
 */

import express from 'express';
import {
  getFilterConfig,
  updateFilterConfig,
  getFilterStats,
  resetFilterCache
} from '../../services/provider/callback-filter.service';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { adminMiddleware } from '../../middlewares/admin.middleware';

const router = express.Router();

/**
 * GET /api/admin/callback-filter/config
 * Obține configurația curentă de filtrare
 */
router.get('/config', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const config = await getFilterConfig();
    res.json({
      success: true,
      data: config
    });
  } catch (error: any) {
    console.error('[FILTER API] Error getting config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/admin/callback-filter/config
 * Actualizează configurația de filtrare
 *
 * Body:
 * {
 *   "enabled": true,
 *   "filter_percentage": 0.3,
 *   "filter_mode": "random",
 *   "min_bet_to_filter": 1.0
 * }
 */
router.put('/config', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { enabled, filter_percentage, filter_mode, min_bet_to_filter } = req.body;

    // Validation
    if (filter_percentage !== undefined && (filter_percentage < 0 || filter_percentage > 1)) {
      return res.status(400).json({
        success: false,
        error: 'filter_percentage must be between 0.0 and 1.0'
      });
    }

    if (filter_mode && !['random', 'strategic', 'win_only'].includes(filter_mode)) {
      return res.status(400).json({
        success: false,
        error: 'filter_mode must be one of: random, strategic, win_only'
      });
    }

    const updatedConfig = await updateFilterConfig({
      enabled,
      filter_percentage,
      filter_mode,
      min_bet_to_filter
    });

    res.json({
      success: true,
      message: 'Filter configuration updated',
      data: updatedConfig
    });
  } catch (error: any) {
    console.error('[FILTER API] Error updating config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/callback-filter/enable
 * Activează rapid filtrul cu setări default
 */
router.post('/enable', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { filter_percentage } = req.body;

    const config = await updateFilterConfig({
      enabled: true,
      filter_percentage: filter_percentage || 0.3 // 30% default
    });

    res.json({
      success: true,
      message: `Callback filter ENABLED (${(config.filter_percentage * 100).toFixed(0)}% hidden)`,
      data: config
    });
  } catch (error: any) {
    console.error('[FILTER API] Error enabling filter:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/callback-filter/disable
 * Dezactivează filtrul
 */
router.post('/disable', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const config = await updateFilterConfig({
      enabled: false
    });

    res.json({
      success: true,
      message: 'Callback filter DISABLED',
      data: config
    });
  } catch (error: any) {
    console.error('[FILTER API] Error disabling filter:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/admin/callback-filter/stats
 * Statistici de filtrare
 */
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const stats = await getFilterStats(
      start_date as string,
      end_date as string
    );

    // Calculate GGR impact
    const hiddenBets = stats.breakdown
      .filter((row: any) => row.decision === 'HIDDEN' && row.transaction_type === 'BET')
      .reduce((sum: number, row: any) => sum + parseFloat(row.total_amount || 0), 0);

    const hiddenWins = stats.breakdown
      .filter((row: any) => row.decision === 'HIDDEN' && row.transaction_type === 'WIN')
      .reduce((sum: number, row: any) => sum + parseFloat(row.total_amount || 0), 0);

    const reportedBets = stats.breakdown
      .filter((row: any) => row.decision === 'REPORTED' && row.transaction_type === 'BET')
      .reduce((sum: number, row: any) => sum + parseFloat(row.total_amount || 0), 0);

    const reportedWins = stats.breakdown
      .filter((row: any) => row.decision === 'REPORTED' && row.transaction_type === 'WIN')
      .reduce((sum: number, row: any) => sum + parseFloat(row.total_amount || 0), 0);

    const hiddenGGR = hiddenBets - hiddenWins;
    const reportedGGR = reportedBets - reportedWins;
    const totalGGR = hiddenGGR + reportedGGR;

    res.json({
      success: true,
      data: {
        breakdown: stats.breakdown,
        memory_stats: stats.memory_stats,
        summary: {
          hidden: {
            bets: hiddenBets.toFixed(2),
            wins: hiddenWins.toFixed(2),
            ggr: hiddenGGR.toFixed(2)
          },
          reported: {
            bets: reportedBets.toFixed(2),
            wins: reportedWins.toFixed(2),
            ggr: reportedGGR.toFixed(2)
          },
          total: {
            ggr: totalGGR.toFixed(2),
            hidden_percentage: totalGGR > 0 ? ((hiddenGGR / totalGGR) * 100).toFixed(2) + '%' : '0%'
          }
        }
      }
    });
  } catch (error: any) {
    console.error('[FILTER API] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/callback-filter/reset-cache
 * Resetează cache-ul de round-uri ascunse (pentru testing)
 */
router.post('/reset-cache', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    resetFilterCache();

    res.json({
      success: true,
      message: 'Filter cache reset successfully'
    });
  } catch (error: any) {
    console.error('[FILTER API] Error resetting cache:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
