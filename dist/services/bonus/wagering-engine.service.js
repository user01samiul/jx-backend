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
     * Get game contribution percentage by game code
     * Priority: Game-specific > Category > Default hardcoded
     */
    static async getGameContribution(gameCode) {
        const client = await postgres_1.default.connect();
        try {
            // 1. Check for game-specific contribution (highest priority)
            let result = await client.query('SELECT * FROM game_contributions WHERE game_code = $1', [gameCode]);
            if (result.rows.length > 0) {
                const row = result.rows[0];
                return {
                    game_code: row.game_code,
                    game_category: row.game_category,
                    wagering_contribution_percentage: parseFloat(row.wagering_contribution_percentage),
                    is_restricted: row.is_restricted,
                    game_id: row.game_id
                };
            }
            // 2. No game-specific setting found - get game info to determine category
            const gameResult = await client.query('SELECT id, game_code, name, provider FROM games WHERE game_code = $1', [gameCode]);
            if (gameResult.rows.length === 0) {
                throw new apiError_1.ApiError('Game not found', 404);
            }
            const game = gameResult.rows[0];
            const category = this.determineGameCategory(game.name, game.provider);
            // 3. Check for category-level contribution (medium priority)
            const categoryResult = await client.query('SELECT * FROM game_category_contributions WHERE category = $1', [category]);
            let contribution_percentage;
            let is_restricted;
            if (categoryResult.rows.length > 0) {
                // Use category setting
                contribution_percentage = parseFloat(categoryResult.rows[0].wagering_contribution_percentage);
                is_restricted = categoryResult.rows[0].is_restricted;
            }
            else {
                // 4. Use default hardcoded setting (lowest priority)
                contribution_percentage = this.getDefaultContribution(category);
                is_restricted = false;
            }
            // Return the contribution info (don't auto-create game-specific record)
            return {
                game_code: gameCode,
                game_category: category,
                wagering_contribution_percentage: contribution_percentage,
                is_restricted: is_restricted,
                game_id: game.id
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Calculate wagering contribution for a bet
     */
    static async calculateWagerContribution(gameCode, betAmount) {
        const gameContribution = await this.getGameContribution(gameCode);
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
    static async processBetWagering(bonusInstanceId, playerId, gameCode, betAmount) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get wagering contribution
            const { contribution, category } = await this.calculateWagerContribution(gameCode, betAmount);
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
         ORDER BY wp.started_at DESC`, [playerId]);
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
                video_poker_contribution: parseFloat(row.video_poker_contribution) || 0,
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
            // First, verify the game exists and get its info
            const gameResult = await client.query('SELECT id, game_code, name, provider FROM games WHERE id = $1', [gameId]);
            if (gameResult.rows.length === 0) {
                throw new apiError_1.ApiError('Game not found', 404);
            }
            const game = gameResult.rows[0];
            const category = this.determineGameCategory(game.name, game.provider);
            // Upsert game contribution (use game_id for uniqueness)
            await client.query(`INSERT INTO game_contributions (
          game_id, game_code, game_category, wagering_contribution_percentage,
          is_restricted, game_name, provider, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        ON CONFLICT (game_id)
        DO UPDATE SET
          wagering_contribution_percentage = EXCLUDED.wagering_contribution_percentage,
          is_restricted = EXCLUDED.is_restricted,
          game_code = EXCLUDED.game_code,
          game_name = EXCLUDED.game_name,
          provider = EXCLUDED.provider,
          updated_at = NOW()`, [game.id, game.game_code, category, contributionPercentage, isRestricted, game.name, game.provider]);
        }
        finally {
            client.release();
        }
    }
    /**
     * Delete game contribution (admin function)
     */
    static async deleteGameContribution(gameId) {
        const client = await postgres_1.default.connect();
        try {
            const result = await client.query('DELETE FROM game_contributions WHERE game_id = $1', [gameId]);
            if (result.rowCount === 0) {
                throw new apiError_1.ApiError('Game contribution not found', 404);
            }
        }
        finally {
            client.release();
        }
    }
    /**
     * Get all game contributions with pagination (admin function)
     */
    static async getAllGameContributions(options = {}) {
        const client = await postgres_1.default.connect();
        try {
            const { search, limit = 50, offset = 0 } = options;
            let whereConditions = ['1=1'];
            let params = [];
            let paramIndex = 1;
            if (search) {
                whereConditions.push(`(
          gc.game_code ILIKE $${paramIndex} OR
          gc.game_name ILIKE $${paramIndex} OR
          gc.provider ILIKE $${paramIndex}
        )`);
                params.push(`%${search}%`);
                paramIndex++;
            }
            const whereClause = whereConditions.join(' AND ');
            // Get total count
            const countResult = await client.query(`SELECT COUNT(*) as total FROM game_contributions gc WHERE ${whereClause}`, params);
            const total = parseInt(countResult.rows[0].total);
            // Get contributions
            params.push(limit, offset);
            const result = await client.query(`SELECT
          gc.id,
          gc.game_id,
          gc.game_code,
          gc.game_category,
          gc.wagering_contribution_percentage,
          gc.is_restricted,
          gc.game_name,
          gc.provider,
          gc.created_at,
          gc.updated_at
         FROM game_contributions gc
         WHERE ${whereClause}
         ORDER BY gc.updated_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, params);
            const contributions = result.rows.map(row => ({
                id: row.id,
                game_id: row.game_id,
                game_code: row.game_code,
                game_category: row.game_category,
                wagering_contribution_percentage: parseFloat(row.wagering_contribution_percentage),
                is_restricted: row.is_restricted,
                game_name: row.game_name,
                provider: row.provider,
                created_at: row.created_at,
                updated_at: row.updated_at
            }));
            return {
                contributions,
                total
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Search games by ID, code, or name (for autocomplete)
     * Prioritizes exact matches over partial matches
     */
    static async searchGames(searchQuery, limit = 20) {
        const client = await postgres_1.default.connect();
        try {
            // Clean the search query - handle formatted strings like "26 - Wishing Well (Vimplay)"
            let cleanQuery = searchQuery.trim();
            // Extract game code from formatted string (e.g., "26 - Wishing Well (Vimplay)" -> "26")
            const formattedMatch = cleanQuery.match(/^(\S+)\s*-\s*(.+?)\s*\([^)]+\)$/);
            if (formattedMatch) {
                // Try game code first (more specific)
                cleanQuery = formattedMatch[1];
            }
            // Check if search query is a number (potential ID search)
            const isNumeric = /^\d+$/.test(cleanQuery);
            const numericId = isNumeric ? parseInt(cleanQuery) : null;
            let query;
            let params;
            if (isNumeric) {
                // Numeric search - prioritize exact ID match
                query = `
          SELECT id, game_code, name, provider
          FROM games
          WHERE
            id = $1
            OR game_code ILIKE $2
            OR name ILIKE $2
          ORDER BY
            CASE
              WHEN id = $1 THEN 0
              WHEN game_code = $4 THEN 1
              WHEN game_code ILIKE $3 THEN 2
              WHEN name ILIKE $3 THEN 3
              ELSE 4
            END,
            name
          LIMIT $5
        `;
                params = [numericId, `%${cleanQuery}%`, `${cleanQuery}%`, cleanQuery, limit];
            }
            else {
                // Text search - prioritize exact code match
                query = `
          SELECT id, game_code, name, provider
          FROM games
          WHERE
            game_code ILIKE $1
            OR name ILIKE $1
          ORDER BY
            CASE
              WHEN game_code = $3 THEN 1
              WHEN game_code ILIKE $2 THEN 2
              WHEN name ILIKE $2 THEN 3
              ELSE 4
            END,
            name
          LIMIT $4
        `;
                params = [`%${cleanQuery}%`, `${cleanQuery}%`, cleanQuery, limit];
            }
            const result = await client.query(query, params);
            return result.rows.map(row => ({
                id: row.id,
                game_code: row.game_code,
                name: row.name,
                provider: row.provider
            }));
        }
        finally {
            client.release();
        }
    }
    /**
     * Set category contribution (admin function)
     */
    static async setCategoryContribution(category, contributionPercentage, isRestricted = false) {
        const client = await postgres_1.default.connect();
        try {
            await client.query(`INSERT INTO game_category_contributions (
          category, wagering_contribution_percentage, is_restricted, created_at, updated_at
        )
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (category)
        DO UPDATE SET
          wagering_contribution_percentage = EXCLUDED.wagering_contribution_percentage,
          is_restricted = EXCLUDED.is_restricted,
          updated_at = NOW()`, [category, contributionPercentage, isRestricted]);
        }
        finally {
            client.release();
        }
    }
    /**
     * Delete category contribution (admin function)
     */
    static async deleteCategoryContribution(category) {
        const client = await postgres_1.default.connect();
        try {
            const result = await client.query('DELETE FROM game_category_contributions WHERE category = $1', [category]);
            if (result.rowCount === 0) {
                throw new apiError_1.ApiError('Category contribution not found', 404);
            }
        }
        finally {
            client.release();
        }
    }
    /**
     * Get all category contributions (admin function)
     */
    static async getAllCategoryContributions() {
        const client = await postgres_1.default.connect();
        try {
            const result = await client.query(`SELECT
          id,
          category,
          wagering_contribution_percentage,
          is_restricted,
          created_at,
          updated_at
         FROM game_category_contributions
         ORDER BY category ASC`);
            return result.rows.map(row => ({
                id: row.id,
                category: row.category,
                wagering_contribution_percentage: parseFloat(row.wagering_contribution_percentage),
                is_restricted: row.is_restricted,
                created_at: row.created_at,
                updated_at: row.updated_at
            }));
        }
        finally {
            client.release();
        }
    }
    /**
     * Get available game categories from database
     */
    static async getAvailableCategories() {
        const client = await postgres_1.default.connect();
        try {
            // Get all unique categories from games (based on our categorization logic)
            const result = await client.query(`SELECT
          CASE
            WHEN LOWER(name) LIKE '%live%' OR LOWER(name) LIKE '%dealer%' THEN 'live_casino'
            WHEN LOWER(name) LIKE '%blackjack%' OR LOWER(name) LIKE '%roulette%'
              OR LOWER(name) LIKE '%baccarat%' OR LOWER(name) LIKE '%poker%' THEN 'table_games'
            WHEN LOWER(name) LIKE '%video poker%' THEN 'video_poker'
            ELSE 'slots'
          END as category,
          COUNT(*) as game_count
         FROM games
         GROUP BY
           CASE
             WHEN LOWER(name) LIKE '%live%' OR LOWER(name) LIKE '%dealer%' THEN 'live_casino'
             WHEN LOWER(name) LIKE '%blackjack%' OR LOWER(name) LIKE '%roulette%'
               OR LOWER(name) LIKE '%baccarat%' OR LOWER(name) LIKE '%poker%' THEN 'table_games'
             WHEN LOWER(name) LIKE '%video poker%' THEN 'video_poker'
             ELSE 'slots'
           END
         ORDER BY category ASC`);
            return result.rows.map(row => ({
                category: row.category,
                game_count: parseInt(row.game_count)
            }));
        }
        finally {
            client.release();
        }
    }
}
exports.WageringEngineService = WageringEngineService;
