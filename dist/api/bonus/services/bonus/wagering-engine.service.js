"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WageringEngineService = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
const apiError_1 = require("../../utils/apiError");
const bonus_wallet_service_1 = require("./bonus-wallet.service");
class WageringEngineService {
    /**
     * Get game contribution percentage
     */
    static async getGameContribution(gameId) {
        const client = await postgres_1.default.connect();
        try {
            let result = await client.query('SELECT * FROM game_contributions WHERE game_id = $1', [gameId]);
            if (result.rows.length === 0) {
                // Get game info to determine default contribution
                const gameResult = await client.query('SELECT id, name, provider FROM games WHERE id = $1', [gameId]);
                if (gameResult.rows.length === 0) {
                    throw new apiError_1.ApiError('Game not found', 404);
                }
                const game = gameResult.rows[0];
                const category = this.determineGameCategory(game.name, game.provider);
                const defaultContribution = this.getDefaultContribution(category);
                // Create default contribution
                await client.query(`INSERT INTO game_contributions (
            game_id, game_category, wagering_contribution_percentage,
            is_restricted, game_name, provider
          ) VALUES ($1, $2, $3, $4, $5, $6)`, [gameId, category, defaultContribution, false, game.name, game.provider]);
                result = await client.query('SELECT * FROM game_contributions WHERE game_id = $1', [gameId]);
            }
            const row = result.rows[0];
            return {
                game_id: row.game_id,
                game_category: row.game_category,
                wagering_contribution_percentage: parseFloat(row.wagering_contribution_percentage),
                is_restricted: row.is_restricted
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Calculate wagering contribution for a bet
     */
    static async calculateWagerContribution(gameId, betAmount) {
        const gameContribution = await this.getGameContribution(gameId);
        if (gameContribution.is_restricted) {
            return { contribution: 0, category: gameContribution.game_category };
        }
        const contribution = betAmount * (gameContribution.wagering_contribution_percentage / 100);
        return {
            contribution,
            category: gameContribution.game_category
        };
    }
    /**
     * Process bet with wagering tracking
     */
    static async processBetWagering(bonusInstanceId, playerId, gameId, betAmount) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get wagering contribution
            const { contribution, category } = await this.calculateWagerContribution(gameId, betAmount);
            if (contribution === 0) {
                await client.query('COMMIT');
                return {
                    wagerContribution: 0,
                    isCompleted: false,
                    progressPercentage: 0
                };
            }
            // Get current progress
            const progressResult = await client.query('SELECT * FROM bonus_wager_progress WHERE bonus_instance_id = $1', [bonusInstanceId]);
            if (progressResult.rows.length === 0) {
                throw new apiError_1.ApiError('Wager progress not found', 404);
            }
            const progress = progressResult.rows[0];
            const newWagerAmount = parseFloat(progress.current_wager_amount) + contribution;
            const requiredAmount = parseFloat(progress.required_wager_amount);
            const remainingAmount = Math.max(0, requiredAmount - newWagerAmount);
            const completionPercentage = Math.min(100, (newWagerAmount / requiredAmount) * 100);
            // Update category contribution
            const categoryField = `${category}_contribution`;
            await client.query(`UPDATE bonus_wager_progress
         SET current_wager_amount = current_wager_amount + $1,
             remaining_wager_amount = $2,
             completion_percentage = $3,
             ${categoryField} = ${categoryField} + $1,
             total_bets_count = total_bets_count + 1,
             last_bet_at = NOW(),
             updated_at = NOW()
         WHERE bonus_instance_id = $4`, [contribution, remainingAmount, completionPercentage, bonusInstanceId]);
            // Update bonus instance
            await client.query(`UPDATE bonus_instances
         SET wager_progress_amount = wager_progress_amount + $1,
             wager_percentage_complete = $2,
             total_bets_count = total_bets_count + 1,
             status = CASE
               WHEN wager_progress_amount + $1 >= wager_requirement_amount THEN 'completed'
               ELSE status
             END,
             updated_at = NOW()
         WHERE id = $3`, [contribution, completionPercentage, bonusInstanceId]);
            // Check if wagering is completed
            const isCompleted = newWagerAmount >= requiredAmount;
            if (isCompleted) {
                await this.completeWagering(bonusInstanceId, playerId, client);
            }
            await client.query('COMMIT');
            return {
                wagerContribution: contribution,
                isCompleted,
                progressPercentage: completionPercentage
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Complete wagering and release funds
     */
    static async completeWagering(bonusInstanceId, playerId, client) {
        // Get bonus instance
        const instanceResult = await client.query('SELECT * FROM bonus_instances WHERE id = $1', [bonusInstanceId]);
        if (instanceResult.rows.length === 0) {
            throw new apiError_1.ApiError('Bonus instance not found', 404);
        }
        const instance = instanceResult.rows[0];
        const remainingBonus = parseFloat(instance.remaining_bonus);
        // Get bonus plan to check max release
        const planResult = await client.query('SELECT bonus_max_release FROM bonus_plans WHERE id = $1', [instance.bonus_plan_id]);
        let releaseAmount = remainingBonus;
        if (planResult.rows[0].bonus_max_release) {
            const maxRelease = parseFloat(planResult.rows[0].bonus_max_release);
            releaseAmount = Math.min(remainingBonus, maxRelease);
        }
        // Update bonus instance status
        await client.query(`UPDATE bonus_instances
       SET status = 'completed',
           completed_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`, [bonusInstanceId]);
        // Mark wager progress as completed
        await client.query(`UPDATE bonus_wager_progress
       SET completed_at = NOW(),
           updated_at = NOW()
       WHERE bonus_instance_id = $1`, [bonusInstanceId]);
        // Release funds to main wallet
        await bonus_wallet_service_1.BonusWalletService.releaseToMainWallet(playerId, releaseAmount);
        // Create transaction record
        const { BonusTransactionService } = require('./bonus-transaction.service');
        await BonusTransactionService.createTransaction({
            bonus_instance_id: bonusInstanceId,
            player_id: playerId,
            transaction_type: 'released',
            amount: releaseAmount,
            description: 'Wagering requirement completed - bonus released to main wallet'
        }, client);
    }
    /**
     * Get wagering progress for a bonus instance
     */
    static async getProgress(bonusInstanceId) {
        const client = await postgres_1.default.connect();
        try {
            const result = await client.query('SELECT * FROM bonus_wager_progress WHERE bonus_instance_id = $1', [bonusInstanceId]);
            if (result.rows.length === 0) {
                return null;
            }
            const row = result.rows[0];
            return {
                bonus_instance_id: row.bonus_instance_id,
                player_id: row.player_id,
                required_wager_amount: parseFloat(row.required_wager_amount),
                current_wager_amount: parseFloat(row.current_wager_amount),
                remaining_wager_amount: parseFloat(row.remaining_wager_amount),
                completion_percentage: parseFloat(row.completion_percentage),
                slots_contribution: parseFloat(row.slots_contribution) || 0,
                table_games_contribution: parseFloat(row.table_games_contribution) || 0,
                live_casino_contribution: parseFloat(row.live_casino_contribution) || 0,
                other_games_contribution: parseFloat(row.other_games_contribution) || 0,
                total_bets_count: parseInt(row.total_bets_count) || 0,
                last_bet_at: row.last_bet_at
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Get all active wagering progress for a player
     */
    static async getPlayerActiveProgress(playerId) {
        const client = await postgres_1.default.connect();
        try {
            const result = await client.query(`SELECT wp.* FROM bonus_wager_progress wp
         INNER JOIN bonus_instances bi ON wp.bonus_instance_id = bi.id
         WHERE wp.player_id = $1
         AND bi.status IN ('active', 'wagering')
         AND wp.completed_at IS NULL
         ORDER BY wp.created_at DESC`, [playerId]);
            return result.rows.map(row => ({
                bonus_instance_id: row.bonus_instance_id,
                player_id: row.player_id,
                required_wager_amount: parseFloat(row.required_wager_amount),
                current_wager_amount: parseFloat(row.current_wager_amount),
                remaining_wager_amount: parseFloat(row.remaining_wager_amount),
                completion_percentage: parseFloat(row.completion_percentage),
                slots_contribution: parseFloat(row.slots_contribution) || 0,
                table_games_contribution: parseFloat(row.table_games_contribution) || 0,
                live_casino_contribution: parseFloat(row.live_casino_contribution) || 0,
                other_games_contribution: parseFloat(row.other_games_contribution) || 0,
                total_bets_count: parseInt(row.total_bets_count) || 0,
                last_bet_at: row.last_bet_at
            }));
        }
        finally {
            client.release();
        }
    }
    /**
     * Determine game category from name and provider
     */
    static determineGameCategory(gameName, provider) {
        const lowerName = gameName.toLowerCase();
        if (lowerName.includes('live') || lowerName.includes('dealer')) {
            return 'live_casino';
        }
        if (lowerName.includes('blackjack') ||
            lowerName.includes('roulette') ||
            lowerName.includes('baccarat') ||
            lowerName.includes('poker')) {
            return 'table_games';
        }
        if (lowerName.includes('video poker')) {
            return 'video_poker';
        }
        // Default to slots
        return 'slots';
    }
    /**
     * Get default contribution percentage for category
     */
    static getDefaultContribution(category) {
        const defaults = {
            slots: 100,
            video_poker: 50,
            table_games: 10,
            live_casino: 10,
            other: 50
        };
        return defaults[category] || 100;
    }
    /**
     * Set game contribution (admin function)
     */
    static async setGameContribution(gameId, contributionPercentage, isRestricted = false) {
        const client = await postgres_1.default.connect();
        try {
            await client.query(`INSERT INTO game_contributions (
          game_id, game_category, wagering_contribution_percentage, is_restricted
        )
        SELECT $1, 'slots', $2, $3
        WHERE EXISTS (SELECT 1 FROM games WHERE id = $1)
        ON CONFLICT (game_id)
        DO UPDATE SET
          wagering_contribution_percentage = $2,
          is_restricted = $3,
          updated_at = NOW()`, [gameId, contributionPercentage, isRestricted]);
        }
        finally {
            client.release();
        }
    }
}
exports.WageringEngineService = WageringEngineService;
