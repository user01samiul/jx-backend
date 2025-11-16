"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../middlewares/authenticate");
const deposit_limits_controller_1 = require("../api/responsible-gaming/deposit-limits.controller");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(authenticate_1.authenticate);
// =====================================================
// DEPOSIT LIMITS
// =====================================================
/**
 * @route POST /api/responsible-gaming/deposit-limits
 * @desc Create a new deposit limit
 * @access Private
 */
router.post('/deposit-limits', deposit_limits_controller_1.createLimit);
/**
 * @route PUT /api/responsible-gaming/deposit-limits
 * @desc Update an existing deposit limit
 * @access Private
 */
router.put('/deposit-limits', deposit_limits_controller_1.updateLimit);
/**
 * @route GET /api/responsible-gaming/deposit-limits
 * @desc Get all deposit limits for user
 * @access Private
 */
router.get('/deposit-limits', deposit_limits_controller_1.getLimits);
/**
 * @route GET /api/responsible-gaming/deposit-limits/grouped
 * @desc Get deposit limits grouped by type (DAILY, WEEKLY, MONTHLY)
 * @access Private
 */
router.get('/deposit-limits/grouped', deposit_limits_controller_1.getLimitsGrouped);
/**
 * @route POST /api/responsible-gaming/deposit-limits/check
 * @desc Check if a deposit amount is within limits
 * @access Private
 */
router.post('/deposit-limits/check', deposit_limits_controller_1.checkLimit);
/**
 * @route DELETE /api/responsible-gaming/deposit-limits/:limitType
 * @desc Cancel/Delete a deposit limit
 * @access Private
 */
router.delete('/deposit-limits/:limitType', deposit_limits_controller_1.deleteLimit);
/**
 * @route GET /api/responsible-gaming/deposit-limits/history
 * @desc Get deposit limit change history
 * @access Private
 */
router.get('/deposit-limits/history', deposit_limits_controller_1.getLimitHistory);
// =====================================================
// SELF-EXCLUSION
// =====================================================
const self_exclusion_service_1 = require("../services/responsible-gaming/self-exclusion.service");
/**
 * @route POST /api/responsible-gaming/self-exclusion
 * @desc Create a self-exclusion
 * @access Private
 */
router.post('/self-exclusion', async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const ip = req.clientIP || req.ip;
        const userAgent = req.headers['user-agent'];
        const exclusion = await (0, self_exclusion_service_1.createSelfExclusion)({
            user_id: userId,
            exclusion_type: req.body.exclusion_type,
            duration: req.body.duration,
            reason: req.body.reason,
            notes: req.body.notes,
            ip_address: ip,
            user_agent: userAgent
        });
        res.status(201).json({
            success: true,
            message: 'Self-exclusion activated successfully',
            data: exclusion
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route GET /api/responsible-gaming/self-exclusion
 * @desc Get active self-exclusion
 * @access Private
 */
router.get('/self-exclusion', async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const exclusion = await (0, self_exclusion_service_1.getUserSelfExclusion)(userId);
        res.json({
            success: true,
            data: exclusion
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route GET /api/responsible-gaming/self-exclusion/status
 * @desc Check self-exclusion status
 * @access Private
 */
router.get('/self-exclusion/status', async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const status = await (0, self_exclusion_service_1.checkSelfExclusionStatus)(userId);
        res.json({
            success: true,
            data: status
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route POST /api/responsible-gaming/self-exclusion/revoke
 * @desc Revoke self-exclusion (with cooling period check)
 * @access Private
 */
router.post('/self-exclusion/revoke', async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { reason } = req.body;
        if (!reason) {
            res.status(400).json({
                success: false,
                message: 'Reason is required'
            });
            return;
        }
        const result = await (0, self_exclusion_service_1.revokeSelfExclusion)(userId, userId, reason);
        res.json({
            success: true,
            message: 'Self-exclusion revoked successfully',
            data: result
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
/**
 * @route GET /api/responsible-gaming/self-exclusion/history
 * @desc Get self-exclusion history
 * @access Private
 */
router.get('/self-exclusion/history', async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const history = await (0, self_exclusion_service_1.getSelfExclusionHistory)(userId);
        res.json({
            success: true,
            data: history,
            count: history.length
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
