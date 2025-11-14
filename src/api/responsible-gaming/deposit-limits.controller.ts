import { Request, Response, NextFunction } from "express";
import {
    createDepositLimit,
    updateDepositLimit,
    getUserDepositLimits,
    getUserDepositLimitsGrouped,
    checkDepositLimit,
    cancelDepositLimit,
    getDepositLimitHistory,
    CreateDepositLimitInput,
    UpdateDepositLimitInput
} from "../../services/responsible-gaming/deposit-limits.service";

/**
 * @route POST /api/responsible-gaming/deposit-limits
 * @desc Create a new deposit limit
 * @access Private (Player)
 */
export const createLimit = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = (req as any).user?.userId;

        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const input: CreateDepositLimitInput = {
            user_id: userId,
            limit_type: req.body.limit_type,
            amount: req.body.amount,
            currency: req.body.currency || 'USD'
        };

        const limit = await createDepositLimit(input);

        res.status(201).json({
            success: true,
            message: `${input.limit_type} deposit limit created successfully`,
            data: limit
        });
    } catch (error: any) {
        next(error);
    }
};

/**
 * @route PUT /api/responsible-gaming/deposit-limits
 * @desc Update an existing deposit limit
 * @access Private (Player)
 */
export const updateLimit = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = (req as any).user?.userId;

        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const input: UpdateDepositLimitInput = {
            user_id: userId,
            limit_type: req.body.limit_type,
            new_amount: req.body.new_amount
        };

        const limit = await updateDepositLimit(input);

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
    } catch (error: any) {
        next(error);
    }
};

/**
 * @route GET /api/responsible-gaming/deposit-limits
 * @desc Get all deposit limits for the authenticated user
 * @access Private (Player)
 */
export const getLimits = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = (req as any).user?.userId;

        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const limits = await getUserDepositLimits(userId);

        res.status(200).json({
            success: true,
            data: limits,
            count: limits.length
        });
    } catch (error: any) {
        next(error);
    }
};

/**
 * @route GET /api/responsible-gaming/deposit-limits/grouped
 * @desc Get deposit limits grouped by type (DAILY, WEEKLY, MONTHLY)
 * @access Private (Player)
 */
export const getLimitsGrouped = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = (req as any).user?.userId;

        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const grouped = await getUserDepositLimitsGrouped(userId);

        res.status(200).json({
            success: true,
            data: grouped
        });
    } catch (error: any) {
        next(error);
    }
};

/**
 * @route POST /api/responsible-gaming/deposit-limits/check
 * @desc Check if a deposit amount is within limits
 * @access Private (Player)
 */
export const checkLimit = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = (req as any).user?.userId;

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

        const check = await checkDepositLimit(userId, amount, currency || 'USD');

        res.status(200).json({
            success: true,
            data: check
        });
    } catch (error: any) {
        next(error);
    }
};

/**
 * @route DELETE /api/responsible-gaming/deposit-limits/:limitType
 * @desc Cancel/Delete a deposit limit
 * @access Private (Player)
 */
export const deleteLimit = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = (req as any).user?.userId;

        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const limitType = req.params.limitType?.toUpperCase();

        if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(limitType)) {
            res.status(400).json({
                success: false,
                message: "Invalid limit type. Must be DAILY, WEEKLY, or MONTHLY"
            });
            return;
        }

        const deleted = await cancelDepositLimit(userId, limitType as any);

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
    } catch (error: any) {
        next(error);
    }
};

/**
 * @route GET /api/responsible-gaming/deposit-limits/history
 * @desc Get deposit limit change history
 * @access Private (Player)
 */
export const getLimitHistory = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = (req as any).user?.userId;

        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const limit = parseInt(req.query.limit as string) || 50;
        const history = await getDepositLimitHistory(userId, limit);

        res.status(200).json({
            success: true,
            data: history,
            count: history.length
        });
    } catch (error: any) {
        next(error);
    }
};
