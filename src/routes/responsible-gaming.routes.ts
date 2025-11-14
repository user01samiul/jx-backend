import { Router } from "express";
import { authenticate } from "../middlewares/authenticate";
import {
    createLimit,
    updateLimit,
    getLimits,
    getLimitsGrouped,
    checkLimit,
    deleteLimit,
    getLimitHistory
} from "../api/responsible-gaming/deposit-limits.controller";

const router = Router();

// All routes require authentication
router.use(authenticate);

// =====================================================
// DEPOSIT LIMITS
// =====================================================

/**
 * @route POST /api/responsible-gaming/deposit-limits
 * @desc Create a new deposit limit
 * @access Private
 */
router.post('/deposit-limits', createLimit);

/**
 * @route PUT /api/responsible-gaming/deposit-limits
 * @desc Update an existing deposit limit
 * @access Private
 */
router.put('/deposit-limits', updateLimit);

/**
 * @route GET /api/responsible-gaming/deposit-limits
 * @desc Get all deposit limits for user
 * @access Private
 */
router.get('/deposit-limits', getLimits);

/**
 * @route GET /api/responsible-gaming/deposit-limits/grouped
 * @desc Get deposit limits grouped by type (DAILY, WEEKLY, MONTHLY)
 * @access Private
 */
router.get('/deposit-limits/grouped', getLimitsGrouped);

/**
 * @route POST /api/responsible-gaming/deposit-limits/check
 * @desc Check if a deposit amount is within limits
 * @access Private
 */
router.post('/deposit-limits/check', checkLimit);

/**
 * @route DELETE /api/responsible-gaming/deposit-limits/:limitType
 * @desc Cancel/Delete a deposit limit
 * @access Private
 */
router.delete('/deposit-limits/:limitType', deleteLimit);

/**
 * @route GET /api/responsible-gaming/deposit-limits/history
 * @desc Get deposit limit change history
 * @access Private
 */
router.get('/deposit-limits/history', getLimitHistory);

// =====================================================
// SELF-EXCLUSION
// =====================================================

import {
    createSelfExclusion,
    getUserSelfExclusion,
    checkSelfExclusionStatus,
    revokeSelfExclusion,
    getSelfExclusionHistory
} from "../services/responsible-gaming/self-exclusion.service";

/**
 * @route POST /api/responsible-gaming/self-exclusion
 * @desc Create a self-exclusion
 * @access Private
 */
router.post('/self-exclusion', async (req, res, next) => {
    try {
        const userId = (req as any).user?.userId;
        const ip = (req as any).clientIP || req.ip;
        const userAgent = req.headers['user-agent'];

        const exclusion = await createSelfExclusion({
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
    } catch (error: any) {
        next(error);
    }
});

/**
 * @route GET /api/responsible-gaming/self-exclusion
 * @desc Get active self-exclusion
 * @access Private
 */
router.get('/self-exclusion', async (req, res, next) => {
    try {
        const userId = (req as any).user?.userId;
        const exclusion = await getUserSelfExclusion(userId);

        res.json({
            success: true,
            data: exclusion
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route GET /api/responsible-gaming/self-exclusion/status
 * @desc Check self-exclusion status
 * @access Private
 */
router.get('/self-exclusion/status', async (req, res, next) => {
    try {
        const userId = (req as any).user?.userId;
        const status = await checkSelfExclusionStatus(userId);

        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route POST /api/responsible-gaming/self-exclusion/revoke
 * @desc Revoke self-exclusion (with cooling period check)
 * @access Private
 */
router.post('/self-exclusion/revoke', async (req, res, next) => {
    try {
        const userId = (req as any).user?.userId;
        const { reason } = req.body;

        if (!reason) {
            res.status(400).json({
                success: false,
                message: 'Reason is required'
            });
            return;
        }

        const result = await revokeSelfExclusion(userId, userId, reason);

        res.json({
            success: true,
            message: 'Self-exclusion revoked successfully',
            data: result
        });
    } catch (error: any) {
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
    try {
        const userId = (req as any).user?.userId;
        const history = await getSelfExclusionHistory(userId);

        res.json({
            success: true,
            data: history,
            count: history.length
        });
    } catch (error) {
        next(error);
    }
});

export default router;
