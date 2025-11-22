"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCryptoConversion = exports.getTransactionHistory = exports.handleWebhook = exports.checkPaymentStatus = exports.createDeposit = void 0;
const payment_integration_service_1 = require("../../services/payment/payment-integration.service");
const payment_gateway_service_1 = require("../../services/admin/payment-gateway.service");
const postgres_1 = __importDefault(require("../../db/postgres"));
const user_activity_service_1 = require("../../services/user/user-activity.service");
const paymentService = payment_integration_service_1.PaymentIntegrationService.getInstance();
const createDeposit = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const { gateway_code, amount, currency, description } = req.body;
        if (!gateway_code || !amount || !currency) {
            res.status(400).json({
                success: false,
                message: "Gateway code, amount, and currency are required"
            });
            return;
        }
        // Get gateway configuration from database
        const gatewayConfig = await (0, payment_gateway_service_1.getPaymentGatewayByCodeService)(gateway_code);
        if (!gatewayConfig || !gatewayConfig.is_active) {
            res.status(400).json({
                success: false,
                message: `Payment gateway ${gateway_code} is not available`
            });
            return;
        }
        // Validate currency is supported
        if (!gatewayConfig.supported_currencies.includes(currency)) {
            res.status(400).json({
                success: false,
                message: `Currency ${currency} is not supported by ${gateway_code}`
            });
            return;
        }
        // Validate amount limits
        const numAmount = parseFloat(amount);
        if (numAmount < parseFloat(gatewayConfig.min_amount) ||
            numAmount > parseFloat(gatewayConfig.max_amount)) {
            res.status(400).json({
                success: false,
                message: `Amount must be between ${gatewayConfig.min_amount} and ${gatewayConfig.max_amount}`
            });
            return;
        }
        // Convert crypto amount to USD for balance tracking
        let usdAmount;
        let exchangeRate;
        // Convert crypto amount to USD using the proper deposit conversion function
        console.log(`[DEPOSIT] Converting ${numAmount} ${currency} to USD...`);
        const conversionResult = await paymentService.convertCryptoToUSD(gateway_code, {
            api_key: gatewayConfig.api_key,
            api_secret: gatewayConfig.api_secret,
            api_endpoint: gatewayConfig.api_endpoint,
            config: gatewayConfig.config
        }, numAmount, currency);
        if (!conversionResult.success) {
            res.status(400).json({
                success: false,
                message: `Failed to get exchange rate for ${currency}: ${conversionResult.message}`
            });
            return;
        }
        usdAmount = conversionResult.usdAmount;
        exchangeRate = conversionResult.rate || 1;
        console.log(`[DEPOSIT] Converted ${numAmount} ${currency} to $${usdAmount} USD (rate: ${exchangeRate})`);
        // Create transaction record
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            const transactionResult = await client.query(`INSERT INTO transactions (user_id, type, amount, currency, status, description, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`, [
                userId,
                'deposit',
                usdAmount, // Store USD amount for balance
                'USD', // Always USD for balance tracking
                'pending',
                description || `Deposit via ${gateway_code}`,
                JSON.stringify({
                    gateway_code,
                    gateway_id: gatewayConfig.id,
                    crypto_amount: numAmount,
                    crypto_currency: currency,
                    exchange_rate: exchangeRate,
                    converted_at: new Date().toISOString()
                })
            ]);
            const transactionId = transactionResult.rows[0].id;
            const orderId = `deposit_${transactionId}_${Date.now()}`;
            // Create payment request with CRYPTO amount (Oxapay processes crypto)
            const paymentRequest = {
                amount: numAmount, // Crypto amount for payment gateway
                currency, // Crypto currency (BTC, USDT, etc.)
                order_id: orderId,
                description: description || `Deposit $${usdAmount.toFixed(2)} USD (${numAmount} ${currency})`,
                return_url: `${req.protocol}://${req.get('host')}/payment/success`,
                cancel_url: `${req.protocol}://${req.get('host')}/payment/cancel`,
                metadata: {
                    user_id: userId,
                    transaction_id: transactionId,
                    gateway_code,
                    usd_amount: usdAmount,
                    crypto_amount: numAmount,
                    crypto_currency: currency,
                    exchange_rate: exchangeRate
                }
            };
            // Create payment via gateway
            const paymentResponse = await paymentService.createPayment(gateway_code, {
                api_key: gatewayConfig.api_key,
                api_secret: gatewayConfig.api_secret,
                api_endpoint: gatewayConfig.api_endpoint,
                webhook_url: gatewayConfig.webhook_url,
                webhook_secret: gatewayConfig.webhook_secret,
                config: gatewayConfig.config
            }, paymentRequest);
            if (!paymentResponse.success) {
                throw new Error(paymentResponse.message);
            }
            // Update transaction with gateway response
            await client.query(`UPDATE transactions 
         SET reference_id = $1, external_reference = $2, metadata = $3
         WHERE id = $4`, [
                orderId,
                paymentResponse.transaction_id,
                JSON.stringify({
                    ...JSON.parse(transactionResult.rows[0].metadata || '{}'),
                    gateway_response: paymentResponse.gateway_response,
                    payment_url: paymentResponse.payment_url
                }),
                transactionId
            ]);
            // Log activity
            await (0, user_activity_service_1.logUserActivity)({
                userId,
                action: "create_deposit",
                category: "financial",
                description: `Created deposit: $${usdAmount.toFixed(2)} USD (${numAmount} ${currency})`,
                metadata: {
                    transaction_id: transactionId,
                    gateway_code,
                    crypto_amount: numAmount,
                    crypto_currency: currency,
                    usd_amount: usdAmount,
                    exchange_rate: exchangeRate
                }
            });
            await client.query('COMMIT');
            res.json({
                success: true,
                message: "Deposit created successfully",
                data: {
                    transaction_id: transactionId,
                    order_id: orderId,
                    payment_url: paymentResponse.payment_url,
                    gateway_transaction_id: paymentResponse.transaction_id,
                    crypto_amount: numAmount,
                    crypto_currency: currency,
                    usd_amount: usdAmount,
                    exchange_rate: exchangeRate,
                    gateway_code,
                    status: 'pending'
                }
            });
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    catch (err) {
        next(err);
    }
};
exports.createDeposit = createDeposit;
const checkPaymentStatus = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const { transaction_id } = req.params;
        // Get transaction details
        const transactionResult = await postgres_1.default.query(`SELECT t.*, pg.code as gateway_code, pg.api_key, pg.api_secret, pg.api_endpoint, pg.webhook_url, pg.webhook_secret, pg.config
       FROM transactions t
       LEFT JOIN payment_gateways pg ON t.metadata->>'gateway_code' = pg.code
       WHERE t.id = $1 AND t.user_id = $2`, [transaction_id, userId]);
        if (transactionResult.rows.length === 0) {
            res.status(404).json({ success: false, message: "Transaction not found" });
            return;
        }
        const transaction = transactionResult.rows[0];
        const gatewayCode = transaction.gateway_code;
        if (!gatewayCode) {
            res.status(400).json({ success: false, message: "No payment gateway found for this transaction" });
            return;
        }
        // Check status via gateway
        const statusResponse = await paymentService.checkPaymentStatus(gatewayCode, {
            api_key: transaction.api_key,
            api_secret: transaction.api_secret,
            api_endpoint: transaction.api_endpoint,
            webhook_url: transaction.webhook_url,
            webhook_secret: transaction.webhook_secret,
            config: transaction.config
        }, transaction.external_reference);
        // Update transaction status if changed
        if (statusResponse.success && statusResponse.status !== transaction.status) {
            await postgres_1.default.query(`UPDATE transactions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [statusResponse.status, transaction_id]);
            // If payment completed, update user balance using BalanceService
            if (statusResponse.status === 'completed' && transaction.status !== 'completed') {
                try {
                    // Import BalanceService
                    const { BalanceService } = require('../../services/user/balance.service');
                    // Extract crypto details from metadata
                    const metadata = JSON.parse(transaction.metadata || '{}');
                    const cryptoAmount = metadata.crypto_amount || transaction.amount;
                    const cryptoCurrency = metadata.crypto_currency || transaction.currency;
                    const usdAmount = transaction.amount; // Transaction amount is stored in USD
                    const exchangeRate = metadata.exchange_rate || 1;
                    console.log(`[STATUS_CHECK] Processing crypto deposit:`, {
                        user_id: userId,
                        crypto_amount: cryptoAmount,
                        crypto_currency: cryptoCurrency,
                        usd_amount: usdAmount,
                        exchange_rate: exchangeRate
                    });
                    // Process the deposit using BalanceService (with USD amount)
                    const balanceResult = await BalanceService.processDeposit(userId, usdAmount, // USD amount for balance
                    `Deposit of ${cryptoAmount} ${cryptoCurrency} ($${usdAmount.toFixed(2)} USD) completed`, statusResponse.transaction_id, {
                        gateway_code: gatewayCode,
                        status_check: true,
                        original_transaction_id: transaction_id,
                        crypto_amount: cryptoAmount,
                        crypto_currency: cryptoCurrency,
                        exchange_rate: exchangeRate
                    });
                    // Log successful deposit
                    await (0, user_activity_service_1.logUserActivity)({
                        userId,
                        action: "deposit_completed",
                        category: "financial",
                        description: `Deposit of ${cryptoAmount} ${cryptoCurrency} ($${usdAmount.toFixed(2)} USD) completed`,
                        metadata: {
                            transaction_id,
                            gateway_code: gatewayCode,
                            balance_transaction_id: balanceResult.transaction_id,
                            balance_before: balanceResult.balance_before,
                            balance_after: balanceResult.balance_after,
                            crypto_amount: cryptoAmount,
                            crypto_currency: cryptoCurrency,
                            usd_amount: usdAmount,
                            exchange_rate: exchangeRate
                        }
                    });
                    console.log(`[STATUS_CHECK] Crypto deposit completed for user ${userId}:`, {
                        crypto: `${cryptoAmount} ${cryptoCurrency}`,
                        usd: `$${usdAmount.toFixed(2)}`,
                        balance_before: `$${balanceResult.balance_before}`,
                        balance_after: `$${balanceResult.balance_after}`
                    });
                }
                catch (error) {
                    console.error(`[STATUS_CHECK] Error updating balance for user ${userId}:`, error);
                    // Don't fail the status check, just log the error
                }
            }
        }
        res.json({
            success: true,
            data: {
                transaction_id: parseInt(transaction_id),
                status: statusResponse.status,
                amount: statusResponse.amount || transaction.amount,
                currency: statusResponse.currency || transaction.currency,
                gateway_response: statusResponse.gateway_response
            }
        });
    }
    catch (err) {
        next(err);
    }
};
exports.checkPaymentStatus = checkPaymentStatus;
const handleWebhook = async (req, res, next) => {
    try {
        const { gateway_code } = req.params;
        const webhookData = req.body;
        const signature = req.headers['x-signature'] || req.headers['x-security-hash'] || req.headers['authorization'];
        console.log(`[WEBHOOK] Received webhook for gateway: ${gateway_code}`);
        console.log(`[WEBHOOK] Headers:`, req.headers);
        console.log(`[WEBHOOK] Body:`, JSON.stringify(webhookData, null, 2));
        // Get gateway configuration
        const gatewayConfig = await (0, payment_gateway_service_1.getPaymentGatewayByCodeService)(gateway_code);
        if (!gatewayConfig) {
            res.status(400).json({ success: false, message: "Invalid gateway" });
            return;
        }
        // Handle IGPX sportsbook callbacks separately (bet/result/rollback)
        if (gateway_code.toLowerCase() === 'igpx') {
            const { IgpxCallbackService } = require('../../services/payment/igpx-callback.service');
            const igpxService = IgpxCallbackService.getInstance();
            const result = await igpxService.processCallback(webhookData, signature, gatewayConfig.webhook_secret || gatewayConfig.api_secret);
            // Return IGPX-specific response format
            res.status(result.error ? 400 : 200).json(result);
            return;
        }
        // Process webhook
        const webhookResult = await paymentService.processWebhook(gateway_code, {
            api_key: gatewayConfig.api_key,
            api_secret: gatewayConfig.api_secret,
            api_endpoint: gatewayConfig.api_endpoint,
            webhook_url: gatewayConfig.webhook_url,
            webhook_secret: gatewayConfig.webhook_secret,
            config: gatewayConfig.config
        }, webhookData, signature);
        console.log(`[WEBHOOK] Processed webhook result:`, JSON.stringify(webhookResult, null, 2));
        // Find transaction by multiple possible fields
        let transactionResult = await postgres_1.default.query(`SELECT * FROM transactions WHERE reference_id = $1 OR external_reference = $1`, [webhookResult.transaction_id]);
        if (transactionResult.rows.length === 0) {
            // Try to find by gateway transaction ID in metadata
            transactionResult = await postgres_1.default.query(`SELECT * FROM transactions WHERE metadata->>'gateway_response'->>'id' = $1 OR metadata->>'gateway_response'->>'invoice_id' = $1`, [webhookResult.transaction_id]);
        }
        if (transactionResult.rows.length === 0) {
            console.error(`[WEBHOOK] Transaction not found for gateway_code: ${gateway_code}, transaction_id: ${webhookResult.transaction_id}`);
            console.error(`[WEBHOOK] Webhook data:`, JSON.stringify(webhookData, null, 2));
            res.status(404).json({ success: false, message: "Transaction not found" });
            return;
        }
        const transaction = transactionResult.rows[0];
        // Update transaction status
        await postgres_1.default.query(`UPDATE transactions 
       SET status = $1, metadata = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`, [
            webhookResult.status,
            JSON.stringify({
                ...JSON.parse(transaction.metadata || '{}'),
                webhook_data: webhookResult.gateway_data,
                webhook_processed_at: new Date().toISOString()
            }),
            transaction.id
        ]);
        // If payment completed, update user balance using BalanceService
        if (webhookResult.status === 'completed' && transaction.status !== 'completed') {
            try {
                // Import BalanceService
                const { BalanceService } = require('../../services/user/balance.service');
                if (transaction.type === 'deposit') {
                    // Extract crypto details from metadata
                    const metadata = JSON.parse(transaction.metadata || '{}');
                    const cryptoAmount = metadata.crypto_amount || webhookResult.amount;
                    const cryptoCurrency = metadata.crypto_currency || webhookResult.currency;
                    const usdAmount = transaction.amount; // Transaction amount is stored in USD
                    const exchangeRate = metadata.exchange_rate || 1;
                    console.log(`[WEBHOOK] Processing crypto deposit:`, {
                        user_id: transaction.user_id,
                        crypto_amount: cryptoAmount,
                        crypto_currency: cryptoCurrency,
                        usd_amount: usdAmount,
                        exchange_rate: exchangeRate
                    });
                    // Process the deposit using BalanceService (with USD amount)
                    const balanceResult = await BalanceService.processDeposit(transaction.user_id, usdAmount, // USD amount for balance
                    `Deposit of ${cryptoAmount} ${cryptoCurrency} ($${usdAmount.toFixed(2)} USD) completed`, webhookResult.transaction_id, {
                        gateway_code,
                        webhook_data: webhookResult.gateway_data,
                        original_transaction_id: transaction.id,
                        crypto_amount: cryptoAmount,
                        crypto_currency: cryptoCurrency,
                        exchange_rate: exchangeRate
                    });
                    // Log successful deposit
                    await (0, user_activity_service_1.logUserActivity)({
                        userId: transaction.user_id,
                        action: "deposit_completed",
                        category: "financial",
                        description: `Deposit of ${cryptoAmount} ${cryptoCurrency} ($${usdAmount.toFixed(2)} USD) completed`,
                        metadata: {
                            transaction_id: transaction.id,
                            gateway_code,
                            balance_transaction_id: balanceResult.transaction_id,
                            balance_before: balanceResult.balance_before,
                            balance_after: balanceResult.balance_after,
                            crypto_amount: cryptoAmount,
                            crypto_currency: cryptoCurrency,
                            usd_amount: usdAmount,
                            exchange_rate: exchangeRate
                        }
                    });
                    console.log(`[WEBHOOK] Crypto deposit completed for user ${transaction.user_id}:`, {
                        crypto: `${cryptoAmount} ${cryptoCurrency}`,
                        usd: `$${usdAmount.toFixed(2)}`,
                        balance_before: `$${balanceResult.balance_before}`,
                        balance_after: `$${balanceResult.balance_after}`
                    });
                }
                else if (transaction.type === 'withdrawal') {
                    // For withdrawals, we don't need to update balance again since it was already deducted when created
                    // Just log the successful withdrawal
                    await (0, user_activity_service_1.logUserActivity)({
                        userId: transaction.user_id,
                        action: "withdrawal_completed",
                        category: "financial",
                        description: `Withdrawal of ${transaction.currency} ${transaction.amount} completed via webhook`,
                        metadata: {
                            transaction_id: transaction.id,
                            gateway_code,
                            webhook_data: webhookResult.gateway_data
                        }
                    });
                    console.log(`[WEBHOOK] Withdrawal completed successfully for user ${transaction.user_id}: ${transaction.amount} ${transaction.currency}`);
                }
            }
            catch (error) {
                console.error(`[WEBHOOK] Error processing ${transaction.type} for user ${transaction.user_id}:`, error);
                // Don't fail the webhook, just log the error
            }
        }
        else if (webhookResult.status === 'failed' && transaction.status !== 'failed') {
            // Handle failed transactions
            if (transaction.type === 'withdrawal') {
                // For failed withdrawals, we need to refund the user's balance
                try {
                    const { BalanceService } = require('../../services/user/balance.service');
                    const balanceResult = await BalanceService.processTransaction({
                        user_id: transaction.user_id,
                        type: 'refund',
                        amount: transaction.amount,
                        currency: transaction.currency,
                        description: `Withdrawal refund - ${transaction.currency} ${transaction.amount} refunded due to failed withdrawal via ${gateway_code}`,
                        external_reference: webhookResult.transaction_id,
                        metadata: {
                            gateway_code,
                            original_transaction_id: transaction.id,
                            refund_reason: 'withdrawal_failed',
                            webhook_data: webhookResult.gateway_data
                        }
                    });
                    await (0, user_activity_service_1.logUserActivity)({
                        userId: transaction.user_id,
                        action: "withdrawal_failed_refund",
                        category: "financial",
                        description: `Withdrawal failed, refunded ${transaction.currency} ${transaction.amount}`,
                        metadata: {
                            transaction_id: transaction.id,
                            gateway_code,
                            refund_transaction_id: balanceResult.transaction_id,
                            balance_before: balanceResult.balance_before,
                            balance_after: balanceResult.balance_after
                        }
                    });
                    console.log(`[WEBHOOK] Withdrawal failed, refunded user ${transaction.user_id}: ${balanceResult.balance_before} -> ${balanceResult.balance_after}`);
                }
                catch (error) {
                    console.error(`[WEBHOOK] Error refunding failed withdrawal for user ${transaction.user_id}:`, error);
                }
            }
        }
        res.json({ success: true, message: "Webhook processed successfully" });
    }
    catch (err) {
        next(err);
    }
};
exports.handleWebhook = handleWebhook;
const getTransactionHistory = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const type = req.query.type;
        let query = `
      SELECT t.*, pg.name as gateway_name, pg.code as gateway_code
      FROM transactions t
      LEFT JOIN payment_gateways pg ON t.metadata->>'gateway_code' = pg.code
      WHERE t.user_id = $1
    `;
        const params = [userId];
        if (type) {
            query += ` AND t.type = $2`;
            params.push(type);
        }
        query += ` ORDER BY t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
        const result = await postgres_1.default.query(query, params);
        res.json({
            success: true,
            data: result.rows,
            pagination: {
                limit,
                offset,
                total: result.rows.length
            }
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getTransactionHistory = getTransactionHistory;
const rateCache = new Map();
const CACHE_TTL = 60000; // 60 seconds
// Currency decimal places mapping
const CRYPTO_DECIMALS = {
    'BTC': 8,
    'ETH': 8,
    'LTC': 8,
    'BCH': 8,
    'XRP': 6,
    'TRX': 6,
    'BNB': 8,
    'SOL': 9,
    'DOGE': 8,
    'XMR': 12,
    'TON': 9,
    'NOT': 9,
    'POL': 18,
    'SHIB': 18,
    'DOGS': 9,
    'USDT': 2,
    'USDC': 2,
    'DAI': 2
};
/**
 * GET /api/payment/crypto-conversion
 * Convert crypto amount to USD
 */
const getCryptoConversion = async (req, res, next) => {
    try {
        const { currency, amount } = req.query;
        // Validation
        if (!currency || !amount) {
            res.status(400).json({
                success: false,
                message: 'Currency and amount are required'
            });
            return;
        }
        const cryptoCurrency = currency.toUpperCase();
        const cryptoAmount = parseFloat(amount);
        if (isNaN(cryptoAmount) || cryptoAmount <= 0) {
            res.status(400).json({
                success: false,
                message: 'Amount must be a positive number'
            });
            return;
        }
        // Check if rate is cached and fresh
        const cached = rateCache.get(cryptoCurrency);
        const now = Date.now();
        let exchangeRate;
        if (cached && (now - cached.timestamp) < CACHE_TTL) {
            // Use cached rate
            exchangeRate = cached.rate;
            console.log(`[Crypto Conversion] Using cached rate for ${cryptoCurrency}: $${exchangeRate}`);
        }
        else {
            // Fetch fresh rate using payment service
            const gatewayConfig = {
                api_key: '',
                api_secret: '',
                api_endpoint: '',
                payout_api_key: '',
                config: {}
            };
            const conversionResult = await paymentService.convertCryptoToUSD('oxapay', gatewayConfig, cryptoAmount, cryptoCurrency);
            if (!conversionResult.success || !conversionResult.rate) {
                res.status(500).json({
                    success: false,
                    message: 'Failed to fetch conversion rate',
                    error: conversionResult.message || 'Unknown error'
                });
                return;
            }
            exchangeRate = conversionResult.rate;
            // Cache the rate
            rateCache.set(cryptoCurrency, {
                rate: exchangeRate,
                timestamp: now
            });
            console.log(`[Crypto Conversion] Fetched fresh rate for ${cryptoCurrency}: $${exchangeRate}`);
        }
        // Calculate USD amount
        const usdAmount = cryptoAmount * exchangeRate;
        // Get decimal places for this currency
        const cryptoDecimals = CRYPTO_DECIMALS[cryptoCurrency] || 8;
        res.json({
            success: true,
            data: {
                currency: cryptoCurrency,
                crypto_amount: cryptoAmount,
                usd_amount: parseFloat(usdAmount.toFixed(2)),
                exchange_rate: exchangeRate,
                crypto_decimals: cryptoDecimals,
                timestamp: new Date().toISOString(),
                cached: cached && (now - cached.timestamp) < CACHE_TTL
            }
        });
    }
    catch (err) {
        console.error('[Crypto Conversion] Error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch conversion rate',
            error: err.message || 'Unknown error'
        });
    }
};
exports.getCryptoConversion = getCryptoConversion;
