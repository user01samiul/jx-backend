"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgpxCallbackService = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
const crypto_1 = __importDefault(require("crypto"));
class IgpxCallbackService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!IgpxCallbackService.instance) {
            IgpxCallbackService.instance = new IgpxCallbackService();
        }
        return IgpxCallbackService.instance;
    }
    /**
     * Verify HMAC signature from IGPX webhook
     */
    verifySignature(body, signature, secret) {
        try {
            const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
            const expectedSignature = crypto_1.default
                .createHmac('sha256', secret)
                .update(bodyString)
                .digest('hex');
            return signature === expectedSignature;
        }
        catch (error) {
            console.error('[IGPX] Signature verification error:', error);
            return false;
        }
    }
    /**
     * Get user's current balance
     */
    async getUserBalance(userId, currency) {
        const result = await postgres_1.default.query(`SELECT balance FROM user_profiles WHERE user_id = $1`, [userId]);
        if (result.rows.length === 0) {
            throw new Error(`User ${userId} not found`);
        }
        return parseFloat(result.rows[0].balance) || 0;
    }
    /**
     * Get balance (for IGPX balance check)
     */
    async getBalance(request) {
        try {
            const userId = parseInt(request.user_id);
            // Get user's current balance
            const balance = await this.getUserBalance(userId, request.currency);
            console.log(`[IGPX] Balance check: User ${userId}, Balance: ${balance} ${request.currency}`);
            return {
                error: null,
                balance: balance,
                currency: request.currency
            };
        }
        catch (error) {
            console.error('[IGPX] Balance check error:', error);
            return {
                error: error.message || 'Failed to get balance'
            };
        }
    }
    /**
     * Check if transaction already exists (for idempotency)
     */
    async isTransactionProcessed(transactionId) {
        const result = await postgres_1.default.query(`SELECT id FROM transactions WHERE external_reference = $1 AND metadata->>'igpx_processed' = 'true'`, [transactionId]);
        return result.rows.length > 0;
    }
    /**
     * Process bet transaction (deduct from balance)
     */
    async processBet(request) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            const userId = parseInt(request.user_id);
            // Check for duplicate transaction
            if (await this.isTransactionProcessed(request.transaction_id)) {
                console.log(`[IGPX] Duplicate bet transaction: ${request.transaction_id}`);
                const balance = await this.getUserBalance(userId, request.currency);
                await client.query('COMMIT');
                return {
                    error: null,
                    balance,
                    currency: request.currency,
                    transaction_id: request.transaction_id
                };
            }
            // Verify user exists
            const userResult = await client.query(`SELECT balance FROM user_profiles WHERE user_id = $1 FOR UPDATE`, [userId]);
            if (userResult.rows.length === 0) {
                throw new Error(`User ${userId} not found`);
            }
            const currentBalance = parseFloat(userResult.rows[0].balance);
            // Check sufficient balance
            if (currentBalance < request.amount) {
                throw new Error(`Insufficient balance. Current: ${currentBalance}, Required: ${request.amount}`);
            }
            const newBalance = currentBalance - request.amount;
            // Update balance
            await client.query(`UPDATE user_profiles SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`, [newBalance, userId]);
            // Create transaction record
            await client.query(`INSERT INTO transactions
         (user_id, type, amount, currency, status, description, external_reference, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`, [
                userId,
                'withdrawal',
                request.amount,
                request.currency,
                'completed',
                `IGPX Bet - Transaction ${request.transaction_id}`,
                request.transaction_id,
                JSON.stringify({
                    igpx_action: 'bet',
                    igpx_transaction_id: request.transaction_id,
                    igpx_processed: 'true',
                    balance_before: currentBalance,
                    balance_after: newBalance
                })
            ]);
            await client.query('COMMIT');
            console.log(`[IGPX] Bet processed: User ${userId}, Amount: ${request.amount}, Balance: ${currentBalance} -> ${newBalance}`);
            return {
                error: null,
                balance: newBalance,
                currency: request.currency,
                transaction_id: request.transaction_id
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('[IGPX] Bet processing error:', error);
            return {
                error: error.message || 'Failed to process bet'
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Process result transaction (add to balance)
     */
    async processResult(request) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            const userId = parseInt(request.user_id);
            // Check for duplicate transaction
            if (await this.isTransactionProcessed(request.transaction_id)) {
                console.log(`[IGPX] Duplicate result transaction: ${request.transaction_id}`);
                const balance = await this.getUserBalance(userId, request.currency);
                await client.query('COMMIT');
                return {
                    error: null,
                    balance,
                    currency: request.currency,
                    transaction_id: request.transaction_id
                };
            }
            // Verify user exists and lock the row
            const userResult = await client.query(`SELECT balance FROM user_profiles WHERE user_id = $1 FOR UPDATE`, [userId]);
            if (userResult.rows.length === 0) {
                throw new Error(`User ${userId} not found`);
            }
            const currentBalance = parseFloat(userResult.rows[0].balance);
            const newBalance = currentBalance + request.amount;
            // Update balance
            await client.query(`UPDATE user_profiles SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`, [newBalance, userId]);
            // Create transaction record
            await client.query(`INSERT INTO transactions
         (user_id, type, amount, currency, status, description, external_reference, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`, [
                userId,
                'deposit',
                request.amount,
                request.currency,
                'completed',
                `IGPX Win - Transaction ${request.transaction_id}`,
                request.transaction_id,
                JSON.stringify({
                    igpx_action: 'result',
                    igpx_transaction_id: request.transaction_id,
                    igpx_processed: 'true',
                    balance_before: currentBalance,
                    balance_after: newBalance
                })
            ]);
            await client.query('COMMIT');
            console.log(`[IGPX] Result processed: User ${userId}, Amount: ${request.amount}, Balance: ${currentBalance} -> ${newBalance}`);
            return {
                error: null,
                balance: newBalance,
                currency: request.currency,
                transaction_id: request.transaction_id
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('[IGPX] Result processing error:', error);
            return {
                error: error.message || 'Failed to process result'
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Process rollback transaction (refund)
     */
    async processRollback(request) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            const userId = parseInt(request.user_id);
            // Check for duplicate transaction
            if (await this.isTransactionProcessed(request.transaction_id)) {
                console.log(`[IGPX] Duplicate rollback transaction: ${request.transaction_id}`);
                const balance = await this.getUserBalance(userId, request.currency);
                await client.query('COMMIT');
                return {
                    error: null,
                    balance,
                    currency: request.currency,
                    transaction_id: request.transaction_id
                };
            }
            // Verify the original transaction exists
            if (request.rollback_transaction_id) {
                const originalTxn = await client.query(`SELECT * FROM transactions WHERE external_reference = $1`, [request.rollback_transaction_id]);
                if (originalTxn.rows.length === 0) {
                    console.warn(`[IGPX] Original transaction ${request.rollback_transaction_id} not found for rollback`);
                }
            }
            // Verify user exists and lock the row
            const userResult = await client.query(`SELECT balance FROM user_profiles WHERE user_id = $1 FOR UPDATE`, [userId]);
            if (userResult.rows.length === 0) {
                throw new Error(`User ${userId} not found`);
            }
            const currentBalance = parseFloat(userResult.rows[0].balance);
            const newBalance = currentBalance + request.amount;
            // Update balance (rollback adds the amount back)
            await client.query(`UPDATE user_profiles SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`, [newBalance, userId]);
            // Create transaction record
            await client.query(`INSERT INTO transactions
         (user_id, type, amount, currency, status, description, external_reference, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`, [
                userId,
                'refund',
                request.amount,
                request.currency,
                'completed',
                `IGPX Rollback - Transaction ${request.transaction_id}`,
                request.transaction_id,
                JSON.stringify({
                    igpx_action: 'rollback',
                    igpx_transaction_id: request.transaction_id,
                    igpx_rollback_transaction_id: request.rollback_transaction_id,
                    igpx_processed: 'true',
                    balance_before: currentBalance,
                    balance_after: newBalance
                })
            ]);
            await client.query('COMMIT');
            console.log(`[IGPX] Rollback processed: User ${userId}, Amount: ${request.amount}, Balance: ${currentBalance} -> ${newBalance}`);
            return {
                error: null,
                balance: newBalance,
                currency: request.currency,
                transaction_id: request.transaction_id
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('[IGPX] Rollback processing error:', error);
            return {
                error: error.message || 'Failed to process rollback'
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Process IGPX callback based on action type
     */
    async processCallback(request, signature, secret) {
        // Verify signature
        if (!this.verifySignature(request, signature, secret)) {
            console.error('[IGPX] Invalid signature');
            return { error: 'Invalid security hash' };
        }
        // Validate required fields (transaction_id not required for getBalance)
        if (!request.action || !request.user_id || !request.currency) {
            console.error('[IGPX] Missing required fields:', request);
            return { error: 'Missing required fields in IGPX webhook' };
        }
        // For non-getBalance actions, validate transaction_id and amount
        if (request.action !== 'getBalance') {
            if (!request.transaction_id || request.amount === undefined) {
                console.error('[IGPX] Missing transaction_id or amount for action:', request.action);
                return { error: 'Missing required fields in IGPX webhook' };
            }
        }
        // Process based on action type
        console.log(`[IGPX] Processing ${request.action} callback:`, {
            transaction_id: request.transaction_id,
            user_id: request.user_id,
            amount: request.amount,
            currency: request.currency
        });
        switch (request.action) {
            case 'getBalance':
                return await this.getBalance(request);
            case 'bet':
                return await this.processBet(request);
            case 'result':
                return await this.processResult(request);
            case 'rollback':
                return await this.processRollback(request);
            default:
                return { error: `Unknown IGPX action: ${request.action}` };
        }
    }
}
exports.IgpxCallbackService = IgpxCallbackService;
