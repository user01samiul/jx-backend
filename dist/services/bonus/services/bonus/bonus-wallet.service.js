"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BonusWalletService = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
const apiError_1 = require("../../utils/apiError");
class BonusWalletService {
    /**
     * Get or create bonus wallet for player
     */
    static async getOrCreateWallet(playerId, currency = 'NGN') {
        const client = await postgres_1.default.connect();
        try {
            // Try to get existing wallet
            let result = await client.query('SELECT * FROM bonus_wallets WHERE player_id = $1', [playerId]);
            if (result.rows.length === 0) {
                // Create new wallet
                result = await client.query(`INSERT INTO bonus_wallets (player_id, currency)
           VALUES ($1, $2)
           RETURNING *`, [playerId, currency]);
            }
            // Calculate releasable amount
            const releasableResult = await client.query(`SELECT COALESCE(SUM(remaining_bonus), 0) as releasable_amount
         FROM bonus_instances
         WHERE player_id = $1
         AND status = 'completed'
         AND remaining_bonus > 0`, [playerId]);
            const releasableAmount = parseFloat(releasableResult.rows[0]?.releasable_amount || '0');
            return this.formatWallet(result.rows[0], releasableAmount);
        }
        finally {
            client.release();
        }
    }
    /**
     * Get bonus wallet balance
     */
    static async getBalance(playerId) {
        const client = await postgres_1.default.connect();
        try {
            const result = await client.query('SELECT * FROM bonus_wallets WHERE player_id = $1', [playerId]);
            if (result.rows.length === 0) {
                // Return empty wallet if doesn't exist
                return {
                    player_id: playerId,
                    total_bonus_balance: 0,
                    locked_bonus_balance: 0,
                    playable_bonus_balance: 0,
                    releasable_amount: 0,
                    total_bonus_received: 0,
                    total_bonus_wagered: 0,
                    total_bonus_released: 0,
                    total_bonus_forfeited: 0,
                    total_bonus_transferred: 0,
                    active_bonus_count: 0,
                    currency: 'NGN'
                };
            }
            // Calculate releasable amount (from completed bonuses that haven't been transferred yet)
            const releasableResult = await client.query(`SELECT COALESCE(SUM(remaining_bonus), 0) as releasable_amount
         FROM bonus_instances
         WHERE player_id = $1
         AND status = 'completed'
         AND remaining_bonus > 0`, [playerId]);
            const releasableAmount = parseFloat(releasableResult.rows[0]?.releasable_amount || '0');
            return this.formatWallet(result.rows[0], releasableAmount);
        }
        finally {
            client.release();
        }
    }
    /**
     * Add bonus to wallet
     */
    static async addBonus(playerId, amount, isLocked = false) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Ensure wallet exists
            await this.getOrCreateWallet(playerId);
            // Update balances
            if (isLocked) {
                await client.query(`UPDATE bonus_wallets
           SET total_bonus_balance = total_bonus_balance + $1,
               locked_bonus_balance = locked_bonus_balance + $1,
               total_bonus_received = total_bonus_received + $1,
               active_bonus_count = active_bonus_count + 1,
               updated_at = NOW()
           WHERE player_id = $2`, [amount, playerId]);
            }
            else {
                await client.query(`UPDATE bonus_wallets
           SET total_bonus_balance = total_bonus_balance + $1,
               playable_bonus_balance = playable_bonus_balance + $1,
               total_bonus_received = total_bonus_received + $1,
               active_bonus_count = active_bonus_count + 1,
               updated_at = NOW()
           WHERE player_id = $2`, [amount, playerId]);
            }
            await client.query('COMMIT');
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
     * Deduct from bonus wallet (for bets)
     */
    static async deductBonus(playerId, amount) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            const wallet = await this.getBalance(playerId);
            if (wallet.playable_bonus_balance < amount) {
                throw new apiError_1.ApiError('Insufficient bonus balance', 400);
            }
            await client.query(`UPDATE bonus_wallets
         SET total_bonus_balance = total_bonus_balance - $1,
             playable_bonus_balance = playable_bonus_balance - $1,
             total_bonus_wagered = total_bonus_wagered + $1,
             updated_at = NOW()
         WHERE player_id = $2`, [amount, playerId]);
            await client.query('COMMIT');
            return amount;
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
     * Add winnings to bonus wallet
     */
    static async addWinnings(playerId, amount) {
        const client = await postgres_1.default.connect();
        try {
            await client.query(`UPDATE bonus_wallets
         SET total_bonus_balance = total_bonus_balance + $1,
             playable_bonus_balance = playable_bonus_balance + $1,
             updated_at = NOW()
         WHERE player_id = $2`, [amount, playerId]);
        }
        finally {
            client.release();
        }
    }
    /**
     * Release bonus to main wallet (when wagering complete)
     */
    static async releaseToMainWallet(playerId, amount) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Deduct from bonus wallet
            await client.query(`UPDATE bonus_wallets
         SET total_bonus_balance = total_bonus_balance - $1,
             playable_bonus_balance = playable_bonus_balance - $1,
             locked_bonus_balance = CASE
               WHEN locked_bonus_balance >= $1 THEN locked_bonus_balance - $1
               ELSE 0
             END,
             total_bonus_released = total_bonus_released + $1,
             active_bonus_count = CASE
               WHEN active_bonus_count > 0 THEN active_bonus_count - 1
               ELSE 0
             END,
             updated_at = NOW()
         WHERE player_id = $2`, [amount, playerId]);
            // Add to main wallet via transaction
            await client.query(`INSERT INTO transactions (
          user_id, type, amount, status, description,
          external_reference, metadata, created_at
        ) VALUES ($1, 'bonus', $2, 'completed', $3, $4, $5, NOW())`, [
                playerId,
                amount,
                'Bonus wagering completed - funds released',
                `bonus_release_${Date.now()}`,
                JSON.stringify({ source: 'bonus_release' })
            ]);
            await client.query('COMMIT');
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
     * Forfeit bonus (on withdrawal or rule violation)
     */
    static async forfeitBonus(playerId, amount) {
        const client = await postgres_1.default.connect();
        try {
            await client.query(`UPDATE bonus_wallets
         SET total_bonus_balance = total_bonus_balance - $1,
             playable_bonus_balance = CASE
               WHEN playable_bonus_balance >= $1 THEN playable_bonus_balance - $1
               ELSE 0
             END,
             locked_bonus_balance = CASE
               WHEN locked_bonus_balance >= $1 THEN locked_bonus_balance - $1
               ELSE 0
             END,
             total_bonus_forfeited = total_bonus_forfeited + $1,
             active_bonus_count = CASE
               WHEN active_bonus_count > 0 THEN active_bonus_count - 1
               ELSE 0
             END,
             updated_at = NOW()
         WHERE player_id = $2`, [amount, playerId]);
        }
        finally {
            client.release();
        }
    }
    /**
     * Move from locked to playable (when bonus activated)
     */
    static async unlockBonus(playerId, amount) {
        const client = await postgres_1.default.connect();
        try {
            await client.query(`UPDATE bonus_wallets
         SET locked_bonus_balance = locked_bonus_balance - $1,
             playable_bonus_balance = playable_bonus_balance + $1,
             updated_at = NOW()
         WHERE player_id = $2
         AND locked_bonus_balance >= $1`, [amount, playerId]);
        }
        finally {
            client.release();
        }
    }
    /**
     * Transfer bonus funds to main wallet (for completed bonuses)
     */
    static async transferToMainWallet(playerId, amount) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get releasable amount (completed bonuses with remaining funds)
            const releasableResult = await client.query(`SELECT COALESCE(SUM(remaining_bonus), 0) as releasable_amount
         FROM bonus_instances
         WHERE player_id = $1
         AND status = 'completed'
         AND remaining_bonus > 0`, [playerId]);
            const releasableAmount = parseFloat(releasableResult.rows[0]?.releasable_amount || '0');
            if (releasableAmount <= 0) {
                await client.query('ROLLBACK');
                throw new apiError_1.ApiError('No releasable bonus funds available', 400);
            }
            // Use provided amount or all releasable
            const transferAmount = amount && amount <= releasableAmount ? amount : releasableAmount;
            if (transferAmount <= 0) {
                await client.query('ROLLBACK');
                throw new apiError_1.ApiError('Invalid transfer amount', 400);
            }
            // Get completed bonuses with remaining funds
            const bonusesResult = await client.query(`SELECT id, remaining_bonus
         FROM bonus_instances
         WHERE player_id = $1
         AND status = 'completed'
         AND remaining_bonus > 0
         ORDER BY completed_at ASC`, [playerId]);
            let remainingToTransfer = transferAmount;
            // Transfer from each completed bonus
            for (const bonus of bonusesResult.rows) {
                if (remainingToTransfer <= 0)
                    break;
                const bonusRemaining = parseFloat(bonus.remaining_bonus);
                const toTransferFromBonus = Math.min(bonusRemaining, remainingToTransfer);
                // Update bonus instance
                await client.query(`UPDATE bonus_instances
           SET remaining_bonus = remaining_bonus - $1,
               updated_at = NOW()
           WHERE id = $2`, [toTransferFromBonus, bonus.id]);
                remainingToTransfer -= toTransferFromBonus;
            }
            // Update bonus wallet
            await client.query(`UPDATE bonus_wallets
         SET total_bonus_balance = total_bonus_balance - $1,
             playable_bonus_balance = playable_bonus_balance - $1,
             total_bonus_transferred = total_bonus_transferred + $1,
             updated_at = NOW()
         WHERE player_id = $2`, [transferAmount, playerId]);
            // Add to main wallet balance in user_balances table
            await client.query(`UPDATE user_balances
         SET balance = balance + $1,
             updated_at = NOW()
         WHERE user_id = $2`, [transferAmount, playerId]);
            // Also create a transaction record for tracking
            await client.query(`INSERT INTO transactions (
          user_id, type, amount, status, description,
          external_reference, metadata, created_at
        ) VALUES ($1, 'bonus', $2, 'completed', $3, $4, $5, NOW())`, [
                playerId,
                transferAmount,
                'Bonus funds transferred from bonus wallet to main wallet',
                `bonus_transfer_${Date.now()}`,
                JSON.stringify({ source: 'bonus_transfer', transferred_at: new Date() })
            ]);
            await client.query('COMMIT');
            console.log(`[BONUS_WALLET] Transferred ${transferAmount} from bonus to main wallet for player ${playerId}`);
            return transferAmount;
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
     * Format wallet data
     */
    static formatWallet(row, releasableAmount = 0) {
        return {
            player_id: row.player_id,
            total_bonus_balance: parseFloat(row.total_bonus_balance) || 0,
            locked_bonus_balance: parseFloat(row.locked_bonus_balance) || 0,
            playable_bonus_balance: parseFloat(row.playable_bonus_balance) || 0,
            releasable_amount: releasableAmount,
            total_bonus_received: parseFloat(row.total_bonus_received) || 0,
            total_bonus_wagered: parseFloat(row.total_bonus_wagered) || 0,
            total_bonus_released: parseFloat(row.total_bonus_released) || 0,
            total_bonus_forfeited: parseFloat(row.total_bonus_forfeited) || 0,
            total_bonus_transferred: parseFloat(row.total_bonus_transferred) || 0,
            active_bonus_count: parseInt(row.active_bonus_count) || 0,
            currency: row.currency || 'NGN'
        };
    }
}
exports.BonusWalletService = BonusWalletService;
