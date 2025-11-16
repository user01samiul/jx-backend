"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLimitHistory = exports.deleteLimit = exports.checkLimit = exports.getLimitsGrouped = exports.getLimits = exports.updateLimit = exports.createLimit = void 0;
const deposit_limits_service_1 = require("../../services/responsible-gaming/deposit-limits.service");
/**
 * @route POST /api/responsible-gaming/deposit-limits
 * @desc Create a new deposit limit
 * @access Private (Player)
 */
const createLimit = async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const input = {
            user_id: userId,
            limit_type: req.body.limit_type,
            amount: req.body.amount,
            currency: req.body.currency || 'USD'
        };
        const limit = await (0, deposit_limits_service_1.createDepositLimit)(input);
        res.status(201).json({
            success: true,
            message: `${input.limit_type} deposit limit created successfully`,
            data: limit
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createLimit = createLimit;
/**
 * @route PUT /api/responsible-gaming/deposit-limits
 * @desc Update an existing deposit limit
 * @access Private (Player)
 */
const updateLimit = async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const input = {
            user_id: userId,
            limit_type: req.body.limit_type,
            new_amount: req.body.new_amount
        };
        const limit = await (0, deposit_limits_service_1.updateDepositLimit)(input);
        const isIncrease = limit.is_increase;
        const message = isIncrease
            ? `Limit increase will be effective on ${limit.pending_effective_date}`
            : `Limit decreased immediately to ${limit.amount}`;
        res.status(200).json({
            success: true,
            message,
            data: limit,
            info: {
                is_increase: isIncrease,
                immediate_effect: !isIncrease,
                effective_date: isIncrease ? limit.pending_effective_date : new Date()
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateLimit = updateLimit;
/**
 * @route GET /api/responsible-gaming/deposit-limits
 * @desc Get all deposit limits for the authenticated user
 * @access Private (Player)
 */
const getLimits = async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const limits = await (0, deposit_limits_service_1.getUserDepositLimits)(userId);
        res.status(200).json({
            success: true,
            data: limits,
            count: limits.length
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getLimits = getLimits;
/**
 * @route GET /api/responsible-gaming/deposit-limits/grouped
 * @desc Get deposit limits grouped by type (DAILY, WEEKLY, MONTHLY)
 * @access Private (Player)
 */
const getLimitsGrouped = async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const grouped = await (0, deposit_limits_service_1.getUserDepositLimitsGrouped)(userId);
        res.status(200).json({
            success: true,
            data: grouped
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getLimitsGrouped = getLimitsGrouped;
/**
 * @route POST /api/responsible-gaming/deposit-limits/check
 * @desc Check if a deposit amount is within limits
 * @access Private (Player)
 */
const checkLimit = async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const { amount, currency } = req.body;
        if (!amount || amount <= 0) {
            res.status(400).json({
                success: false,
                message: "Valid deposit amount required"
            });
            return;
        }
        const check = await (0, deposit_limits_service_1.checkDepositLimit)(userId, amount, currency || 'USD');
        res.status(200).json({
            success: true,
            data: check
        });
    }
    catch (error) {
        next(error);
    }
};
exports.checkLimit = checkLimit;
/**
 * @route DELETE /api/responsible-gaming/deposit-limits/:limitType
 * @desc Cancel/Delete a deposit limit
 * @access Private (Player)
 */
const deleteLimit = async (req, res, next) => {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const limitType = (_b = req.params.limitType) === null || _b === void 0 ? void 0 : _b.toUpperCase();
        if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(limitType)) {
            res.status(400).json({
                success: false,
                message: "Invalid limit type. Must be DAILY, WEEKLY, or MONTHLY"
            });
            return;
        }
        const deleted = await (0, deposit_limits_service_1.cancelDepositLimit)(userId, limitType);
        if (!deleted) {
            res.status(404).json({
                success: false,
                message: `No active ${limitType} limit found`
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: `${limitType} deposit limit cancelled successfully`
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteLimit = deleteLimit;
/**
 * @route GET /api/responsible-gaming/deposit-limits/history
 * @desc Get deposit limit change history
 * @access Private (Player)
 */
const getLimitHistory = async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const limit = parseInt(req.query.limit) || 50;
        const history = await (0, deposit_limits_service_1.getDepositLimitHistory)(userId, limit);
        res.status(200).json({
            success: true,
            data: history,
            count: history.length
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getLimitHistory = getLimitHistory;
