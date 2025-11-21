import { Request, Response } from 'express';
import { WithdrawalService } from '../services/withdrawal/withdrawal.service';
import pool from '../db/postgres';

/**
 * Withdrawal Controller
 * Handles all withdrawal-related API endpoints for users and admins
 */

// Network-specific address validation patterns
const ADDRESS_PATTERNS: Record<string, { pattern: RegExp; length: number | null; prefix: string | null; example: string }> = {
  TRC20: {
    pattern: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
    length: 34,
    prefix: 'T',
    example: 'TYDzsYUEpvnYmQk4zGP9sWWcTEd2MiAtW6'
  },
  ERC20: {
    pattern: /^0x[a-fA-F0-9]{40}$/,
    length: 42,
    prefix: '0x',
    example: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
  },
  BEP20: {
    pattern: /^0x[a-fA-F0-9]{40}$/,
    length: 42,
    prefix: '0x',
    example: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
  },
  Polygon: {
    pattern: /^0x[a-fA-F0-9]{40}$/,
    length: 42,
    prefix: '0x',
    example: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
  },
  BTC: {
    pattern: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/,
    length: null,
    prefix: null,
    example: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
  },
  LTC: {
    pattern: /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/,
    length: null,
    prefix: null,
    example: 'LTC1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
  },
  DOGE: {
    pattern: /^D[5-9A-HJ-NP-U][1-9A-HJ-NP-Za-km-z]{32}$/,
    length: 34,
    prefix: 'D',
    example: 'D7Y55r7P9p69v5K3h7CJpW2Y9S8M6h7Q9q'
  },
  SOL: {
    pattern: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    length: null,
    prefix: null,
    example: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV'
  },
  TON: {
    pattern: /^(EQ|UQ)[a-zA-Z0-9_-]{46}$/,
    length: 48,
    prefix: null,
    example: 'EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2'
  },
  XRP: {
    pattern: /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/,
    length: null,
    prefix: 'r',
    example: 'rN7n3473SaZBCG4dFL83w7a1RXtXtbk2D9'
  },
  XMR: {
    pattern: /^[48][0-9AB][1-9A-HJ-NP-Za-km-z]{93}$/,
    length: 95,
    prefix: null,
    example: '48edfHu7V9Z84YzzMa6fUueoELZ9ZRXq9VetWzYGzKt52XU5xvqgzYnDK9URnRgJKy3dQNcBQ...'
  },
  BCH: {
    pattern: /^(bitcoincash:)?[qp][a-z0-9]{41}$/,
    length: null,
    prefix: null,
    example: 'qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a'
  }
};

// All supported currencies with their compatible networks (based on Oxapay)
const CURRENCY_NETWORK_COMPATIBILITY: Record<string, string[]> = {
  // Stablecoins - multiple networks
  'USDT': ['TRC20', 'ERC20', 'BEP20', 'Polygon', 'SOL', 'TON'],
  'USDC': ['TRC20', 'ERC20', 'BEP20', 'Polygon', 'SOL'],
  'DAI': ['ERC20', 'BEP20', 'Polygon'],

  // Native coins - single network
  'BTC': ['BTC'],
  'ETH': ['ERC20'],
  'BNB': ['BEP20'],
  'TRX': ['TRC20'],
  'LTC': ['LTC'],
  'DOGE': ['DOGE'],
  'SOL': ['SOL'],
  'TON': ['TON'],
  'XRP': ['XRP'],
  'XMR': ['XMR'],
  'BCH': ['BCH'],
  'POL': ['Polygon'],
  'MATIC': ['Polygon'],

  // Tokens - ERC20/BEP20
  'SHIB': ['ERC20', 'BEP20'],
  'NOT': ['TON'],
  'DOGS': ['TON'],

  // Generic crypto (fallback)
  'crypto': ['TRC20', 'ERC20', 'BEP20', 'BTC', 'LTC', 'DOGE', 'SOL', 'TON', 'Polygon']
};

// All valid networks
const VALID_NETWORKS = ['TRC20', 'ERC20', 'BEP20', 'BTC', 'LTC', 'DOGE', 'SOL', 'TON', 'Polygon', 'XRP', 'XMR', 'BCH'];

// All valid currencies
const VALID_CURRENCIES = [
  'BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'DOGE', 'POL', 'MATIC', 'LTC', 'SOL',
  'TRX', 'SHIB', 'TON', 'XMR', 'DAI', 'BCH', 'NOT', 'DOGS', 'XRP'
];

// Validate wallet address format based on network
function validateWalletAddress(address: string, network: string): { valid: boolean; error?: string } {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Wallet address is required' };
  }

  const trimmedAddress = address.trim();

  if (trimmedAddress.length === 0) {
    return { valid: false, error: 'Wallet address cannot be empty' };
  }

  const networkConfig = ADDRESS_PATTERNS[network as keyof typeof ADDRESS_PATTERNS];

  if (!networkConfig) {
    // Unknown network - allow but warn
    console.warn(`Unknown network ${network}, skipping address format validation`);
    return { valid: true };
  }

  // Check prefix
  if (networkConfig.prefix && !trimmedAddress.startsWith(networkConfig.prefix)) {
    return {
      valid: false,
      error: `Invalid ${network} address: must start with "${networkConfig.prefix}". Example: ${networkConfig.example}`
    };
  }

  // Check length (if fixed)
  if (networkConfig.length && trimmedAddress.length !== networkConfig.length) {
    return {
      valid: false,
      error: `Invalid ${network} address: must be exactly ${networkConfig.length} characters. Got ${trimmedAddress.length} characters.`
    };
  }

  // Check pattern
  if (!networkConfig.pattern.test(trimmedAddress)) {
    return {
      valid: false,
      error: `Invalid ${network} address format. Example: ${networkConfig.example}`
    };
  }

  return { valid: true };
}

// Validate currency and network compatibility
function validateCurrencyNetworkCompatibility(currency: string, network: string): { valid: boolean; error?: string } {
  const supportedNetworks = CURRENCY_NETWORK_COMPATIBILITY[currency] || CURRENCY_NETWORK_COMPATIBILITY['crypto'];

  if (!supportedNetworks.includes(network)) {
    return {
      valid: false,
      error: `${currency} is not supported on ${network} network. Supported networks: ${supportedNetworks.join(', ')}`
    };
  }

  return { valid: true };
}

export class WithdrawalController {
  /**
   * User: Create a new withdrawal request
   * POST /api/withdrawals
   */
  static async createWithdrawal(req: Request, res: Response) {
    const client = await pool.connect();

    try {
      const userId = (req as any).user.userId;
      const { amount, payment_method, crypto_address, crypto_network, currency, memo } = req.body;
      const errors: string[] = [];

      // ============================================
      // 1. AMOUNT VALIDATION
      // ============================================

      // Check if amount is present
      if (amount === undefined || amount === null || amount === '') {
        errors.push('Amount is required');
      } else {
        const numAmount = parseFloat(amount);

        // Check if amount is a valid number
        if (isNaN(numAmount)) {
          errors.push('Amount must be a valid number');
        } else {
          // Check if amount is positive
          if (numAmount <= 0) {
            errors.push('Amount must be greater than 0');
          }

          // Check decimal places (max 8)
          const decimalPlaces = (amount.toString().split('.')[1] || '').length;
          if (decimalPlaces > 8) {
            errors.push('Amount cannot have more than 8 decimal places');
          }

          // Min/Max validation (will be checked again in service with settings)
          if (numAmount < 1) {
            errors.push('Minimum withdrawal amount is $1');
          }
          if (numAmount > 100000) {
            errors.push('Maximum withdrawal amount is $100,000');
          }
        }
      }

      // ============================================
      // 2. PAYMENT METHOD VALIDATION
      // ============================================

      if (!payment_method) {
        errors.push('Payment method is required');
      } else if (!['crypto', 'bank'].includes(payment_method)) {
        errors.push('Invalid payment method. Allowed: crypto, bank');
      }

      // ============================================
      // 3. CRYPTO-SPECIFIC VALIDATION
      // ============================================

      if (payment_method === 'crypto') {
        // Currency validation (if provided)
        const currencyToValidate = currency || 'USDT';
        if (currency && !VALID_CURRENCIES.includes(currency) && currency !== 'crypto') {
          errors.push(`Invalid currency. Supported: ${VALID_CURRENCIES.join(', ')}`);
        }

        // Network validation
        if (!crypto_network) {
          errors.push('Crypto network is required for crypto withdrawals');
        } else if (!VALID_NETWORKS.includes(crypto_network)) {
          errors.push(`Invalid network. Allowed: ${VALID_NETWORKS.join(', ')}`);
        }

        // Address validation
        if (!crypto_address) {
          errors.push('Crypto address is required for crypto withdrawals');
        } else if (crypto_network && VALID_NETWORKS.includes(crypto_network)) {
          const addressValidation = validateWalletAddress(crypto_address, crypto_network);
          if (!addressValidation.valid) {
            errors.push(addressValidation.error!);
          }
        }

        // Currency & Network compatibility
        if (crypto_network && VALID_NETWORKS.includes(crypto_network)) {
          const compatibilityCheck = validateCurrencyNetworkCompatibility(currencyToValidate, crypto_network);
          if (!compatibilityCheck.valid) {
            errors.push(compatibilityCheck.error!);
          }
        }
      }

      // ============================================
      // 4. MEMO VALIDATION (if applicable)
      // ============================================

      if (memo) {
        if (typeof memo !== 'string') {
          errors.push('Memo must be a string');
        } else if (memo.length > 100) {
          errors.push('Memo cannot exceed 100 characters');
        }

        // XRP/XLM specific memo validation
        if (currency === 'XRP' || currency === 'XLM') {
          if (memo.length > 28) {
            errors.push(`${currency} memo cannot exceed 28 characters`);
          }
        }
      }

      // ============================================
      // RETURN VALIDATION ERRORS
      // ============================================

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors
        });
      }

      // Get user IP
      const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';

      const withdrawalRequest = {
        user_id: userId,
        amount: parseFloat(amount),
        currency: currency || 'USD',
        crypto_currency: payment_method,
        crypto_address: crypto_address?.trim(),
        crypto_network: crypto_network,
        crypto_memo: memo,
        ip_address: ipAddress
      };

      const result = await WithdrawalService.createWithdrawalRequest(withdrawalRequest);

      return res.status(201).json({
        success: true,
        message: result.autoApproved
          ? 'Withdrawal request created and approved automatically'
          : 'Withdrawal request submitted successfully',
        data: result
      });

    } catch (error: any) {
      console.error('Error creating withdrawal:', error);

      // Handle specific validation errors from service
      if (error.message?.includes('KYC verification')) {
        return res.status(403).json({
          success: false,
          message: error.message,
          errors: ['KYC verification required']
        });
      }

      if (error.message?.includes('Insufficient balance')) {
        return res.status(400).json({
          success: false,
          message: error.message,
          errors: ['Insufficient balance for this withdrawal']
        });
      }

      if (error.message?.includes('minimum deposit')) {
        return res.status(400).json({
          success: false,
          message: error.message,
          errors: ['Minimum deposit requirement not met']
        });
      }

      if (error.message?.includes('limit')) {
        return res.status(400).json({
          success: false,
          message: error.message,
          errors: [error.message]
        });
      }

      if (error.message?.includes('Account')) {
        return res.status(400).json({
          success: false,
          message: error.message,
          errors: [error.message]
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to create withdrawal request',
        errors: [error.message || 'An unexpected error occurred']
      });
    } finally {
      client.release();
    }
  }

  /**
   * User: Get own withdrawal requests
   * GET /api/withdrawals
   */
  static async getMyWithdrawals(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { status, limit = 50, offset = 0 } = req.query;

      const filters: any = { userId };

      if (status) {
        filters.status = status as string;
      }

      const withdrawals = await WithdrawalService.getWithdrawals({ ...filters, limit: parseInt(limit as string), offset: parseInt(offset as string) });

      return res.status(200).json({
        success: true,
        data: withdrawals
      });

    } catch (error: any) {
      console.error('Error fetching withdrawals:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch withdrawal requests',
        error: error.message
      });
    }
  }

  /**
   * User: Get specific withdrawal details
   * GET /api/withdrawals/:id
   */
  static async getWithdrawalById(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const withdrawalId = parseInt(req.params.id);

      if (isNaN(withdrawalId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid withdrawal ID'
        });
      }

      const withdrawals = await WithdrawalService.getWithdrawals({ id: withdrawalId, userId, limit: 1, offset: 0 });

      if (withdrawals.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Withdrawal request not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: withdrawals[0]
      });

    } catch (error: any) {
      console.error('Error fetching withdrawal:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch withdrawal request',
        error: error.message
      });
    }
  }

  /**
   * User: Cancel pending withdrawal
   * DELETE /api/withdrawals/:id
   */
  static async cancelWithdrawal(req: Request, res: Response) {
    const client = await pool.connect();

    try {
      const userId = (req as any).user.userId;
      const withdrawalId = parseInt(req.params.id);

      if (isNaN(withdrawalId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid withdrawal ID'
        });
      }

      await client.query('BEGIN');

      // Check if withdrawal exists and belongs to user
      const checkResult = await client.query(
        `SELECT id, status, amount, user_id
         FROM withdrawal_requests
         WHERE id = $1 AND user_id = $2`,
        [withdrawalId, userId]
      );

      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Withdrawal request not found'
        });
      }

      const withdrawal = checkResult.rows[0];

      // Only pending withdrawals can be cancelled
      if (withdrawal.status !== 'pending') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Cannot cancel withdrawal with status: ${withdrawal.status}`
        });
      }

      // Refund the amount
      await client.query(
        `UPDATE user_balances
         SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
        [withdrawal.amount, userId]
      );

      // Update withdrawal status
      await client.query(
        `UPDATE withdrawal_requests
         SET status = 'cancelled',
             rejection_reason = 'Cancelled by user',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [withdrawalId]
      );

      // Log audit
      await client.query(
        `INSERT INTO withdrawal_audit_log
         (withdrawal_id, action, actor_id, actor_type, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          withdrawalId,
          'cancelled',
          userId,
          'user',
          JSON.stringify({ reason: 'Cancelled by user', refunded_amount: withdrawal.amount })
        ]
      );

      await client.query('COMMIT');

      return res.status(200).json({
        success: true,
        message: 'Withdrawal cancelled successfully',
        data: {
          withdrawalId,
          refunded: withdrawal.amount
        }
      });

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error cancelling withdrawal:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to cancel withdrawal',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * Admin: Get all withdrawal requests
   * GET /api/admin/withdrawals
   */
  static async getAllWithdrawals(req: Request, res: Response) {
    try {
      const { status, payment_method, user_id, from_date, to_date, limit = 100, offset = 0 } = req.query;

      const filters: any = {};

      if (status) filters.status = status as string;
      if (payment_method) filters.paymentMethod = payment_method as string;
      if (user_id) filters.userId = parseInt(user_id as string);
      if (from_date) filters.fromDate = new Date(from_date as string);
      if (to_date) filters.toDate = new Date(to_date as string);

      const withdrawals = await WithdrawalService.getWithdrawals({ ...filters, limit: parseInt(limit as string), offset: parseInt(offset as string) });

      // Get total count for proper pagination
      const totalResult = await WithdrawalService.getWithdrawals({ ...filters, limit: 99999, offset: 0 });
      const total = totalResult.length;
      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);

      return res.status(200).json({
        success: true,
        data: {
          data: withdrawals,
          pagination: {
            limit: limitNum,
            offset: offsetNum,
            total: total,
            has_more: offsetNum + withdrawals.length < total
          }
        }
      });

    } catch (error: any) {
      console.error('Error fetching all withdrawals:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch withdrawal requests',
        error: error.message
      });
    }
  }

  /**
   * Admin: Approve withdrawal
   * POST /api/admin/withdrawals/:id/approve
   */
  static async approveWithdrawal(req: Request, res: Response) {
    try {
      const adminId = (req as any).user.userId;
      const withdrawalId = parseInt(req.params.id);
      const { admin_notes } = req.body;

      if (isNaN(withdrawalId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid withdrawal ID'
        });
      }

      const approval = {
        withdrawal_id: withdrawalId,
        approved_by: adminId,
        notes: admin_notes
      };

      await WithdrawalService.approveWithdrawal(approval);

      return res.status(200).json({
        success: true,
        message: 'Withdrawal approved and processed successfully'
      });

    } catch (error: any) {
      console.error('Error approving withdrawal:', error);

      if (error.message?.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message?.includes('already processed')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to approve withdrawal',
        error: error.message
      });
    }
  }

  /**
   * Admin: Reject withdrawal
   * POST /api/admin/withdrawals/:id/reject
   */
  static async rejectWithdrawal(req: Request, res: Response) {
    try {
      const adminId = (req as any).user.userId;
      const withdrawalId = parseInt(req.params.id);
      const { reason, admin_notes } = req.body;

      if (isNaN(withdrawalId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid withdrawal ID'
        });
      }

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required'
        });
      }

      const rejection = {
        withdrawal_id: withdrawalId,
        rejected_by: adminId,
        rejection_reason: reason
      };

      await WithdrawalService.rejectWithdrawal(rejection);

      return res.status(200).json({
        success: true,
        message: 'Withdrawal rejected and amount refunded'
      });

    } catch (error: any) {
      console.error('Error rejecting withdrawal:', error);

      if (error.message?.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message?.includes('already processed')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to reject withdrawal',
        error: error.message
      });
    }
  }

  /**
   * Admin: Get withdrawal statistics
   * GET /api/admin/withdrawals/statistics
   */
  static async getStatistics(req: Request, res: Response) {
    try {
      const { from_date, to_date } = req.query;

      const filters: any = {};
      if (from_date) filters.from_date = from_date;
      if (to_date) filters.to_date = to_date;

      const stats = await WithdrawalService.getStatistics(filters);

      return res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error: any) {
      console.error('Error fetching withdrawal statistics:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch withdrawal statistics',
        error: error.message
      });
    }
  }

  /**
   * Admin: Get dashboard statistics (cards + recent payouts)
   * GET /api/admin/withdrawals/dashboard
   */
  static async getDashboard(req: Request, res: Response) {
    try {
      const dashboardData = await WithdrawalService.getDashboardStatistics();

      return res.status(200).json({
        success: true,
        data: dashboardData
      });

    } catch (error: any) {
      console.error('Error fetching dashboard:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard data',
        error: error.message
      });
    }
  }

  /**
   * Admin: Get withdrawal settings
   * GET /api/admin/withdrawals/settings
   */
  static async getSettings(req: Request, res: Response) {
    try {
      const result = await pool.query(
        `SELECT key, value, description, data_type
         FROM withdrawal_settings
         ORDER BY key`
      );

      const settings: any = {};

      for (const row of result.rows) {
        let value = row.value;

        // Parse value based on data_type
        if (row.data_type === 'boolean') {
          value = value === 'true';
        } else if (row.data_type === 'integer') {
          value = parseInt(value);
        } else if (row.data_type === 'decimal') {
          value = parseFloat(value);
        } else if (row.data_type === 'json') {
          value = JSON.parse(value);
        }

        settings[row.key] = {
          value,
          description: row.description,
          type: row.data_type
        };
      }

      return res.status(200).json({
        success: true,
        data: settings
      });

    } catch (error: any) {
      console.error('Error fetching withdrawal settings:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch withdrawal settings',
        error: error.message
      });
    }
  }

  /**
   * Admin: Update withdrawal settings
   * PUT /api/admin/withdrawals/settings
   */
  static async updateSettings(req: Request, res: Response) {
    const client = await pool.connect();

    try {
      const updates = req.body;

      if (!updates || typeof updates !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Invalid settings data'
        });
      }

      await client.query('BEGIN');

      const updatedSettings: any = {};

      for (const [key, value] of Object.entries(updates)) {
        // Get setting data type
        const typeResult = await client.query(
          `SELECT data_type FROM withdrawal_settings WHERE key = $1`,
          [key]
        );

        if (typeResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: `Invalid setting key: ${key}`
          });
        }

        const dataType = typeResult.rows[0].data_type;
        let stringValue: string;

        // Convert value to string based on data type
        if (dataType === 'json') {
          stringValue = JSON.stringify(value);
        } else if (dataType === 'boolean') {
          stringValue = value ? 'true' : 'false';
        } else {
          stringValue = String(value);
        }

        // Update setting
        await client.query(
          `UPDATE withdrawal_settings
           SET value = $1, updated_at = CURRENT_TIMESTAMP
           WHERE key = $2`,
          [stringValue, key]
        );

        updatedSettings[key] = value;
      }

      await client.query('COMMIT');

      return res.status(200).json({
        success: true,
        message: 'Withdrawal settings updated successfully',
        data: updatedSettings
      });

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error updating withdrawal settings:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update withdrawal settings',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * Admin: Get withdrawal audit log
   * GET /api/admin/withdrawals/:id/audit
   */
  static async getAuditLog(req: Request, res: Response) {
    try {
      const withdrawalId = parseInt(req.params.id);

      if (isNaN(withdrawalId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid withdrawal ID'
        });
      }

      const result = await pool.query(
        `SELECT id, withdrawal_id, action, actor_id, actor_type, details, created_at
         FROM withdrawal_audit_log
         WHERE withdrawal_id = $1
         ORDER BY created_at DESC`,
        [withdrawalId]
      );

      return res.status(200).json({
        success: true,
        data: result.rows
      });

    } catch (error: any) {
      console.error('Error fetching audit log:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch audit log',
        error: error.message
      });
    }
  }

  /**
   * Admin: Process a specific approved withdrawal immediately
   * POST /api/admin/withdrawals/:id/process
   */
  static async processWithdrawal(req: Request, res: Response) {
    try {
      const withdrawalId = parseInt(req.params.id);

      if (isNaN(withdrawalId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid withdrawal ID'
        });
      }

      // Check if withdrawal exists and is approved
      const checkResult = await pool.query(
        'SELECT id, status FROM withdrawal_requests WHERE id = $1',
        [withdrawalId]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Withdrawal not found'
        });
      }

      if (checkResult.rows[0].status !== 'approved') {
        return res.status(400).json({
          success: false,
          message: `Cannot process withdrawal with status: ${checkResult.rows[0].status}. Must be approved first.`
        });
      }

      await WithdrawalService.processWithdrawal(withdrawalId);

      return res.status(200).json({
        success: true,
        message: 'Withdrawal processed successfully'
      });

    } catch (error: any) {
      console.error('Error processing withdrawal:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to process withdrawal',
        error: error.message
      });
    }
  }

  /**
   * Admin: Get cron job status
   * GET /api/withdrawals/admin/cron/status
   */
  static async getCronStatus(req: Request, res: Response) {
    try {
      return res.status(200).json({
        success: true,
        data: {
          isRunning: false,
          isScheduled: true,
          schedule: '0 22-23,0-6 * * * (Every hour between 22:00 and 06:00 UTC)',
          currentTime: new Date().toISOString(),
          currentHour: new Date().getUTCHours(),
          message: 'Cron will be activated via PM2 cron or external scheduler'
        }
      });

    } catch (error: any) {
      console.error('Error fetching cron status:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch cron status',
        error: error.message
      });
    }
  }

  /**
   * Admin: Manually trigger withdrawal processing
   * POST /api/withdrawals/admin/cron/trigger
   */
  static async triggerCronManually(req: Request, res: Response) {
    try {
      console.log('[WITHDRAWAL CRON] Manual trigger requested');

      // Process all approved withdrawals
      const result = await WithdrawalService.processPendingWithdrawals();

      return res.status(200).json({
        success: true,
        message: 'Withdrawal processing triggered manually',
        data: result
      });

    } catch (error: any) {
      console.error('Error triggering cron manually:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to trigger withdrawal processing',
        error: error.message
      });
    }
  }
}
