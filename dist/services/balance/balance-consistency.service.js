"use strict";
// =====================================================
// BALANCE CONSISTENCY SERVICE - FIXES BALANCE CALCULATION ISSUES
// =====================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BalanceConsistencyService = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
const apiError_1 = require("../../utils/apiError");
const currency_utils_1 = require("../../utils/currency.utils");
class BalanceConsistencyService {
    /**
     * Get comprehensive balance information for a user
     */
    static async getUserBalanceInfo(userId, excludeTransactionId) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Build WHERE clause to exclude specific transaction if needed
            const whereClause = excludeTransactionId
                ? 'WHERE user_id = $1 AND status = \'completed\' AND external_reference != $2'
                : 'WHERE user_id = $1 AND status = \'completed\'';
            const params = excludeTransactionId ? [userId, excludeTransactionId] : [userId];
            // Get main wallet balance (real-time calculation)
            const mainBalanceResult = await client.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN type IN ('deposit', 'win', 'bonus', 'cashback', 'refund', 'adjustment') THEN amount ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN type IN ('withdrawal', 'bet') THEN amount ELSE 0 END), 0) as main_balance,
          COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) as total_deposited,
          COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0) as total_withdrawn,
          COALESCE(SUM(CASE WHEN type = 'bet' THEN amount ELSE 0 END), 0) as total_wagered,
          COALESCE(SUM(CASE WHEN type = 'win' THEN amount ELSE 0 END), 0) as total_won
        FROM transactions 
        ${whereClause}
      `, params);
            const mainBalance = currency_utils_1.CurrencyUtils.safeParseBalance(mainBalanceResult.rows[0]?.main_balance || 0);
            const totalDeposited = currency_utils_1.CurrencyUtils.safeParseBalance(mainBalanceResult.rows[0]?.total_deposited || 0);
            const totalWithdrawn = currency_utils_1.CurrencyUtils.safeParseBalance(mainBalanceResult.rows[0]?.total_withdrawn || 0);
            const totalWagered = currency_utils_1.CurrencyUtils.safeParseBalance(mainBalanceResult.rows[0]?.total_wagered || 0);
            const totalWon = currency_utils_1.CurrencyUtils.safeParseBalance(mainBalanceResult.rows[0]?.total_won || 0);
            // Calculate category balances from transactions (real-time calculation)
            // Exclude transfer transactions since they're handled by stored balance table
            const categoryBalancesResult = await client.query(`
        SELECT 
          LOWER(TRIM(metadata->>'category')) as category,
          COALESCE(SUM(CASE WHEN type IN ('win', 'bonus', 'cashback', 'refund', 'adjustment') THEN amount ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN type IN ('bet') THEN amount ELSE 0 END), 0) as category_balance
        FROM transactions 
        WHERE user_id = $1 AND status = 'completed'
        ${excludeTransactionId ? 'AND external_reference != $2' : ''}
        AND metadata IS NOT NULL 
        AND metadata->>'category' IS NOT NULL
        AND (metadata->>'transfer_type' IS NULL OR metadata->>'transfer_type' = '')
        GROUP BY LOWER(TRIM(metadata->>'category'))
      `, params);
            // Get total deposits to distribute to categories
            const depositsResult = await client.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) as total_deposits,
          COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0) as total_withdrawals
        FROM transactions 
        WHERE user_id = $1 AND status = 'completed'
        ${excludeTransactionId ? 'AND external_reference != $2' : ''}
        AND (metadata IS NULL OR metadata->>'category' IS NULL)
      `, params);
            const totalDeposits = currency_utils_1.CurrencyUtils.safeParseBalance(depositsResult.rows[0]?.total_deposits || 0);
            const totalWithdrawals = currency_utils_1.CurrencyUtils.safeParseBalance(depositsResult.rows[0]?.total_withdrawals || 0);
            const availableDeposits = totalDeposits - totalWithdrawals;
            const categoryBalances = {};
            categoryBalancesResult.rows.forEach(row => {
                if (row.category) {
                    // Use the raw category balance (can be negative)
                    categoryBalances[row.category] = currency_utils_1.CurrencyUtils.safeParseBalance(row.category_balance);
                }
            });
            // Add a reasonable portion of deposits to category balances (not all deposits)
            if (availableDeposits > 0) {
                const usedCategories = Object.keys(categoryBalances).filter(category => {
                    // Include categories that have actual transactions (regardless of balance being positive or negative)
                    return true; // All categories with transactions should get deposits
                });
                if (usedCategories.length > 0) {
                    // Add a reasonable amount (e.g., 30% of deposits) to each used category
                    const reasonableDepositAmount = availableDeposits * 0.3; // 30% of deposits
                    const depositPerCategory = reasonableDepositAmount / usedCategories.length;
                    usedCategories.forEach(category => {
                        categoryBalances[category] += depositPerCategory;
                    });
                }
            }
            // For categories with no specific funds, they can use main balance
            // Category balances should show 0 if no specific funds allocated
            // Users can bet from main balance or transfer funds to categories
            // Calculate total net loss across all categories
            const totalNetLoss = Object.values(categoryBalances).reduce((sum, balance) => sum + Math.min(0, balance), 0);
            // Distribute available deposits to cover negative balances
            if (availableDeposits > 0 && totalNetLoss < 0) {
                const coverageNeeded = Math.abs(totalNetLoss);
                const coverageAvailable = Math.min(availableDeposits, coverageNeeded);
                // Distribute coverage proportionally to negative balances
                Object.keys(categoryBalances).forEach(category => {
                    const currentBalance = categoryBalances[category];
                    if (currentBalance < 0) {
                        const coverageRatio = coverageAvailable / coverageNeeded;
                        const coverageAmount = Math.abs(currentBalance) * coverageRatio;
                        categoryBalances[category] = currentBalance + coverageAmount;
                    }
                });
            }
            // Get locked amount from pending bets
            const lockedAmountResult = await client.query(`
        SELECT COALESCE(SUM(bet_amount), 0) as locked_amount
        FROM bets 
        WHERE user_id = $1 AND outcome = 'pending'
      `, [userId]);
            const lockedAmount = currency_utils_1.CurrencyUtils.safeParseBalance(lockedAmountResult.rows[0]?.locked_amount || 0);
            await client.query('COMMIT');
            return {
                mainBalance,
                categoryBalances,
                lockedAmount,
                totalDeposited,
                totalWithdrawn,
                totalWagered,
                totalWon
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
     * Validate if user has sufficient balance for a bet
     */
    static async validateBetBalance(userId, betAmount, category) {
        console.log(`[BALANCE_VALIDATION_DEBUG] Starting validation for user ${userId}, bet ${betAmount}, category: ${category}`);
        const balanceInfo = await this.getUserBalanceInfo(userId);
        console.log(`[BALANCE_VALIDATION_DEBUG] Balance info retrieved:`, {
            mainBalance: balanceInfo.mainBalance,
            categoryBalances: balanceInfo.categoryBalances,
            lockedAmount: balanceInfo.lockedAmount
        });
        if (category) {
            // Category-specific bet validation - check both category and main balance
            const categoryBalance = balanceInfo.categoryBalances[category.toLowerCase().trim()] || 0;
            const mainBalance = balanceInfo.mainBalance - balanceInfo.lockedAmount;
            const totalAvailable = categoryBalance + mainBalance;
            console.log(`[BALANCE_VALIDATION_DEBUG] Category bet validation:`, {
                userId,
                category,
                category_lower: category.toLowerCase().trim(),
                category_balance: categoryBalance,
                main_balance: mainBalance,
                total_available: totalAvailable,
                bet_amount: betAmount,
                has_sufficient_balance: totalAvailable >= betAmount,
                all_categories: Object.keys(balanceInfo.categoryBalances)
            });
            if (totalAvailable < betAmount) {
                return {
                    valid: false,
                    available: totalAvailable,
                    required: betAmount,
                    error: `Insufficient balance. Category available: ${categoryBalance}, Main available: ${mainBalance}, Total available: ${totalAvailable}, Required: ${betAmount}`
                };
            }
            return {
                valid: true,
                available: totalAvailable,
                required: betAmount
            };
        }
        else {
            // Main wallet bet validation
            const availableBalance = balanceInfo.mainBalance - balanceInfo.lockedAmount;
            console.log(`[BALANCE_VALIDATION_DEBUG] Main wallet bet validation:`, {
                userId,
                available_balance: availableBalance,
                locked_amount: balanceInfo.lockedAmount,
                bet_amount: betAmount,
                has_sufficient_balance: availableBalance >= betAmount
            });
            if (availableBalance < betAmount) {
                return {
                    valid: false,
                    available: availableBalance,
                    required: betAmount,
                    error: `Insufficient main balance. Available: ${availableBalance}, Required: ${betAmount}`
                };
            }
            return {
                valid: true,
                available: availableBalance,
                required: betAmount
            };
        }
    }
    /**
     * Process transaction with atomic balance update
     */
    static async processTransactionWithBalanceUpdate(transactionData, category) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            let balanceBefore = 0;
            let balanceAfter = 0;
            console.log(`[BALANCE_CONSISTENCY] Processing ${transactionData.type} transaction:`, {
                user_id: transactionData.user_id,
                amount: transactionData.amount,
                category: category,
                external_reference: transactionData.external_reference
            });
            if (category) {
                // Category-specific transaction - calculate balance from transactions for this category only
                // Exclude transfer transactions since they're handled by stored balance table
                const categoryBalanceResult = await client.query(`
          SELECT 
            COALESCE(SUM(CASE WHEN type IN ('win', 'bonus', 'cashback', 'refund', 'adjustment') THEN amount ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN type IN ('bet') THEN amount ELSE 0 END), 0) as category_balance
          FROM transactions 
          WHERE user_id = $1 AND status = 'completed'
          AND metadata IS NOT NULL 
          AND LOWER(TRIM(metadata->>'category')) = $2
          AND (metadata->>'transfer_type' IS NULL OR metadata->>'transfer_type' = '')
        `, [transactionData.user_id, category.toLowerCase().trim()]);
                // Get main balance for validation
                const mainBalanceResult = await client.query(`
          SELECT 
            COALESCE(SUM(CASE WHEN type IN ('deposit', 'win', 'bonus', 'cashback', 'refund', 'adjustment') THEN amount ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN type IN ('withdrawal', 'bet') THEN amount ELSE 0 END), 0) as main_balance
          FROM transactions 
          WHERE user_id = $1 AND status = 'completed'
        `, [transactionData.user_id]);
                const categoryNetBalance = currency_utils_1.CurrencyUtils.safeParseBalance(categoryBalanceResult.rows[0]?.category_balance || 0);
                const mainBalance = currency_utils_1.CurrencyUtils.safeParseBalance(mainBalanceResult.rows[0]?.main_balance || 0);
                // Category balance should show available funds (not negative)
                balanceBefore = Math.max(0, categoryNetBalance);
                console.log(`[BALANCE_CONSISTENCY] Category transaction - ${category}:`, {
                    category_net_balance: categoryNetBalance,
                    category_available_balance: balanceBefore,
                    main_balance: mainBalance,
                    transaction_type: transactionData.type,
                    amount: transactionData.amount
                });
                if (transactionData.type === 'bet') {
                    // For bets, check if category has funds OR if main balance has funds
                    const totalAvailable = balanceBefore + mainBalance;
                    if (totalAvailable < transactionData.amount) {
                        throw new apiError_1.ApiError(`Insufficient balance. Category available: ${balanceBefore}, Main available: ${mainBalance}, Required: ${transactionData.amount}`, 400);
                    }
                    // Use proper decimal arithmetic to avoid floating-point precision issues
                    balanceAfter = currency_utils_1.CurrencyUtils.subtract(balanceBefore, transactionData.amount);
                    console.log(`[BALANCE_CONSISTENCY] BET: ${balanceBefore} - ${transactionData.amount} = ${balanceAfter}`);
                }
                else {
                    // Use proper decimal arithmetic to avoid floating-point precision issues
                    balanceAfter = currency_utils_1.CurrencyUtils.add(balanceBefore, transactionData.amount);
                    console.log(`[BALANCE_CONSISTENCY] WIN/CREDIT: ${balanceBefore} + ${transactionData.amount} = ${balanceAfter}`);
                }
                // Update category balance in stored table for consistency
                await client.query(`
          INSERT INTO user_category_balances (user_id, category, balance)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, category) DO UPDATE SET balance = EXCLUDED.balance
        `, [transactionData.user_id, category.toLowerCase().trim(), balanceAfter]);
            }
            else {
                // Main wallet transaction - calculate balance from existing transactions only
                const balanceResult = await client.query(`
          SELECT 
            COALESCE(SUM(CASE WHEN type IN ('deposit', 'win', 'bonus', 'cashback', 'refund', 'adjustment') THEN amount ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN type IN ('withdrawal', 'bet') THEN amount ELSE 0 END), 0) as main_balance
          FROM transactions 
          WHERE user_id = $1 AND status = 'completed'
        `, [transactionData.user_id]);
                balanceBefore = currency_utils_1.CurrencyUtils.safeParseBalance(balanceResult.rows[0]?.main_balance || 0);
                console.log(`[BALANCE_CONSISTENCY] Main wallet transaction:`, {
                    balance_before: balanceBefore,
                    transaction_type: transactionData.type,
                    amount: transactionData.amount
                });
                if (transactionData.type === 'bet' || transactionData.type === 'withdrawal') {
                    if (balanceBefore < transactionData.amount) {
                        throw new apiError_1.ApiError(`Insufficient main balance. Available: ${balanceBefore}, Required: ${transactionData.amount}`, 400);
                    }
                    // Use proper decimal arithmetic to avoid floating-point precision issues
                    balanceAfter = currency_utils_1.CurrencyUtils.subtract(balanceBefore, transactionData.amount);
                    console.log(`[BALANCE_CONSISTENCY] BET/WITHDRAWAL: ${balanceBefore} - ${transactionData.amount} = ${balanceAfter}`);
                }
                else {
                    // Use proper decimal arithmetic to avoid floating-point precision issues
                    balanceAfter = currency_utils_1.CurrencyUtils.add(balanceBefore, transactionData.amount);
                    console.log(`[BALANCE_CONSISTENCY] WIN/DEPOSIT: ${balanceBefore} + ${transactionData.amount} = ${balanceAfter}`);
                }
            }
            // Insert transaction record
            const transactionResult = await client.query(`
        INSERT INTO transactions (
          user_id, type, amount, balance_before, balance_after, 
          currency, status, description, external_reference, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `, [
                transactionData.user_id,
                transactionData.type,
                transactionData.amount,
                balanceBefore,
                balanceAfter,
                transactionData.currency,
                'completed',
                transactionData.description,
                transactionData.external_reference,
                transactionData.metadata ? JSON.stringify(transactionData.metadata) : null
            ]);
            // Automatically sync stored balances to ensure consistency
            await this.syncStoredBalances(transactionData.user_id);
            await client.query('COMMIT');
            return {
                transaction_id: transactionResult.rows[0].id,
                balance_before: balanceBefore,
                balance_after: balanceAfter
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
     * Sync user balance with real-time calculation
     */
    static async syncUserBalance(userId) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Call the database function to sync balance
            await client.query('SELECT sync_user_balance($1)', [userId]);
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
     * Fix balance inconsistencies for a user
     */
    static async fixBalanceInconsistencies(userId) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get current stored balances
            const storedBalanceResult = await client.query(`
        SELECT balance FROM user_balances WHERE user_id = $1
      `, [userId]);
            const storedCategoryBalancesResult = await client.query(`
        SELECT category, balance FROM user_category_balances WHERE user_id = $1
      `, [userId]);
            const oldMainBalance = storedBalanceResult.rows[0]?.balance || 0;
            const oldCategoryBalances = {};
            storedCategoryBalancesResult.rows.forEach(row => {
                oldCategoryBalances[row.category] = Number(row.balance);
            });
            // Calculate real-time balances
            const balanceInfo = await this.getUserBalanceInfo(userId);
            // Update stored balances
            await client.query(`
        INSERT INTO user_balances (user_id, balance, bonus_balance, locked_balance, total_deposited, total_withdrawn, total_wagered, total_won, updated_at)
        VALUES ($1, $2, 0, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) DO UPDATE SET
          balance = EXCLUDED.balance,
          locked_balance = EXCLUDED.locked_balance,
          total_deposited = EXCLUDED.total_deposited,
          total_withdrawn = EXCLUDED.total_withdrawn,
          total_wagered = EXCLUDED.total_wagered,
          total_won = EXCLUDED.total_won,
          updated_at = CURRENT_TIMESTAMP
      `, [
                userId,
                balanceInfo.mainBalance,
                balanceInfo.lockedAmount,
                balanceInfo.totalDeposited,
                balanceInfo.totalWithdrawn,
                balanceInfo.totalWagered,
                balanceInfo.totalWon
            ]);
            // Update category balances
            for (const [category, balance] of Object.entries(balanceInfo.categoryBalances)) {
                await client.query(`
          INSERT INTO user_category_balances (user_id, category, balance)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, category) DO UPDATE SET balance = EXCLUDED.balance
        `, [userId, category, balance]);
            }
            await client.query('COMMIT');
            return {
                fixed: true,
                oldMainBalance,
                newMainBalance: balanceInfo.mainBalance,
                oldCategoryBalances,
                newCategoryBalances: balanceInfo.categoryBalances
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
     * Sync stored balances with calculated balances to ensure consistency
     */
    static async syncStoredBalances(userId) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get real-time balance info
            const balanceInfo = await this.getUserBalanceInfo(userId);
            // Update main balance
            await client.query(`
        INSERT INTO user_balances (user_id, balance, bonus_balance, locked_balance, total_deposited, total_withdrawn, total_wagered, total_won, updated_at)
        VALUES ($1, $2, 0, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) DO UPDATE SET
          balance = EXCLUDED.balance,
          locked_balance = EXCLUDED.locked_balance,
          total_deposited = EXCLUDED.total_deposited,
          total_withdrawn = EXCLUDED.total_withdrawn,
          total_wagered = EXCLUDED.total_wagered,
          total_won = EXCLUDED.total_won,
          updated_at = CURRENT_TIMESTAMP
      `, [
                userId,
                balanceInfo.mainBalance,
                balanceInfo.lockedAmount,
                balanceInfo.totalDeposited,
                balanceInfo.totalWithdrawn,
                balanceInfo.totalWagered,
                balanceInfo.totalWon
            ]);
            // Update category balances
            for (const [category, balance] of Object.entries(balanceInfo.categoryBalances)) {
                await client.query(`
          INSERT INTO user_category_balances (user_id, category, balance)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, category) DO UPDATE SET balance = EXCLUDED.balance
        `, [userId, category, balance]);
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
     * Get balance audit trail for debugging
     */
    static async getBalanceAuditTrail(userId, limit = 50) {
        const result = await postgres_1.default.query(`
      SELECT 
        t.id,
        t.type,
        t.amount,
        t.balance_before,
        t.balance_after,
        t.currency,
        t.status,
        t.description,
        t.external_reference,
        t.created_at,
        t.metadata
      FROM transactions t
      WHERE t.user_id = $1
      ORDER BY t.created_at DESC
      LIMIT $2
    `, [userId, limit]);
        return result.rows;
    }
}
exports.BalanceConsistencyService = BalanceConsistencyService;
