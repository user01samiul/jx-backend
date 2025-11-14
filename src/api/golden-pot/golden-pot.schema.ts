import { z } from 'zod';

/**
 * Golden Pot Lottery Schemas
 *
 * Zod schemas for validation of lottery-related requests and responses.
 */

// Lottery status enum
export const LotteryStatusSchema = z.enum(['draft', 'active', 'completed', 'cancelled']);

// Create lottery schema
export const CreateLotterySchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  prizePool: z.number().positive(),
  ticketPrice: z.number().positive(),
  maxTickets: z.number().int().positive().optional(),
  status: LotteryStatusSchema.optional().default('draft')
});

// Update lottery schema
export const UpdateLotterySchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  prizePool: z.number().positive().optional(),
  ticketPrice: z.number().positive().optional(),
  maxTickets: z.number().int().positive().optional(),
  status: LotteryStatusSchema.optional()
});

// Buy ticket schema
export const BuyTicketSchema = z.object({
  lotteryId: z.number().int().positive(),
  quantity: z.number().int().positive().max(100).default(1)
});

// Lottery query parameters
export const LotteryQuerySchema = z.object({
  status: LotteryStatusSchema.optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20)
});

export type CreateLotteryInput = z.infer<typeof CreateLotterySchema>;
export type UpdateLotteryInput = z.infer<typeof UpdateLotterySchema>;
export type BuyTicketInput = z.infer<typeof BuyTicketSchema>;
export type LotteryQueryInput = z.infer<typeof LotteryQuerySchema>;
