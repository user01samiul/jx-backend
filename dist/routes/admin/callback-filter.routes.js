"use strict";
/**
 * Admin Routes pentru Callback Filter Control
 *
 * Endpoint-uri pentru activare/dezactivare și monitoring al filtrului de callback-uri.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const callback_filter_service_1 = require("../../services/provider/callback-filter.service");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const admin_middleware_1 = require("../../middlewares/admin.middleware");
const router = express_1.default.Router();
/**
 * GET /api/admin/callback-filter/config
 * Obține configurația curentă de filtrare
 */
router.get('/config', auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const config = await (0, callback_filter_service_1.getFilterConfig)();
        res.json({
            success: true,
            data: config
        });
    }
    catch (error) {
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
router.put('/config', auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware, async (req, res) => {
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
        const updatedConfig = await (0, callback_filter_service_1.updateFilterConfig)({
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
    }
    catch (error) {
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
router.post('/enable', auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { filter_percentage } = req.body;
        const config = await (0, callback_filter_service_1.updateFilterConfig)({
            enabled: true,
            filter_percentage: filter_percentage || 0.3 // 30% default
        });
        res.json({
            success: true,
            message: `Callback filter ENABLED (${(config.filter_percentage * 100).toFixed(0)}% hidden)`,
            data: config
        });
    }
    catch (error) {
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
router.post('/disable', auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const config = await (0, callback_filter_service_1.updateFilterConfig)({
            enabled: false
        });
        res.json({
            success: true,
            message: 'Callback filter DISABLED',
            data: config
        });
    }
    catch (error) {
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
router.get('/stats', auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        const stats = await (0, callback_filter_service_1.getFilterStats)(start_date, end_date);
        // Calculate GGR impact
        const hiddenBets = stats.breakdown
            .filter((row) => row.decision === 'HIDDEN' && row.transaction_type === 'BET')
            .reduce((sum, row) => sum + parseFloat(row.total_amount || 0), 0);
        const hiddenWins = stats.breakdown
            .filter((row) => row.decision === 'HIDDEN' && row.transaction_type === 'WIN')
            .reduce((sum, row) => sum + parseFloat(row.total_amount || 0), 0);
        const reportedBets = stats.breakdown
            .filter((row) => row.decision === 'REPORTED' && row.transaction_type === 'BET')
            .reduce((sum, row) => sum + parseFloat(row.total_amount || 0), 0);
        const reportedWins = stats.breakdown
            .filter((row) => row.decision === 'REPORTED' && row.transaction_type === 'WIN')
            .reduce((sum, row) => sum + parseFloat(row.total_amount || 0), 0);
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
    }
    catch (error) {
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
router.post('/reset-cache', auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        (0, callback_filter_service_1.resetFilterCache)();
        res.json({
            success: true,
            message: 'Filter cache reset successfully'
        });
    }
    catch (error) {
        console.error('[FILTER API] Error resetting cache:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
exports.default = router;
