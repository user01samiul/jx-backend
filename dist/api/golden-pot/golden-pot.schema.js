"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LotteryQuerySchema = exports.BuyTicketSchema = exports.UpdateLotterySchema = exports.CreateLotterySchema = exports.LotteryStatusSchema = void 0;
const zod_1 = require("zod");
/**
 * Golden Pot Lottery Schemas
 *
 * Zod schemas for validation of lottery-related requests and responses.
 */
// Lottery status enum
exports.LotteryStatusSchema = zod_1.z.enum(['draft', 'active', 'completed', 'cancelled']);
// Create lottery schema
exports.CreateLotterySchema = zod_1.z.object({
    name: zod_1.z.string().min(3).max(100),
    description: zod_1.z.string().optional(),
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime(),
    prizePool: zod_1.z.number().positive(),
    ticketPrice: zod_1.z.number().positive(),
    maxTickets: zod_1.z.number().int().positive().optional(),
    status: exports.LotteryStatusSchema.optional().default('draft')
});
// Update lottery schema
exports.UpdateLotterySchema = zod_1.z.object({
    name: zod_1.z.string().min(3).max(100).optional(),
    description: zod_1.z.string().optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    prizePool: zod_1.z.number().positive().optional(),
    ticketPrice: zod_1.z.number().positive().optional(),
    maxTickets: zod_1.z.number().int().positive().optional(),
    status: exports.LotteryStatusSchema.optional()
});
// Buy ticket schema
exports.BuyTicketSchema = zod_1.z.object({
    lotteryId: zod_1.z.number().int().positive(),
    quantity: zod_1.z.number().int().positive().max(100).default(1)
});
// Lottery query parameters
exports.LotteryQuerySchema = zod_1.z.object({
    status: exports.LotteryStatusSchema.optional(),
    page: zod_1.z.number().int().positive().optional().default(1),
    limit: zod_1.z.number().int().positive().max(100).optional().default(20)
});
