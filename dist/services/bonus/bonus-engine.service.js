"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BonusEngineService = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
const apiError_1 = require("../../utils/apiError");
const bonus_wallet_service_1 = require("./bonus-wallet.service");
const bonus_instance_service_1 = require("./bonus-instance.service");
const wagering_engine_service_1 = require("./wagering-engine.service");
const bonus_transaction_service_1 = require("./bonus-transaction.service");
/**
 * Main Bonus Engine - orchestrates all bonus operations
 * Integrates with bet/win flow for dual wallet management
 */
class BonusEngineService {
    /**
     * Process a bet - handle dual wallet logic and wagering tracking
     * CRITICAL: Main wallet is used first, then bonus wallet
     */
    static async processBet(playerId, betAmount, gameId, betId) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            let remainingBetAmount = betAmount;
            const bonusInstancesUsed = [];
            // Step 1: Get main wallet balance (from user balance system)
            const userBalanceResult = await client.query('SELECT SUM(amount) as balance FROM transactions WHERE user_id = $1 AND status = $2', [playerId, 'completed']);
            const mainWalletBalance = parseFloat(userBalanceResult.rows[0]?.balance || '0');
            // Step 2: Deduct from main wallet first
            let usedMainWallet = 0;
            if (mainWalletBalance > 0) {
                usedMainWallet = Math.min(mainWalletBalance, remainingBetAmount);
                remainingBetAmount -= usedMainWallet;
                console.log(`[BONUS_ENGINE] Used ${usedMainWallet} from main wallet, remaining: ${remainingBetAmount}`);
            }
            // Step 3: If needed, use bonus wallet
            let usedBonusWallet = 0;
            if (remainingBetAmount > 0) {
                const bonusWallet = await bonus_wallet_service_1.BonusWalletService.getBalance(playerId);
                if (bonusWallet.playable_bonus_balance < remainingBetAmount) {
                    await client.query('ROLLBACK');
                    throw new apiError_1.ApiError('Insufficient balance (main + bonus)', 400);
                }
                // Get active bonuses to track which ones were used
                const activeBonuses = await bonus_instance_service_1.BonusInstanceService.getPlayerActiveBonuses(playerId);
                if (activeBonuses.length === 0) {
                    await client.query('ROLLBACK');
                    throw new apiError_1.ApiError('No active bonus found', 400);
                }
                // Check if bonus is playable (is_playable flag)
                const bonus = activeBonuses[0];
                const bonusPlanResult = await client.query('SELECT is_playable FROM bonus_plans WHERE id = $1', [bonus.bonus_plan_id]);
                if (bonusPlanResult.rows.length === 0 || !bonusPlanResult.rows[0].is_playable) {
                    await client.query('ROLLBACK');
                    throw new apiError_1.ApiError('This bonus cannot be used for betting. Please use your main wallet balance.', 400);
                }
                usedBonusWallet = remainingBetAmount;
                // Deduct from bonus wallet
                await bonus_wallet_service_1.BonusWalletService.deductBonus(playerId, usedBonusWallet);
                // Track wagering for each active bonus
                for (const bonus of activeBonuses) {
                    if (bonus.status === 'active' || bonus.status === 'wagering') {
                        // Update bonus instance status to wagering if not already
                        if (bonus.status === 'active') {
                            await client.query(`UPDATE bonus_instances
                 SET status = 'wagering',
                     activated_at = NOW(),
                     updated_at = NOW()
                 WHERE id = $1`, [bonus.id]);
                        }
                        // Update remaining bonus
                        await client.query(`UPDATE bonus_instances
               SET remaining_bonus = remaining_bonus - $1,
                   updated_at = NOW()
               WHERE id = $2`, [usedBonusWallet, bonus.id]);
                        // Get game_code from game_id
                        const gameResult = await client.query('SELECT game_code FROM games WHERE id = $1', [gameId]);
                        if (gameResult.rows.length === 0) {
                            throw new apiError_1.ApiError('Game not found', 404);
                        }
                        const gameCode = gameResult.rows[0].game_code;
                        // Track wagering progress
                        const wagerResult = await wagering_engine_service_1.WageringEngineService.processBetWagering(bonus.id, playerId, gameCode, usedBonusWallet);
                        bonusInstancesUsed.push({
                            instanceId: bonus.id,
                            amount: usedBonusWallet,
                            wagerContribution: wagerResult.wagerContribution
                        });
                        // Create transaction
                        await bonus_transaction_service_1.BonusTransactionService.createTransaction({
                            bonus_instance_id: bonus.id,
                            player_id: playerId,
                            transaction_type: 'bet_placed',
                            amount: usedBonusWallet,
                            game_id: gameId,
                            bet_id: betId,
                            wager_contribution: wagerResult.wagerContribution,
                            description: `Bet placed with bonus wallet`
                        }, client);
                        // Usually only use one bonus at a time
                        break;
                    }
                }
                console.log(`[BONUS_ENGINE] Used ${usedBonusWallet} from bonus wallet`);
            }
            await client.query('COMMIT');
            return {
                usedMainWallet,
                usedBonusWallet,
                bonusInstancesUsed
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
     * Process a win - add winnings to appropriate wallet
     */
    static async processWin(playerId, winAmount, gameId, betId, betUsedBonus) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // If bet was placed with bonus money, winnings go to bonus wallet
            if (betUsedBonus) {
                await bonus_wallet_service_1.BonusWalletService.addWinnings(playerId, winAmount);
                // Find active bonus and update
                const activeBonuses = await bonus_instance_service_1.BonusInstanceService.getPlayerActiveBonuses(playerId);
                if (activeBonuses.length > 0) {
                    const bonus = activeBonuses[0];
                    await client.query(`UPDATE bonus_instances
             SET remaining_bonus = remaining_bonus + $1,
                 total_wins_amount = total_wins_amount + $1,
                 updated_at = NOW()
             WHERE id = $2`, [winAmount, bonus.id]);
                    // Create transaction
                    await bonus_transaction_service_1.BonusTransactionService.createTransaction({
                        bonus_instance_id: bonus.id,
                        player_id: playerId,
                        transaction_type: 'bet_won',
                        amount: winAmount,
                        game_id: gameId,
                        bet_id: betId,
                        description: `Bet won - winnings added to bonus wallet`
                    }, client);
                }
                await client.query('COMMIT');
                return { walletType: 'bonus' };
            }
            else {
                // Winnings go to main wallet (handled by existing balance service)
                await client.query('COMMIT');
                return { walletType: 'main' };
            }
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
     * Get combined balance (main + bonus) for display
     * IMPORTANT: totalAvailable shows ONLY main wallet balance
     * Bonus wallet is tracked separately
     */
    static async getCombinedBalance(playerId) {
        const client = await postgres_1.default.connect();
        try {
            // Get main wallet balance from user_balances table (existing balance system)
            const mainResult = await client.query(`SELECT COALESCE(balance, 0) as balance
         FROM user_balances
         WHERE user_id = $1
         LIMIT 1`, [playerId]);
            const mainWallet = parseFloat(mainResult.rows[0]?.balance || '0');
            // Get bonus wallet
            const bonusWallet = await bonus_wallet_service_1.BonusWalletService.getBalance(playerId);
            return {
                mainWallet,
                bonusWallet: bonusWallet.playable_bonus_balance,
                totalAvailable: mainWallet, // FIXED: Show only main wallet from user_balances, not calculated
                activeBonusCount: bonusWallet.active_bonus_count
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Handle deposit and auto-grant bonuses
     */
    static async handleDeposit(playerId, depositAmount, depositTransactionId, paymentMethodId) {
        try {
            // Auto-grant eligible deposit bonuses
            const grantedBonuses = await bonus_instance_service_1.BonusInstanceService.grantDepositBonus(playerId, depositAmount, depositTransactionId, paymentMethodId);
            if (grantedBonuses.length > 0) {
                console.log(`[BONUS_ENGINE] Granted ${grantedBonuses.length} bonus(es) for deposit of ${depositAmount}`);
            }
        }
        catch (error) {
            console.error('[BONUS_ENGINE] Error granting deposit bonus:', error);
            // Don't fail the deposit if bonus grant fails
        }
    }
    /**
     * Handle withdrawal and cancel bonuses if needed
     */
    static async handleWithdrawal(playerId) {
        try {
            await bonus_instance_service_1.BonusInstanceService.cancelBonusesOnWithdrawal(playerId);
            console.log(`[BONUS_ENGINE] Cancelled bonuses for withdrawal by player ${playerId}`);
        }
        catch (error) {
            console.error('[BONUS_ENGINE] Error cancelling bonuses on withdrawal:', error);
            throw error; // Withdrawal should fail if we can't cancel bonuses
        }
    }
    /**
     * Expire old bonuses (run as cron job)
     */
    static async expireBonuses() {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Find expired bonuses
            const expiredResult = await client.query(`SELECT * FROM bonus_instances
         WHERE status IN ('active', 'wagering')
         AND expires_at < NOW()`);
            let expiredCount = 0;
            for (const bonus of expiredResult.rows) {
                const remainingBonus = parseFloat(bonus.remaining_bonus);
                // Update status
                await client.query(`UPDATE bonus_instances
           SET status = 'expired',
               updated_at = NOW()
           WHERE id = $1`, [bonus.id]);
                // Forfeit from wallet
                await bonus_wallet_service_1.BonusWalletService.forfeitBonus(bonus.player_id, remainingBonus);
                // Create transaction
                await bonus_transaction_service_1.BonusTransactionService.createTransaction({
                    bonus_instance_id: bonus.id,
                    player_id: bonus.player_id,
                    transaction_type: 'expired',
                    amount: remainingBonus,
                    description: 'Bonus expired - time limit reached'
                }, client);
                expiredCount++;
            }
            await client.query('COMMIT');
            console.log(`[BONUS_ENGINE] Expired ${expiredCount} bonuses`);
            return expiredCount;
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
     * Get bonus system statistics (admin dashboard)
     */
    static async getStatistics() {
        const client = await postgres_1.default.connect();
        try {
            const statsResult = await client.query(`
        SELECT
          COUNT(DISTINCT CASE WHEN status IN ('active', 'wagering') THEN id END) as active_bonuses,
          COUNT(DISTINCT CASE WHEN status IN ('active', 'wagering') THEN player_id END) as players_with_bonus,
          COALESCE(SUM(CASE WHEN status IN ('active', 'wagering') THEN remaining_bonus ELSE 0 END), 0) as total_bonus_value,
          COALESCE(SUM(CASE WHEN status IN ('active', 'wagering') THEN wager_progress_amount ELSE 0 END), 0) as total_wagering,
          COALESCE(AVG(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) * 100 as completion_rate
        FROM bonus_instances
      `);
            const stats = statsResult.rows[0];
            return {
                totalActiveBonuses: parseInt(stats.active_bonuses) || 0,
                totalPlayersWithBonus: parseInt(stats.players_with_bonus) || 0,
                totalBonusValue: parseFloat(stats.total_bonus_value) || 0,
                totalWageringProgress: parseFloat(stats.total_wagering) || 0,
                completionRate: parseFloat(stats.completion_rate) || 0
            };
        }
        finally {
            client.release();
        }
    }
}
exports.BonusEngineService = BonusEngineService;
