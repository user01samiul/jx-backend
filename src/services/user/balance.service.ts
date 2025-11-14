import pool from "../../db/postgres";
import { ApiError } from "../../utils/apiError";
import { CurrencyUtils } from "../../utils/currency.utils";

export interface BalanceInfo {
  balance: number;
  bonus_balance: number;
  locked_balance: number;
  total_deposited: number;
  total_withdrawn: number;
  total_wagered: number;
  total_won: number;
  currency: string;
}

export interface TransactionData {
  user_id: number;
  type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'bonus' | 'cashback' | 'refund' | 'adjustment';
  amount: number;
  currency: string;
  description?: string;
  external_reference?: string;
  metadata?: any;
}

export class BalanceService {
  /**
   * Get user balance with MongoDB synchronization (replaces PostgreSQL sync functions)
   */
  static async getUserBalanceWithSync(userId: number): Promise<{
    mainWallet: BalanceInfo;
    categories: Record<string, number>;
  }> {
    console.log(`[BALANCE_SYNC] Getting user balance with sync for user ${userId}`);
    
    const { MongoBalanceSyncService } = require("../balance/mongo-balance-sync.service");
    return await MongoBalanceSyncService.syncUserFullBalance(userId);
  }
  
  /**
   * Get category balance with synchronization
   */
  static async getCategoryBalanceWithSync(userId: number, category: string): Promise<number> {
    console.log(`[BALANCE_SYNC] Getting category balance with sync for user ${userId}, category: ${category}`);
    
    const { MongoBalanceSyncService } = require("../balance/mongo-balance-sync.service");
    return await MongoBalanceSyncService.syncCategoryBalance(userId, category);
  }
  /**
   * Calculate real-time balance from transactions
   */
  static async calculateRealTimeBalance(userId: number): Promise<BalanceInfo> {
    console.log('[DEBUG][BALANCE CALC][ENTERED] userId:', userId);
    const client = await pool.connect();
    
    try {
      // Get user currency
      const currencyResult = await client.query(
        "SELECT currency FROM user_profiles WHERE user_id = $1",
        [userId]
      );
      const currency = currencyResult.rows[0]?.currency || 'USD';
      console.log('[DEBUG][BALANCE CALC][CURRENCY]', currency);

      // Calculate balance from main wallet transactions only (exclude category transactions)
      const txDebugResult = await client.query(
        `SELECT id, type, amount, metadata, status, description, created_at FROM transactions WHERE user_id = $1 AND status = 'completed' AND (metadata->>'category' IS NULL OR metadata->>'category' = '') ORDER BY created_at DESC`,
        [userId]
      );
      console.log('[DEBUG][BALANCE CALC][MAIN WALLET TRANSACTIONS]', txDebugResult.rows);
      const balanceResult = await client.query(
        `
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) as total_deposited,
          COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0) as total_withdrawn,
          COALESCE(SUM(CASE WHEN type = 'bet' THEN amount ELSE 0 END), 0) as total_bets,
          COALESCE(SUM(CASE WHEN type = 'win' THEN amount ELSE 0 END), 0) as total_wins,
          COALESCE(SUM(CASE WHEN type = 'bonus' THEN amount ELSE 0 END), 0) as total_bonus,
          COALESCE(SUM(CASE WHEN type = 'cashback' THEN amount ELSE 0 END), 0) as total_cashback,
          COALESCE(SUM(CASE WHEN type = 'refund' THEN amount ELSE 0 END), 0) as total_refunds,
          COALESCE(SUM(CASE WHEN type = 'adjustment' THEN amount ELSE 0 END), 0) as total_adjustments
        FROM transactions 
        WHERE user_id = $1 AND status = 'completed' AND (metadata->>'category' IS NULL OR metadata->>'category' = '')
        `,
        [userId]
      );
      console.log('[DEBUG][BALANCE CALC][BALANCE RESULT]', balanceResult.rows);

      const totals = balanceResult.rows[0];
      // Convert all to numbers
      const total_deposited = Number(totals.total_deposited);
      const total_withdrawn = Number(totals.total_withdrawn);
      const total_bets = Number(totals.total_bets);
      const total_wins = Number(totals.total_wins);
      const total_bonus = Number(totals.total_bonus);
      const total_cashback = Number(totals.total_cashback);
      const total_refunds = Number(totals.total_refunds);
      const total_adjustments = Number(totals.total_adjustments);
      // Calculate net balance
      const netBalance = 
        total_deposited + 
        total_wins + 
        total_bonus + 
        total_cashback + 
        total_refunds + 
        total_adjustments - 
        total_withdrawn - 
        total_bets;

      // Get locked balance (bets that are still pending)
      const lockedResult = await client.query(
        `
        SELECT COALESCE(SUM(bet_amount), 0) as locked_amount
        FROM bets 
        WHERE user_id = $1 AND outcome = 'pending'
        `,
        [userId]
      );
      const lockedBalance = Number(lockedResult.rows[0]?.locked_amount || 0);

      // Get bonus balance
      const bonusResult = await client.query(
        "SELECT bonus_balance FROM user_balances WHERE user_id = $1",
        [userId]
      );
      const bonusBalance = Number(bonusResult.rows[0]?.bonus_balance || 0);

      return {
        balance: Math.max(0, netBalance - lockedBalance), // Available balance
        bonus_balance: bonusBalance,
        locked_balance: lockedBalance,
        total_deposited,
        total_withdrawn,
        total_wagered: total_bets,
        total_won: total_wins,
        currency
      };
    } finally {
      client.release();
    }
  }

  /**
   * Update stored balance to match real-time calculation
   */
  static async syncStoredBalance(userId: number, clientParam?: any): Promise<BalanceInfo> {
    console.log('[DEBUG] START syncStoredBalance', { userId });
    const client = clientParam || await pool.connect();
    let startedTransaction = false;
    try {
      if (!clientParam) {
        await client.query('BEGIN');
        startedTransaction = true;
        console.log('[DEBUG] Began DB transaction in syncStoredBalance');
      }

      console.log('[DEBUG] Calling calculateRealTimeBalance from syncStoredBalance');
      const realTimeBalance = await this.calculateRealTimeBalance(userId);
      console.log('[DEBUG] Got realTimeBalance in syncStoredBalance', realTimeBalance);

      // Update stored balance
      console.log('[DEBUG] Inserting/updating user_balances');
      await client.query(
        `
        INSERT INTO user_balances (user_id, balance, bonus_balance, locked_balance, total_deposited, total_withdrawn, total_wagered, total_won, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        ON CONFLICT (access_token) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          balance = EXCLUDED.balance,
          bonus_balance = EXCLUDED.bonus_balance,
          locked_balance = EXCLUDED.locked_balance,
          total_deposited = EXCLUDED.total_deposited,
          total_withdrawn = EXCLUDED.total_withdrawn,
          total_wagered = EXCLUDED.total_wagered,
          total_won = EXCLUDED.total_won,
          updated_at = CURRENT_TIMESTAMP
        `,
        [
          userId,
          realTimeBalance.balance,
          realTimeBalance.bonus_balance,
          realTimeBalance.locked_balance,
          realTimeBalance.total_deposited,
          realTimeBalance.total_withdrawn,
          realTimeBalance.total_wagered,
          realTimeBalance.total_won
        ]
      );
      console.log('[DEBUG] user_balances upserted in syncStoredBalance');

      if (startedTransaction) {
        await client.query('COMMIT');
        console.log('[DEBUG] DB transaction committed in syncStoredBalance');
      }
      return realTimeBalance;
    } catch (error) {
      if (startedTransaction) {
        await client.query('ROLLBACK');
        console.log('[DEBUG] Error in syncStoredBalance, transaction rolled back', error);
      }
      throw error;
    } finally {
      if (!clientParam) {
        client.release();
        console.log('[DEBUG] DB client released in syncStoredBalance');
      }
    }
  }

  /**
   * Process a transaction and update balance atomically
   */
  static async processTransaction(transactionData: TransactionData, clientParam?: any): Promise<{
    transaction_id: number;
    new_balance: number;
    balance_before: number | null;
    balance_after: number | null;
  }> {
    console.log('[DEBUG] START processTransaction', transactionData);
    const client = clientParam || await pool.connect();
    let startedTransaction = false;
    try {
      if (!clientParam) {
        await client.query('BEGIN');
        startedTransaction = true;
        console.log('[DEBUG] Began DB transaction in processTransaction');
      }

      console.log('[TRANSACTION LOG]', {
        user_id: transactionData.user_id,
        type: transactionData.type,
        amount: transactionData.amount,
        category: transactionData.metadata?.category || null
      });

      // Check if this is a category bet (category wallet)
      const isCategoryBet = transactionData.metadata && transactionData.metadata.category;
      let balanceBefore: number | null = null;
      let balanceAfter: number | null = null;
      if (!isCategoryBet) {
        // Get current balance
        console.log('[DEBUG] Calculating real-time balance');
        const currentBalance = await this.calculateRealTimeBalance(transactionData.user_id);
        console.log('[DEBUG] Real-time balance result', currentBalance);
        balanceBefore = currentBalance.balance;

        // Validate transaction
        if (transactionData.type === 'bet' || transactionData.type === 'withdrawal') {
          if (balanceBefore < transactionData.amount) {
            console.log('[DEBUG] Insufficient balance', { balanceBefore, required: transactionData.amount });
            throw new ApiError(`Insufficient balance. Available: ${balanceBefore}, Required: ${transactionData.amount}`, 400);
          }
        }
        // Use proper decimal arithmetic to avoid floating-point precision issues
        balanceAfter =
          transactionData.type === 'bet' || transactionData.type === 'withdrawal'
            ? CurrencyUtils.subtract(balanceBefore, transactionData.amount)
            : CurrencyUtils.add(balanceBefore, transactionData.amount);
      }
      // For category bets, skip main wallet check/deduction, just log the transaction

      // Create transaction record
      console.log('[DEBUG] Inserting transaction record');
      const transactionResult = await client.query(
        `
        INSERT INTO transactions 
        (user_id, type, amount, balance_before, balance_after, currency, status, description, external_reference, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, 'completed', $7, $8, $9)
        RETURNING id
        `,
        [
          transactionData.user_id,
          transactionData.type,
          transactionData.amount,
          balanceBefore,
          balanceAfter,
          transactionData.currency,
          transactionData.description || `${transactionData.type} transaction`,
          transactionData.external_reference,
          transactionData.metadata ? JSON.stringify(transactionData.metadata) : null
        ]
      );
      console.log('[DEBUG] Transaction insert result', transactionResult.rows);

      const transactionId = transactionResult.rows[0].id;

      // Only sync stored balance for main wallet transactions
      let newBalance = { balance: null };
      if (!isCategoryBet) {
        // Update stored balance
        console.log('[DEBUG] Syncing stored balance');
        newBalance = await this.syncStoredBalance(transactionData.user_id, client);
        console.log('[DEBUG] syncStoredBalance result', newBalance);
      }

      if (startedTransaction) {
        await client.query('COMMIT');
        console.log('[DEBUG] DB transaction committed in processTransaction');
      }

      return {
        transaction_id: transactionId,
        new_balance: newBalance.balance,
        balance_before: balanceBefore,
        balance_after: balanceAfter
      };
    } catch (error) {
      if (startedTransaction) {
        await client.query('ROLLBACK');
        console.log('[DEBUG] Error in processTransaction, transaction rolled back', error);
      }
      throw error;
    } finally {
      if (!clientParam) {
        client.release();
        console.log('[DEBUG] DB client released in processTransaction');
      }
    }
  }

  /**
   * Add balance to user account (for deposits, wins, bonuses, etc.)
   */
  static async addBalance(
    userId: number, 
    amount: number, 
    description: string, 
    metadata?: any
  ): Promise<{
    transaction_id: number;
    new_balance: number;
    balance_before: number;
    balance_after: number;
  }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get current balance
      const currentBalance = await this.calculateRealTimeBalance(userId);
      const balanceBefore = currentBalance.balance;
      // Use proper decimal arithmetic to avoid floating-point precision issues
      const balanceAfter = CurrencyUtils.add(balanceBefore, amount);

      // Process the transaction
      const result = await this.processTransaction({
        user_id: userId,
        type: 'deposit', // or determine type from metadata
        amount: amount,
        currency: currentBalance.currency,
        description: description,
        metadata: metadata
      }, client);

      await client.query('COMMIT');

      return {
        transaction_id: result.transaction_id,
        new_balance: result.new_balance,
        balance_before: balanceBefore,
        balance_after: balanceAfter
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Deduct balance from user account (for withdrawals, bets, etc.)
   */
  static async deductBalance(
    userId: number, 
    amount: number, 
    description: string, 
    metadata?: any
  ): Promise<{
    transaction_id: number;
    new_balance: number;
    balance_before: number;
    balance_after: number;
  }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get current balance
      const currentBalance = await this.calculateRealTimeBalance(userId);
      const balanceBefore = currentBalance.balance;
      // Use proper decimal arithmetic to avoid floating-point precision issues
      const balanceAfter = CurrencyUtils.subtract(balanceBefore, amount);

      // Validate sufficient balance
      if (balanceBefore < amount) {
        throw new Error(`Insufficient balance. Available: ${balanceBefore}, Required: ${amount}`);
      }

      // Process the transaction
      const result = await this.processTransaction({
        user_id: userId,
        type: 'withdrawal', // or determine type from metadata
        amount: amount,
        currency: currentBalance.currency,
        description: description,
        metadata: metadata
      }, client);

      await client.query('COMMIT');

      return {
        transaction_id: result.transaction_id,
        new_balance: result.new_balance,
        balance_before: balanceBefore,
        balance_after: balanceAfter
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Process deposit transaction (specifically for deposits)
   */
  static async processDeposit(
    userId: number,
    amount: number,
    description: string,
    external_reference?: string,
    metadata?: any
  ): Promise<{
    transaction_id: number;
    new_balance: number;
    balance_before: number;
    balance_after: number;
  }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get current balance
      const currentBalance = await this.calculateRealTimeBalance(userId);
      const balanceBefore = currentBalance.balance;
      const balanceAfter = balanceBefore + amount;

      // Process the main deposit transaction
      const result = await this.processTransaction({
        user_id: userId,
        type: 'deposit',
        amount: amount,
        currency: currentBalance.currency,
        description: description,
        external_reference: external_reference,
        metadata: metadata
      }, client);

      // Automatically distribute deposit to categories
      await this.distributeDepositToCategories(userId, amount, currentBalance.currency, client);

      await client.query('COMMIT');

      return {
        transaction_id: result.transaction_id,
        new_balance: result.new_balance,
        balance_before: balanceBefore,
        balance_after: balanceAfter
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Distribute deposit amount to user's categories
   */
  private static async distributeDepositToCategories(
    userId: number, 
    depositAmount: number, 
    currency: string, 
    client: any
  ): Promise<void> {
    try {
      // Get existing categories that the user has used
      const categoriesResult = await client.query(`
        SELECT DISTINCT LOWER(TRIM(metadata->>'category')) as category
        FROM transactions 
        WHERE user_id = $1 AND status = 'completed' 
        AND metadata IS NOT NULL AND metadata->>'category' IS NOT NULL
        AND metadata->>'category' != ''
      `, [userId]);

      let categories = categoriesResult.rows.map(row => row.category).filter(cat => cat);
      
      // If no categories found, create default categories
      if (categories.length === 0) {
        categories = ['slots', 'crashgame', 'tablegame'];
        console.log(`[DEPOSIT_DISTRIBUTION] No existing categories found for user ${userId}, using default categories: ${categories.join(', ')}`);
      }

      // Calculate distribution amount per category
      const distributionPerCategory = depositAmount / categories.length;
      
      console.log(`[DEPOSIT_DISTRIBUTION] Distributing $${depositAmount} deposit to ${categories.length} categories: ${categories.join(', ')}`);
      console.log(`[DEPOSIT_DISTRIBUTION] Amount per category: $${distributionPerCategory}`);

      // Create distribution transactions for each category
      for (const category of categories) {
        // Create a distribution transaction for this category
        await client.query(`
          INSERT INTO transactions 
          (user_id, type, amount, balance_before, balance_after, currency, status, description, external_reference, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, 'completed', $7, $8, $9)
        `, [
          userId,
          'deposit',
          distributionPerCategory,
          0, // balance_before (will be calculated by balance consistency service)
          0, // balance_after (will be calculated by balance consistency service)
          currency,
          `Deposit distribution to ${category}`,
          `deposit_distribution_${Date.now()}_${category}`,
          JSON.stringify({ 
            category: category,
            distribution_type: 'auto_distribute',
            original_deposit_amount: depositAmount,
            distribution_percentage: (1 / categories.length) * 100
          })
        ]);

        // Update category balance
        await client.query(`
          INSERT INTO user_category_balances (user_id, category, balance) 
          VALUES ($1, $2, $3) 
          ON CONFLICT (user_id, category) DO UPDATE SET 
            balance = user_category_balances.balance + EXCLUDED.balance
        `, [userId, category, distributionPerCategory]);

        console.log(`[DEPOSIT_DISTRIBUTION] Added $${distributionPerCategory} to ${category} category for user ${userId}`);
      }

      console.log(`[DEPOSIT_DISTRIBUTION] Successfully distributed $${depositAmount} deposit to ${categories.length} categories for user ${userId}`);
    } catch (error) {
      console.error(`[DEPOSIT_DISTRIBUTION] Error distributing deposit to categories for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user balance (real-time calculation)
   */
  static async getUserBalance(userId: number): Promise<BalanceInfo> {
    return await this.calculateRealTimeBalance(userId);
  }

  /**
   * Validate user has sufficient balance
   */
  static async validateBalance(userId: number, requiredAmount: number): Promise<boolean> {
    const balance = await this.calculateRealTimeBalance(userId);
    return balance.balance >= requiredAmount;
  }

  /**
   * Get balance with detailed breakdown
   */
  static async getBalanceBreakdown(userId: number): Promise<{
    balance: BalanceInfo;
    recent_transactions: any[];
    pending_bets: any[];
  }> {
    const client = await pool.connect();
    
    try {
      const balance = await this.calculateRealTimeBalance(userId);

      // Get recent transactions
      const transactionsResult = await client.query(
        `
        SELECT id, type, amount, balance_before, balance_after, currency, description, created_at
        FROM transactions 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 10
        `,
        [userId]
      );

      // Get pending bets
      const pendingBetsResult = await client.query(
        `
        SELECT id, game_id, bet_amount, placed_at
        FROM bets 
        WHERE user_id = $1 AND outcome = 'pending'
        ORDER BY placed_at DESC
        `,
        [userId]
      );

      return {
        balance,
        recent_transactions: transactionsResult.rows,
        pending_bets: pendingBetsResult.rows
      };
    } finally {
      client.release();
    }
  }

  /**
   * Reconcile balance for all users (admin function)
   */
  static async reconcileAllBalances(): Promise<{
    total_users: number;
    reconciled_users: number;
    errors: string[];
  }> {
    const client = await pool.connect();
    
    try {
      const usersResult = await client.query("SELECT id FROM users");
      const users = usersResult.rows;
      let reconciled = 0;
      const errors: string[] = [];

      for (const user of users) {
        try {
          await this.syncStoredBalance(user.id);
          reconciled++;
        } catch (error: any) {
          errors.push(`User ${user.id}: ${error.message}`);
        }
      }

      return {
        total_users: users.length,
        reconciled_users: reconciled,
        errors
      };
    } finally {
      client.release();
    }
  }
} 