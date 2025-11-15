"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const JackpotService_1 = __importDefault(require("../services/JackpotService"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = express_1.default.Router();
/**
 * @route GET /api/jackpots/schedules
 * @desc Get all jackpot schedules
 * @access Admin
 */
router.get('/schedules', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, async (req, res) => {
    try {
        const { status, type, vendor, wallet_group } = req.query;
        const filters = {};
        if (status)
            filters.status = status;
        if (type)
            filters.type = type;
        if (vendor)
            filters.vendor = vendor;
        if (wallet_group)
            filters.wallet_group = wallet_group;
        const schedules = await JackpotService_1.default.getJackpotSchedules(filters);
        res.json({ success: true, data: schedules });
    }
    catch (error) {
        console.error('Error fetching jackpot schedules:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/jackpots/schedules
 * @desc Create a new jackpot schedule
 * @access Admin
 */
router.post('/schedules', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, async (req, res) => {
    try {
        const scheduleData = req.body;
        const scheduleId = await JackpotService_1.default.createJackpotSchedule(scheduleData);
        res.json({ success: true, message: 'Jackpot schedule created', data: { id: scheduleId } });
    }
    catch (error) {
        console.error('Error creating jackpot schedule:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route PUT /api/jackpots/schedules/:id
 * @desc Update a jackpot schedule
 * @access Admin
 */
router.put('/schedules/:id', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, async (req, res) => {
    try {
        const scheduleId = parseInt(req.params.id);
        const updates = req.body;
        await JackpotService_1.default.updateJackpotSchedule(scheduleId, updates);
        res.json({ success: true, message: 'Jackpot schedule updated' });
    }
    catch (error) {
        console.error('Error updating jackpot schedule:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route DELETE /api/jackpots/schedules/:id
 * @desc Delete a jackpot schedule
 * @access Admin
 */
router.delete('/schedules/:id', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, async (req, res) => {
    try {
        const scheduleId = parseInt(req.params.id);
        await JackpotService_1.default.deleteJackpotSchedule(scheduleId);
        res.json({ success: true, message: 'Jackpot schedule deleted' });
    }
    catch (error) {
        console.error('Error deleting jackpot schedule:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/jackpots/instances/start/:scheduleId
 * @desc Start a new jackpot instance
 * @access Admin
 */
router.post('/instances/start/:scheduleId', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, async (req, res) => {
    try {
        const scheduleId = parseInt(req.params.scheduleId);
        const instanceId = await JackpotService_1.default.startJackpotInstance(scheduleId);
        res.json({ success: true, message: 'Jackpot instance started', data: { id: instanceId } });
    }
    catch (error) {
        console.error('Error starting jackpot instance:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/jackpots/instances/trigger-win
 * @desc Manually trigger a jackpot win (for testing)
 * @access Admin
 */
router.post('/instances/trigger-win', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, async (req, res) => {
    try {
        const { instanceId, userId, walletName } = req.body;
        if (!instanceId || !userId || !walletName) {
            return res.status(400).json({ success: false, error: 'instanceId, userId, and walletName are required' });
        }
        const winAmount = await JackpotService_1.default.triggerJackpotWin(instanceId, userId, walletName);
        res.json({ success: true, message: 'Jackpot win triggered', data: { winAmount } });
    }
    catch (error) {
        console.error('Error triggering jackpot win:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/jackpots/active
 * @desc Get active jackpots from Innova (received via webhooks)
 * @access Public/Player
 */
router.get('/active', async (req, res) => {
    try {
        const pool = require('../db/postgres').default;
        // Get active jackpots from database (populated by Innova webhooks)
        const result = await pool.query(`
      SELECT
        js.id,
        js.innova_schedule_id,
        js.name,
        js.type,
        js.currency_code,
        js.seed_amount,
        js.current_amount,
        js.vendor,
        js.wallet_group,
        js.status,
        ji.innova_instance_id,
        ji.started_at,
        COUNT(jw.id) as total_wins
      FROM jackpot_schedules js
      LEFT JOIN jackpot_instances ji ON ji.schedule_id = js.id AND ji.status = 'ACTIVE'
      LEFT JOIN jackpot_winners jw ON jw.instance_id = ji.id
      WHERE js.status = 'ACTIVE'
      GROUP BY js.id, ji.id, ji.innova_instance_id, ji.started_at
      ORDER BY js.current_amount DESC
    `);
        res.json({ success: true, data: result.rows });
    }
    catch (error) {
        console.error('Error fetching active jackpots:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/jackpots/history
 * @desc Get jackpot win history
 * @access Public
 */
router.get('/history', async (req, res) => {
    try {
        const { schedule_id, limit } = req.query;
        const filters = {};
        if (schedule_id)
            filters.schedule_id = parseInt(schedule_id);
        if (limit)
            filters.limit = parseInt(limit);
        const history = await JackpotService_1.default.getJackpotHistory(filters);
        res.json({ success: true, data: history });
    }
    catch (error) {
        console.error('Error fetching jackpot history:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/jackpots/sync
 * @desc Manually sync jackpot amounts (fallback if Innova webhooks fail)
 * @access Admin
 */
router.post('/sync', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, async (req, res) => {
    try {
        const { JackpotSyncService } = require('../services/jackpot-sync.service');
        const result = await JackpotSyncService.syncJackpotAmounts();
        res.json({
            success: true,
            message: 'Jackpot sync completed',
            data: result
        });
    }
    catch (error) {
        console.error('Error syncing jackpots:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/jackpots/update-amount
 * @desc Manually update jackpot amount (emergency endpoint)
 * @access Admin
 */
router.post('/update-amount', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, async (req, res) => {
    try {
        const { innova_schedule_id, current_amount } = req.body;
        if (!innova_schedule_id || current_amount === undefined) {
            return res.status(400).json({
                success: false,
                error: 'innova_schedule_id and current_amount are required'
            });
        }
        const pool = require('../db/postgres').default;
        // Update schedule
        const scheduleResult = await pool.query('UPDATE jackpot_schedules SET current_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE innova_schedule_id = $2 RETURNING id, name', [current_amount, innova_schedule_id]);
        if (scheduleResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Jackpot not found'
            });
        }
        // Update active instance
        await pool.query('UPDATE jackpot_instances SET current_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE schedule_id = $2 AND status = $3', [current_amount, scheduleResult.rows[0].id, 'ACTIVE']);
        res.json({
            success: true,
            message: `Jackpot ${scheduleResult.rows[0].name} updated to ${current_amount}`
        });
    }
    catch (error) {
        console.error('Error updating jackpot amount:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
