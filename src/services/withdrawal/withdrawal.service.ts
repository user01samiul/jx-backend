import pool from '../../db/postgres';
import { PaymentIntegrationService } from '../payment/payment-integration.service';

export interface WithdrawalRequest {
  user_id: number;
  amount: number;
  currency?: string;
  crypto_currency: string;
  crypto_address: string;
  crypto_network?: string;
  crypto_memo?: string;
  gateway_code?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface WithdrawalApproval {
  withdrawal_id: number;
  approved_by: number;
  notes?: string;
}

export interface WithdrawalRejection {
  withdrawal_id: number;
  rejected_by: number;
  rejection_reason: string;
}

export class WithdrawalService {

  /**
   * Get withdrawal settings from database
   */
  static async getSettings(): Promise<Record<string, any>> {
    const result = await pool.query(
      'SELECT setting_key, setting_value, data_type FROM withdrawal_settings'
    );

    const settings: Record<string, any> = {};
    result.rows.forEach(row => {
      let value: any = row.setting_value;

      // Convert based on data type
      switch (row.data_type) {
        case 'number':
          value = parseFloat(value);
          break;
        case 'boolean':
          value = value === 'true' || value === '1';
          break;
        case 'json':
          try {
            value = JSON.parse(value);
          } catch (e) {
            console.error(`Failed to parse JSON setting ${row.setting_key}`);
          }
          break;
      }

      settings[row.setting_key] = value;
    });

    return settings;
  }

  /**
   * Update withdrawal settings
   */
  static async updateSettings(settings: Record<string, any>, updatedBy: number): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const [key, value] of Object.entries(settings)) {
        await client.query(
          `UPDATE withdrawal_settings
           SET setting_value = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
           WHERE setting_key = $3`,
          [String(value), updatedBy, key]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create a new withdrawal request with comprehensive validation
   */
  static async createWithdrawalRequest(request: WithdrawalRequest): Promise<any> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get withdrawal settings
      const settings = await this.getSettings();

      // 1. Validate user exists and get user info
      const userResult = await client.query(
        `SELECT u.id, u.username, u.email, u.status_id, s.name as status_name,
                u.created_at, up.is_verified, up.verification_level,
                COALESCE(ub.balance, 0) as balance
         FROM users u
         LEFT JOIN statuses s ON u.status_id = s.id
         LEFT JOIN user_profiles up ON u.id = up.user_id
         LEFT JOIN user_balances ub ON u.id = ub.user_id
         WHERE u.id = $1`,
        [request.user_id]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // 2. Check user account status
      if (user.status_name !== 'Active') {
        throw new Error('Account is not active. Please contact support.');
      }

      // 3. KYC Verification Check (using is_verified instead of kyc_status)
      if (settings.require_kyc && !user.is_verified) {
        throw new Error('KYC verification required. Please complete identity verification before withdrawal.');
      }

      // 4. Account age check
      const accountAgeHours = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60);
      if (accountAgeHours < settings.min_account_age_hours) {
        throw new Error(`Account must be at least ${settings.min_account_age_hours} hours old before withdrawal. Please wait ${Math.ceil(settings.min_account_age_hours - accountAgeHours)} more hours.`);
      }

      // 5. Check minimum deposit requirement
      const depositResult = await client.query(
        `SELECT COALESCE(SUM(amount), 0) as total_deposits
         FROM transactions
         WHERE user_id = $1 AND type = 'deposit' AND status = 'completed'`,
        [request.user_id]
      );

      if (parseFloat(depositResult.rows[0].total_deposits) < settings.min_deposit_before_withdrawal) {
        throw new Error(`Minimum deposit of $${settings.min_deposit_before_withdrawal} required before withdrawal.`);
      }

      // 6. Amount validation
      if (request.amount < settings.min_withdrawal_amount) {
        throw new Error(`Minimum withdrawal amount is $${settings.min_withdrawal_amount}`);
      }

      if (request.amount > settings.max_withdrawal_amount) {
        throw new Error(`Maximum withdrawal amount is $${settings.max_withdrawal_amount}`);
      }

      // 7. Bonus system check - MUST come before balance check
      // Check for active bonuses and cancel/forfeit them if required
      try {
        const { BonusEngineService } = require('../bonus/bonus-engine.service');
        await BonusEngineService.handleWithdrawal(request.user_id);
        console.log(`[WITHDRAWAL] Bonus check passed for user ${request.user_id}`);
      } catch (bonusError: any) {
        throw new Error(bonusError.message || 'Active bonuses prevent withdrawal. Complete wagering requirements first.');
      }

      // 8. Balance check
      if (parseFloat(user.balance) < request.amount) {
        throw new Error(`Insufficient balance. Available: $${parseFloat(user.balance).toFixed(2)}`);
      }

      // 8. Check pending withdrawals limit
      const pendingResult = await client.query(
        `SELECT COUNT(*) as pending_count
         FROM withdrawal_requests
         WHERE user_id = $1 AND status IN ('pending', 'approved', 'processing')`,
        [request.user_id]
      );

      if (parseInt(pendingResult.rows[0].pending_count) >= settings.max_pending_withdrawals) {
        throw new Error(`Maximum ${settings.max_pending_withdrawals} pending withdrawals allowed. Please wait for current withdrawals to complete.`);
      }

      // 9. Check daily/weekly/monthly limits
      const limitsResult = await client.query(
        `SELECT
           COALESCE(SUM(CASE WHEN requested_at > NOW() - INTERVAL '1 day' THEN amount ELSE 0 END), 0) as daily_total,
           COALESCE(SUM(CASE WHEN requested_at > NOW() - INTERVAL '7 days' THEN amount ELSE 0 END), 0) as weekly_total,
           COALESCE(SUM(CASE WHEN requested_at > NOW() - INTERVAL '30 days' THEN amount ELSE 0 END), 0) as monthly_total
         FROM withdrawal_requests
         WHERE user_id = $1 AND status NOT IN ('rejected', 'cancelled', 'failed')`,
        [request.user_id]
      );

      const limits = limitsResult.rows[0];

      if (parseFloat(limits.daily_total) + request.amount > settings.daily_withdrawal_limit) {
        throw new Error(`Daily withdrawal limit of $${settings.daily_withdrawal_limit} exceeded. Available today: $${(settings.daily_withdrawal_limit - parseFloat(limits.daily_total)).toFixed(2)}`);
      }

      if (parseFloat(limits.weekly_total) + request.amount > settings.weekly_withdrawal_limit) {
        throw new Error(`Weekly withdrawal limit of $${settings.weekly_withdrawal_limit} exceeded.`);
      }

      if (parseFloat(limits.monthly_total) + request.amount > settings.monthly_withdrawal_limit) {
        throw new Error(`Monthly withdrawal limit of $${settings.monthly_withdrawal_limit} exceeded.`);
      }

      // 10. Calculate fees
      const feePercentage = settings.withdrawal_fee_percentage || 0;
      const feeFixed = settings.withdrawal_fee_fixed || 0;
      const feeAmount = (request.amount * feePercentage / 100) + feeFixed;
      const netAmount = request.amount - feeAmount;

      // 11. Perform fraud checks
      const fraudChecks = await this.performFraudChecks(client, request.user_id, request.amount, request.ip_address);

      // 12. Determine auto-approval
      const autoApprove = !fraudChecks.isHighRisk &&
                          request.amount <= settings.auto_approve_limit &&
                          settings.auto_process_enabled;

      const approvalStatus = autoApprove ? 'auto_approved' : 'pending';
      const status = autoApprove ? 'approved' : 'pending';

      // 13. Create withdrawal request
      const withdrawalResult = await client.query(
        `INSERT INTO withdrawal_requests (
          user_id, amount, currency, crypto_currency, crypto_address, crypto_network, crypto_memo,
          fee_amount, net_amount, gateway_code, status, approval_status,
          ip_address, user_agent, risk_score, risk_level, fraud_checks, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *`,
        [
          request.user_id,
          request.amount,
          request.currency || 'USD',
          request.crypto_currency,
          request.crypto_address,
          request.crypto_network || 'TRC20',
          request.crypto_memo,
          feeAmount,
          netAmount,
          request.gateway_code || 'oxapay',
          status,
          approvalStatus,
          request.ip_address,
          request.user_agent,
          fraudChecks.riskScore,
          fraudChecks.riskLevel,
          JSON.stringify(fraudChecks),
          JSON.stringify({ auto_approved: autoApprove })
        ]
      );

      const withdrawal = withdrawalResult.rows[0];

      // 14. Create transaction record
      const transactionResult = await client.query(
        `INSERT INTO transactions (
          user_id, type, amount, currency, status, description, metadata,
          balance_before, balance_after
        ) VALUES ($1, 'withdrawal', $2, $3, 'pending', $4, $5, $6, $7)
        RETURNING id`,
        [
          request.user_id,
          request.amount,
          request.currency || 'USD',
          `Withdrawal to ${request.crypto_address}`,
          JSON.stringify({
            withdrawal_id: withdrawal.id,
            crypto_currency: request.crypto_currency,
            crypto_address: request.crypto_address,
            crypto_network: request.crypto_network,
            fee_amount: feeAmount,
            net_amount: netAmount
          }),
          user.balance,
          parseFloat(user.balance) - request.amount
        ]
      );

      // Link transaction to withdrawal
      await client.query(
        'UPDATE withdrawal_requests SET transaction_id = $1 WHERE id = $2',
        [transactionResult.rows[0].id, withdrawal.id]
      );

      // 15. Deduct balance (lock funds)
      await client.query(
        'UPDATE user_balances SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
        [request.amount, request.user_id]
      );

      // 16. Create audit log
      await this.createAuditLog(client, withdrawal.id, 'created', request.user_id, 'user', null, status, {
        amount: request.amount,
        auto_approved: autoApprove
      }, request.ip_address);

      // 17. If auto-approved and automated processing is enabled, process immediately
      if (autoApprove && this.isWithinAutoProcessHours(settings)) {
        // Process withdrawal through payment gateway
        await this.processWithdrawal(withdrawal.id, client);
      }

      await client.query('COMMIT');

      return {
        success: true,
        withdrawal_id: withdrawal.id,
        status: withdrawal.status,
        approval_status: withdrawal.approval_status,
        amount: withdrawal.amount,
        fee_amount: withdrawal.fee_amount,
        net_amount: withdrawal.net_amount,
        auto_approved: autoApprove,
        message: autoApprove ?
          'Withdrawal request auto-approved and will be processed shortly' :
          'Withdrawal request submitted for review'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Perform comprehensive fraud checks
   */
  private static async performFraudChecks(client: any, userId: number, amount: number, ipAddress?: string): Promise<any> {
    const checks: any = {
      timestamp: new Date().toISOString(),
      checks_performed: []
    };

    let riskScore = 0;

    // Check 1: Multiple withdrawals in short time
    const recentWithdrawals = await client.query(
      `SELECT COUNT(*) as count
       FROM withdrawal_requests
       WHERE user_id = $1 AND requested_at > NOW() - INTERVAL '1 hour'`,
      [userId]
    );

    if (parseInt(recentWithdrawals.rows[0].count) > 2) {
      riskScore += 30;
      checks.checks_performed.push({
        check: 'rapid_withdrawals',
        result: 'suspicious',
        details: 'Multiple withdrawal attempts in short time'
      });
    }

    // Check 2: Large amount compared to deposits
    const depositVsWithdrawal = await client.query(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) as total_deposits,
         COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0) as total_withdrawals
       FROM transactions
       WHERE user_id = $1 AND status = 'completed'`,
      [userId]
    );

    const deposits = parseFloat(depositVsWithdrawal.rows[0].total_deposits);
    const withdrawals = parseFloat(depositVsWithdrawal.rows[0].total_withdrawals);

    if (amount > deposits * 2) {
      riskScore += 40;
      checks.checks_performed.push({
        check: 'withdrawal_exceeds_deposits',
        result: 'high_risk',
        details: `Withdrawal ($${amount}) significantly exceeds total deposits ($${deposits})`
      });
    }

    // Check 3: New IP address
    if (ipAddress) {
      const ipCheck = await client.query(
        `SELECT COUNT(*) as count
         FROM user_sessions
         WHERE user_id = $1 AND ip_address = $2`,
        [userId, ipAddress]
      );

      if (parseInt(ipCheck.rows[0].count) === 0) {
        riskScore += 20;
        checks.checks_performed.push({
          check: 'new_ip_address',
          result: 'medium_risk',
          details: 'Withdrawal from new IP address'
        });
      }
    }

    // Check 4: Check if user has recent suspicious activity
    const suspiciousActivity = await client.query(
      `SELECT COUNT(*) as count
       FROM withdrawal_requests
       WHERE user_id = $1 AND status IN ('rejected', 'failed')
       AND requested_at > NOW() - INTERVAL '7 days'`,
      [userId]
    );

    if (parseInt(suspiciousActivity.rows[0].count) > 2) {
      riskScore += 25;
      checks.checks_performed.push({
        check: 'recent_failed_withdrawals',
        result: 'suspicious',
        details: 'Multiple recent failed withdrawal attempts'
      });
    }

    // Determine risk level
    let riskLevel = 'low';
    if (riskScore >= 70) {
      riskLevel = 'critical';
    } else if (riskScore >= 50) {
      riskLevel = 'high';
    } else if (riskScore >= 30) {
      riskLevel = 'medium';
    }

    return {
      riskScore,
      riskLevel,
      isHighRisk: riskScore >= 50,
      ...checks
    };
  }

  /**
   * Check if current time is within auto-processing hours
   */
  private static isWithinAutoProcessHours(settings: any): boolean {
    const currentHour = new Date().getHours();
    const startHour = settings.auto_process_start_hour || 22;
    const endHour = settings.auto_process_end_hour || 6;

    // Handle overnight range (e.g., 22:00 to 06:00)
    if (startHour > endHour) {
      return currentHour >= startHour || currentHour < endHour;
    }

    return currentHour >= startHour && currentHour < endHour;
  }

  /**
   * Process withdrawal through payment gateway
   */
  static async processWithdrawal(withdrawalId: number, clientConnection?: any): Promise<void> {
    const client = clientConnection || await pool.connect();
    const shouldRelease = !clientConnection;

    try {
      if (!clientConnection) {
        await client.query('BEGIN');
      }

      // Get withdrawal details
      const withdrawalResult = await client.query(
        `SELECT wr.*, u.email, u.username
         FROM withdrawal_requests wr
         JOIN users u ON wr.user_id = u.id
         WHERE wr.id = $1`,
        [withdrawalId]
      );

      if (withdrawalResult.rows.length === 0) {
        throw new Error('Withdrawal not found');
      }

      const withdrawal = withdrawalResult.rows[0];

      if (withdrawal.status !== 'approved') {
        throw new Error('Withdrawal not approved for processing');
      }

      // Update status to processing
      await client.query(
        'UPDATE withdrawal_requests SET status = $1, processed_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['processing', withdrawalId]
      );

      await this.createAuditLog(client, withdrawalId, 'processing', null, 'system', 'approved', 'processing', {
        message: 'Started payment processing'
      });

      // Get gateway configuration
      const gatewayResult = await client.query(
        `SELECT * FROM payment_gateways WHERE code = $1 AND is_active = true`,
        [withdrawal.gateway_code || 'oxapay']
      );

      if (gatewayResult.rows.length === 0) {
        throw new Error('Payment gateway not configured');
      }

      const gateway = gatewayResult.rows[0];
      const gatewayConfig = {
        api_key: gateway.api_key,
        api_secret: gateway.api_secret,
        api_endpoint: gateway.api_endpoint,
        payout_api_key: gateway.payout_api_key,
        config: gateway.config
      };

      // Initialize payment service
      const paymentService = PaymentIntegrationService.getInstance();

      // Use existing conversion from approval (instead of converting again)
      let cryptoAmount: number;
      let exchangeRate: number;

      if (withdrawal.metadata && withdrawal.metadata.conversion) {
        // Use conversion details from approval
        cryptoAmount = withdrawal.metadata.conversion.crypto_amount;
        exchangeRate = withdrawal.metadata.conversion.exchange_rate;

        console.log('[Withdrawal Processing] Using conversion from approval:', {
          usd_amount: withdrawal.net_amount,
          crypto_amount: cryptoAmount,
          currency: withdrawal.crypto_currency,
          exchange_rate: exchangeRate,
          converted_at: withdrawal.metadata.conversion.converted_at
        });
      } else {
        // Fallback: Convert now if not done during approval (for backwards compatibility)

        console.log('[Withdrawal Processing] No existing conversion found, converting now:', {
          usd_amount: withdrawal.net_amount,
          target_currency: withdrawal.crypto_currency
        });

        const conversionResult = await paymentService.convertCurrency(
          withdrawal.gateway_code || 'oxapay',
          gatewayConfig,
          parseFloat(withdrawal.net_amount),
          withdrawal.crypto_currency
        );

        if (!conversionResult.success) {
          throw new Error(`Currency conversion failed: ${conversionResult.message}`);
        }

        cryptoAmount = conversionResult.cryptoAmount!;
        exchangeRate = conversionResult.rate!;

        // Store conversion details
        await client.query(
          `UPDATE withdrawal_requests
           SET metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb
           WHERE id = $2`,
          [
            JSON.stringify({
              conversion: {
                usd_amount: parseFloat(withdrawal.net_amount),
                crypto_amount: cryptoAmount,
                exchange_rate: exchangeRate,
                converted_at: new Date().toISOString()
              }
            }),
            withdrawalId
          ]
        );
      }

      // Process through payment gateway with CRYPTO amount
      const paymentRequest = {
        amount: cryptoAmount!, // Use converted crypto amount, not USD!
        currency: withdrawal.crypto_currency, // Crypto currency (BTC, ETH, USDT, etc.)
        order_id: `WD-${withdrawal.id}-${Date.now()}`,
        customer_email: withdrawal.email,
        customer_name: withdrawal.username,
        description: `Withdrawal #${withdrawal.id}`,
        metadata: {
          address: withdrawal.crypto_address,
          network: withdrawal.crypto_network,
          memo: withdrawal.crypto_memo,
          withdrawal_id: withdrawal.id,
          usd_amount: parseFloat(withdrawal.net_amount),
          exchange_rate: exchangeRate
        }
      };

      const paymentResponse = await paymentService.createWithdrawal(
        withdrawal.gateway_code || 'oxapay',
        gatewayConfig,
        paymentRequest
      );

      if (paymentResponse.success) {
        // Update withdrawal with gateway response
        await client.query(
          `UPDATE withdrawal_requests
           SET gateway_transaction_id = $1,
               gateway_response = $2,
               status = 'completed',
               completed_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [
            paymentResponse.transaction_id,
            JSON.stringify(paymentResponse.gateway_response),
            withdrawalId
          ]
        );

        // Update transaction status
        await client.query(
          `UPDATE transactions
           SET status = 'completed',
               external_reference = $1,
               metadata = metadata || $2::jsonb
           WHERE id = $3`,
          [
            paymentResponse.transaction_id,
            JSON.stringify({ gateway_response: paymentResponse.gateway_response }),
            withdrawal.transaction_id
          ]
        );

        await this.createAuditLog(client, withdrawalId, 'completed', null, 'system', 'processing', 'completed', {
          gateway_transaction_id: paymentResponse.transaction_id,
          message: 'Withdrawal processed successfully'
        });

      } else {
        // Mark as failed
        await client.query(
          `UPDATE withdrawal_requests
           SET status = 'failed',
               gateway_response = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [JSON.stringify(paymentResponse), withdrawalId]
        );

        // Refund balance
        await client.query(
          'UPDATE user_balances SET balance = balance + $1 WHERE user_id = $2',
          [withdrawal.amount, withdrawal.user_id]
        );

        // Update transaction status
        await client.query(
          'UPDATE transactions SET status = $1 WHERE id = $2',
          ['failed', withdrawal.transaction_id]
        );

        await this.createAuditLog(client, withdrawalId, 'failed', null, 'system', 'processing', 'failed', {
          error: paymentResponse.message,
          refunded: true
        });

        // Commit the failed status and refund before throwing error
        if (!clientConnection) {
          await client.query('COMMIT');
        }

        // Throw error so controller returns proper error response
        throw new Error(paymentResponse.message || 'Payment gateway failed to process withdrawal');
      }

      if (!clientConnection) {
        await client.query('COMMIT');
      }

    } catch (error) {
      // If error message indicates payment gateway failure (already handled),
      // don't rollback as we already committed the failed status
      const isPaymentGatewayError = error instanceof Error &&
        error.message.includes('Payment gateway failed to process withdrawal');

      if (!clientConnection && !isPaymentGatewayError) {
        await client.query('ROLLBACK');
      }

      // Mark withdrawal as failed and refund (only if not already done)
      if (!isPaymentGatewayError) {
        try {
        await client.query(
          `UPDATE withdrawal_requests SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [withdrawalId]
        );

        const refundResult = await client.query(
          'SELECT user_id, amount, transaction_id FROM withdrawal_requests WHERE id = $1',
          [withdrawalId]
        );

        if (refundResult.rows.length > 0) {
          const { user_id, amount, transaction_id } = refundResult.rows[0];

          await client.query(
            'UPDATE user_balances SET balance = balance + $1 WHERE user_id = $2',
            [amount, user_id]
          );

          await client.query(
            'UPDATE transactions SET status = $1 WHERE id = $2',
            ['failed', transaction_id]
          );
        }

        if (!clientConnection) {
          await client.query('COMMIT');
        }
      } catch (refundError) {
        console.error('Failed to refund withdrawal:', refundError);
      }
      }

      throw error;
    } finally {
      if (shouldRelease) {
        client.release();
      }
    }
  }

  /**
   * Approve withdrawal manually
   */
  static async approveWithdrawal(approval: WithdrawalApproval): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get withdrawal
      const withdrawalResult = await client.query(
        'SELECT * FROM withdrawal_requests WHERE id = $1',
        [approval.withdrawal_id]
      );

      if (withdrawalResult.rows.length === 0) {
        throw new Error('Withdrawal not found');
      }

      const withdrawal = withdrawalResult.rows[0];

      if (withdrawal.status !== 'pending') {
        throw new Error(`Cannot approve withdrawal with status: ${withdrawal.status}`);
      }

      // Get gateway configuration for conversion
      const gatewayResult = await client.query(
        `SELECT * FROM payment_gateways WHERE code = $1 AND is_active = true`,
        [withdrawal.gateway_code || 'oxapay']
      );

      if (gatewayResult.rows.length === 0) {
        throw new Error('Payment gateway not configured');
      }

      const gateway = gatewayResult.rows[0];
      const gatewayConfig = {
        api_key: gateway.api_key,
        api_secret: gateway.api_secret,
        api_endpoint: gateway.api_endpoint,
        payout_api_key: gateway.payout_api_key,
        config: gateway.config
      };

      // Convert USD to crypto amount at approval time
      const paymentService = PaymentIntegrationService.getInstance();

      console.log('[Withdrawal Approval] Converting USD to crypto:', {
        usd_amount: withdrawal.net_amount,
        target_currency: withdrawal.crypto_currency,
        gateway: withdrawal.gateway_code
      });

      const conversionResult = await paymentService.convertCurrency(
        withdrawal.gateway_code || 'oxapay',
        gatewayConfig,
        parseFloat(withdrawal.net_amount),
        withdrawal.crypto_currency
      );

      if (!conversionResult.success) {
        throw new Error(`Currency conversion failed: ${conversionResult.message}`);
      }

      const cryptoAmount = conversionResult.cryptoAmount;
      const exchangeRate = conversionResult.rate;

      console.log('[Withdrawal Approval] Conversion successful:', {
        usd_amount: withdrawal.net_amount,
        crypto_amount: cryptoAmount,
        currency: withdrawal.crypto_currency,
        exchange_rate: exchangeRate
      });

      // Update withdrawal with conversion details
      await client.query(
        `UPDATE withdrawal_requests
         SET status = 'approved',
             approval_status = 'manually_approved',
             approved_by = $1,
             approved_at = CURRENT_TIMESTAMP,
             notes = $2,
             metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [
          approval.approved_by,
          approval.notes,
          JSON.stringify({
            conversion: {
              usd_amount: parseFloat(withdrawal.net_amount),
              crypto_amount: cryptoAmount,
              exchange_rate: exchangeRate,
              converted_at: new Date().toISOString()
            }
          }),
          approval.withdrawal_id
        ]
      );

      await this.createAuditLog(
        client,
        approval.withdrawal_id,
        'approved',
        approval.approved_by,
        'admin',
        'pending',
        'approved',
        {
          notes: approval.notes,
          conversion: {
            usd_amount: parseFloat(withdrawal.net_amount),
            crypto_amount: cryptoAmount,
            exchange_rate: exchangeRate,
            currency: withdrawal.crypto_currency
          }
        }
      );

      // Get settings to check if we should process immediately
      const settings = await this.getSettings();

      if (settings.auto_process_enabled && this.isWithinAutoProcessHours(settings)) {
        await this.processWithdrawal(approval.withdrawal_id, client);
      }

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reject withdrawal
   */
  static async rejectWithdrawal(rejection: WithdrawalRejection): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get withdrawal
      const withdrawalResult = await client.query(
        'SELECT * FROM withdrawal_requests WHERE id = $1',
        [rejection.withdrawal_id]
      );

      if (withdrawalResult.rows.length === 0) {
        throw new Error('Withdrawal not found');
      }

      const withdrawal = withdrawalResult.rows[0];

      if (withdrawal.status === 'completed') {
        throw new Error('Cannot reject completed withdrawal');
      }

      // Update withdrawal
      await client.query(
        `UPDATE withdrawal_requests
         SET status = 'rejected',
             approval_status = 'rejected',
             rejected_by = $1,
             rejected_at = CURRENT_TIMESTAMP,
             rejection_reason = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [rejection.rejected_by, rejection.rejection_reason, rejection.withdrawal_id]
      );

      // Refund balance
      await client.query(
        'UPDATE user_balances SET balance = balance + $1 WHERE user_id = $2',
        [withdrawal.amount, withdrawal.user_id]
      );

      // Update transaction
      await client.query(
        'UPDATE transactions SET status = $1 WHERE id = $2',
        ['cancelled', withdrawal.transaction_id]
      );

      await this.createAuditLog(
        client,
        rejection.withdrawal_id,
        'rejected',
        rejection.rejected_by,
        'admin',
        withdrawal.status,
        'rejected',
        {
          rejection_reason: rejection.rejection_reason,
          refunded: true
        }
      );

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get withdrawals with filters
   */
  static async getWithdrawals(filters: any = {}): Promise<any[]> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];

    if (filters.user_id) {
      params.push(filters.user_id);
      conditions.push(`wr.user_id = $${params.length}`);
    }

    if (filters.status) {
      params.push(filters.status);
      conditions.push(`wr.status = $${params.length}`);
    }

    if (filters.approval_status) {
      params.push(filters.approval_status);
      conditions.push(`wr.approval_status = $${params.length}`);
    }

    if (filters.from_date) {
      params.push(filters.from_date);
      conditions.push(`wr.requested_at >= $${params.length}`);
    }

    if (filters.to_date) {
      params.push(filters.to_date);
      conditions.push(`wr.requested_at <= $${params.length}`);
    }

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const result = await pool.query(
      `SELECT wr.id, wr.user_id, wr.amount, wr.currency, wr.status, wr.approval_status,
              wr.crypto_currency as payment_method,
              wr.crypto_address as wallet_address,
              wr.crypto_network, wr.crypto_memo,
              wr.fee_amount, wr.net_amount, wr.gateway_code, wr.gateway_transaction_id,
              wr.notes as admin_notes, wr.rejection_reason,
              wr.risk_score, wr.risk_level,
              wr.metadata,
              wr.requested_at, wr.processed_at, wr.completed_at,
              wr.created_at, wr.updated_at,
              u.username, u.email,
              approver.username as approved_by_username,
              rejector.username as rejected_by_username
       FROM withdrawal_requests wr
       JOIN users u ON wr.user_id = u.id
       LEFT JOIN users approver ON wr.approved_by = approver.id
       LEFT JOIN users rejector ON wr.rejected_by = rejector.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY wr.requested_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return result.rows;
  }

  /**
   * Get withdrawal statistics
   */
  static async getStatistics(filters: any = {}): Promise<any> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];

    if (filters.from_date) {
      params.push(filters.from_date);
      conditions.push(`requested_at >= $${params.length}`);
    }

    if (filters.to_date) {
      params.push(filters.to_date);
      conditions.push(`requested_at <= $${params.length}`);
    }

    const result = await pool.query(
      `SELECT
         COUNT(*) as total_withdrawals,
         COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
         COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
         COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_count,
         COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
         COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
         COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
         COALESCE(SUM(amount), 0) as total_amount,
         COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as completed_amount,
         COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
         COALESCE(SUM(CASE WHEN status = 'processing' THEN amount ELSE 0 END), 0) as processing_amount,
         COALESCE(SUM(fee_amount), 0) as total_fees,
         COUNT(CASE WHEN approval_status = 'auto_approved' THEN 1 END) as auto_approved_count,
         COUNT(CASE WHEN approval_status = 'manually_approved' THEN 1 END) as manually_approved_count
       FROM withdrawal_requests
       WHERE ${conditions.join(' AND ')}`,
      params
    );

    return result.rows[0];
  }

  /**
   * Get dashboard statistics with month-over-month comparison
   */
  static async getDashboardStatistics(): Promise<any> {
    // Current month stats
    const currentResult = await pool.query(`
      SELECT
        COUNT(*) as total_payouts,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN status = 'processing' THEN amount ELSE 0 END), 0) as processing_amount,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as completed_amount
      FROM withdrawal_requests
    `);

    // Last month stats for comparison
    const lastMonthResult = await pool.query(`
      SELECT COUNT(*) as total_payouts
      FROM withdrawal_requests
      WHERE requested_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
        AND requested_at < DATE_TRUNC('month', NOW())
    `);

    // This month stats
    const thisMonthResult = await pool.query(`
      SELECT COUNT(*) as total_payouts
      FROM withdrawal_requests
      WHERE requested_at >= DATE_TRUNC('month', NOW())
    `);

    // Recent payouts (last 10)
    const recentResult = await pool.query(`
      SELECT
        wr.id,
        wr.amount,
        wr.status,
        wr.crypto_currency as payment_method,
        wr.crypto_address,
        wr.metadata,
        wr.requested_at,
        wr.completed_at,
        u.username,
        u.email,
        CONCAT(LEFT(u.username, 1), RIGHT(u.username, 1)) as initials
      FROM withdrawal_requests wr
      JOIN users u ON wr.user_id = u.id
      ORDER BY wr.requested_at DESC
      LIMIT 10
    `);

    const current = currentResult.rows[0];
    const lastMonth = parseInt(lastMonthResult.rows[0].total_payouts) || 0;
    const thisMonth = parseInt(thisMonthResult.rows[0].total_payouts) || 0;

    // Calculate month-over-month percentage change
    const monthChange = lastMonth > 0
      ? ((thisMonth - lastMonth) / lastMonth * 100).toFixed(1)
      : thisMonth > 0 ? '100' : '0';

    return {
      cards: {
        total_payouts: {
          count: parseInt(current.total_payouts),
          change_percent: parseFloat(monthChange),
          change_label: 'from last month'
        },
        pending: {
          count: parseInt(current.pending_count),
          amount: parseFloat(current.pending_amount)
        },
        processing: {
          count: parseInt(current.processing_count),
          amount: parseFloat(current.processing_amount)
        },
        completed: {
          count: parseInt(current.completed_count),
          amount: parseFloat(current.completed_amount)
        }
      },
      recent_payouts: recentResult.rows.map(row => ({
        id: row.id,
        username: row.username,
        email: row.email,
        initials: row.initials,
        payment_method: row.payment_method,
        amount: parseFloat(row.amount),
        status: row.status,
        crypto_address: row.crypto_address,
        requested_at: row.requested_at,
        completed_at: row.completed_at
      }))
    };
  }

  /**
   * Process pending approved withdrawals (for cron job)
   */
  static async processPendingWithdrawals(): Promise<any> {
    const client = await pool.connect();

    try {
      // Get settings
      const settings = await this.getSettings();

      if (!settings.auto_process_enabled) {
        return {
          success: false,
          message: 'Automated processing is disabled'
        };
      }

      if (!this.isWithinAutoProcessHours(settings)) {
        return {
          success: false,
          message: 'Outside of automated processing hours'
        };
      }

      // Get approved withdrawals that haven't been processed yet
      const withdrawalsResult = await client.query(
        `SELECT id FROM withdrawal_requests
         WHERE status = 'approved'
         AND processed_at IS NULL
         ORDER BY requested_at ASC
         LIMIT 50`
      );

      const results = {
        processed: 0,
        failed: 0,
        errors: []
      };

      for (const row of withdrawalsResult.rows) {
        try {
          await this.processWithdrawal(row.id);
          results.processed++;
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            withdrawal_id: row.id,
            error: error.message
          });
        }
      }

      return {
        success: true,
        ...results,
        message: `Processed ${results.processed} withdrawals, ${results.failed} failed`
      };

    } finally {
      client.release();
    }
  }

  /**
   * Get payment method statistics (crypto currencies breakdown)
   */
  static async getPaymentMethodStats(): Promise<any[]> {
    const result = await pool.query(`
      SELECT
        crypto_currency as payment_method,
        COUNT(*) as transaction_count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM withdrawal_requests
      WHERE status IN ('pending', 'approved', 'processing', 'completed')
      GROUP BY crypto_currency
      ORDER BY total_amount DESC
    `);

    // Calculate total for percentage calculation
    const total = result.rows.reduce((sum, row) => sum + parseFloat(row.total_amount), 0);

    return result.rows.map(row => ({
      payment_method: row.payment_method,
      transaction_count: parseInt(row.transaction_count),
      total_amount: parseFloat(row.total_amount),
      percentage: total > 0 ? parseFloat(((parseFloat(row.total_amount) / total) * 100).toFixed(1)) : 0
    }));
  }

  /**
   * Create audit log entry
   */
  private static async createAuditLog(
    client: any,
    withdrawalId: number,
    action: string,
    actorId: number | null,
    actorType: string,
    oldStatus?: string | null,
    newStatus?: string | null,
    details?: any,
    ipAddress?: string
  ): Promise<void> {
    await client.query(
      `INSERT INTO withdrawal_audit_log (
        withdrawal_id, action, actor_id, actor_type, old_status, new_status, details, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        withdrawalId,
        action,
        actorId,
        actorType,
        oldStatus,
        newStatus,
        details ? JSON.stringify(details) : null,
        ipAddress
      ]
    );
  }
}
