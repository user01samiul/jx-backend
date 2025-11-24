"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameCategoryFiltersSchema = exports.GameFiltersSchema = exports.CancelGameSchema = exports.PlayGameSchema = exports.ToggleGameFavoriteSchema = exports.RecordGamePlaySchema = exports.ProcessBetResultSchema = exports.PlaceBetSchema = void 0;
const zod_1 = require("zod");
// Schema for placing a bet
exports.PlaceBetSchema = zod_1.z.object({
    game_id: zod_1.z.number().positive("Game ID must be a positive number"),
    bet_amount: zod_1.z.number().positive("Bet amount must be positive"),
    game_data: zod_1.z.any().optional(), // Optional game-specific data
    user_id: zod_1.z.number().positive("User ID must be a positive number").optional(), // Optional user ID for admin operations
});
// Schema for processing bet result
exports.ProcessBetResultSchema = zod_1.z.object({
    bet_id: zod_1.z.number().positive("Bet ID must be a positive number"),
    outcome: zod_1.z.enum(['win', 'lose'], {
        errorMap: () => ({ message: "Outcome must be either 'win' or 'lose'" })
    }),
    win_amount: zod_1.z.number().min(0, "Win amount must be non-negative").optional(),
    game_result: zod_1.z.any().optional(), // Optional game result data
});
// Schema for recording game play
exports.RecordGamePlaySchema = zod_1.z.object({
    game_id: zod_1.z.number().positive("Game ID must be a positive number"),
    play_time_seconds: zod_1.z.number().min(0, "Play time must be non-negative").optional(),
});
// Schema for toggling game favorite
exports.ToggleGameFavoriteSchema = zod_1.z.object({
    game_id: zod_1.z.number().positive("Game ID must be a positive number"),
});
// Schema for playing a game
exports.PlayGameSchema = zod_1.z.object({
    game_id: zod_1.z.number().positive("Game ID must be a positive number"),
});
// Schema for canceling a game transaction
exports.CancelGameSchema = zod_1.z.object({
    transaction_id: zod_1.z.string().min(1, "Transaction ID is required"),
    game_id: zod_1.z.number().positive("Game ID must be a positive number").optional(),
    reason: zod_1.z.string().max(500, "Reason must be less than 500 characters").optional(),
});
// Schema for game filters (query parameters)
exports.GameFiltersSchema = zod_1.z.object({
    category: zod_1.z.string().optional(),
    provider: zod_1.z.string().optional(),
    is_featured: zod_1.z.string().transform(val => val === 'true').optional(),
    is_new: zod_1.z.string().transform(val => val === 'true').optional(),
    is_hot: zod_1.z.string().transform(val => val === 'true').optional(),
    search: zod_1.z.string().optional(),
    limit: zod_1.z.string().transform(val => parseInt(val)).optional(),
    offset: zod_1.z.string().transform(val => parseInt(val)).optional(),
    sortBy: zod_1.z.string().optional(),
    sortOrder: zod_1.z.string().optional(),
});
// Schema for game category filters (query parameters)
exports.GameCategoryFiltersSchema = zod_1.z.object({
    category: zod_1.z.string().optional(),
    limit: zod_1.z.string().transform(val => parseInt(val)).optional(),
});
