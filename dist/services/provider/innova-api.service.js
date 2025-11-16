"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InnovaApiService = void 0;
const http_retry_service_1 = require("../http/http-retry.service");
const env_1 = require("../../configs/env");
class InnovaApiService {
    /**
     * Initialize the service with custom configuration
     */
    static initialize(config) {
        this.config = Object.assign(Object.assign({}, this.DEFAULT_CONFIG), config);
    }
    /**
     * Generate hash for Innova API requests
     */
    static generateHash(command, timestamp) {
        const crypto = require('crypto');
        return crypto.createHash('sha1')
            .update(command + timestamp + this.config.secretKey)
            .digest('hex');
    }
    /**
     * Generate authorization header
     */
    static generateAuthHeader(command) {
        const crypto = require('crypto');
        return crypto.createHash('sha1')
            .update(command + this.config.secretKey)
            .digest('hex');
    }
    /**
     * Make an authenticated request to Innova API with retry logic
     */
    static async makeRequest(endpoint, data, command) {
        var _b, _c;
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const hash = this.generateHash(command, timestamp);
        const authHeader = this.generateAuthHeader(command);
        const requestData = {
            command,
            data,
            request_timestamp: timestamp,
            hash
        };
        console.log(`[INNOVA_API] Making ${command} request to ${endpoint}:`, {
            timestamp,
            hash: hash.substring(0, 8) + '...',
            data: data
        });
        try {
            const response = await http_retry_service_1.HttpRetryService.post(`${this.config.baseUrl}${endpoint}`, requestData, {
                headers: {
                    'X-Authorization': authHeader,
                    'X-Operator-Id': this.config.operatorId,
                    'X-TT-Operator-Id': this.config.operatorId,
                    'X-Req-Id': `WT${Date.now()}${Math.random().toString(36).substr(2, 4)}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'WT99'
                },
                timeout: this.config.timeout
            }, {
                maxRetries: 3,
                baseDelay: 2000, // 2 seconds for API calls
                maxDelay: 15000, // 15 seconds max
                retryableStatusCodes: [429, 500, 502, 503, 504]
            });
            console.log(`[INNOVA_API] ${command} response:`, response.data);
            return response.data;
        }
        catch (error) {
            console.error(`[INNOVA_API] ${command} request failed:`, {
                status: (_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status,
                message: error === null || error === void 0 ? void 0 : error.message,
                data: (_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data
            });
            throw error;
        }
    }
    /**
     * Authenticate user with Innova
     */
    static async authenticate(token, gameId) {
        const data = { token };
        if (gameId) {
            data.game_id = gameId;
        }
        return this.makeRequest('/innova/authenticate', data, 'authenticate');
    }
    /**
     * Get user balance from Innova
     */
    static async getBalance(token, gameId) {
        const data = { token };
        if (gameId) {
            data.game_id = gameId;
        }
        return this.makeRequest('/innova/balance', data, 'balance');
    }
    /**
     * Change balance (bet/win) with Innova
     */
    static async changeBalance(token, userId, amount, transactionId, gameId, sessionId, currencyCode) {
        const data = {
            token,
            user_id: userId,
            amount,
            transaction_id: transactionId,
            game_id: gameId
        };
        if (sessionId) {
            data.session_id = sessionId;
        }
        if (currencyCode) {
            data.currency_code = currencyCode;
        }
        return this.makeRequest('/innova/changebalance', data, 'changebalance');
    }
    /**
     * Get transaction status from Innova
     */
    static async getStatus(token, transactionId) {
        return this.makeRequest('/innova/status', { token, transaction_id: transactionId }, 'status');
    }
    /**
     * Cancel transaction with Innova
     */
    static async cancel(token, userId, transactionId, roundId, roundFinished, gameId) {
        const data = {
            token,
            user_id: userId,
            transaction_id: transactionId
        };
        if (roundId) {
            data.round_id = roundId;
        }
        if (roundFinished !== undefined) {
            data.round_finished = roundFinished;
        }
        if (gameId) {
            data.game_id = gameId;
        }
        return this.makeRequest('/innova/cancel', data, 'cancel');
    }
    /**
     * Finish round with Innova
     */
    static async finishRound(token, userId, roundId, gameId, sessionId) {
        const data = {
            token,
            user_id: userId,
            round_id: roundId,
            game_id: gameId
        };
        if (sessionId) {
            data.session_id = sessionId;
        }
        return this.makeRequest('/innova/finishround', data, 'finishround');
    }
    /**
     * Ping Innova API
     */
    static async ping() {
        return this.makeRequest('/innova/ping', {}, 'ping');
    }
    /**
     * Get Hand History from Innova API
     * @param transactionId The transaction ID (BIGINT)
     * @param historyId The history ID (STRING) - typically the round ID or session ID
     * @param vendorId The vendor ID (optional, defaults to operator ID)
     */
    static async getHandHistory(transactionId, historyId, vendorId) {
        var _b, _c;
        const crypto = require('crypto');
        const command = 'handHistory';
        const authHeader = crypto.createHash('sha1')
            .update(command + this.config.secretKey)
            .digest('hex');
        const url = `https://run.games378.com/api/generic/handHistory/${transactionId}/${historyId}`;
        console.log(`[INNOVA_API] Getting hand history for transaction ${transactionId}, history ${historyId}`);
        try {
            const response = await http_retry_service_1.HttpRetryService.get(url, {
                headers: {
                    'X-Authorization': authHeader,
                    'X-Operator-Id': this.config.operatorId,
                    'X-Vendor-Id': vendorId || this.config.operatorId,
                    'Content-Type': 'application/json',
                    'User-Agent': 'WT99'
                },
                timeout: this.config.timeout
            }, {
                maxRetries: 3,
                baseDelay: 2000,
                maxDelay: 15000,
                retryableStatusCodes: [429, 500, 502, 503, 504]
            });
            console.log(`[INNOVA_API] Hand history response:`, response.data);
            return response.data;
        }
        catch (error) {
            console.error(`[INNOVA_API] Hand history request failed:`, {
                status: (_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status,
                message: error === null || error === void 0 ? void 0 : error.message,
                data: (_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data
            });
            throw error;
        }
    }
}
exports.InnovaApiService = InnovaApiService;
_a = InnovaApiService;
InnovaApiService.DEFAULT_CONFIG = {
    baseUrl: process.env.INNOVA_API_BASE_URL || 'https://backend.jackpotx.net',
    operatorId: env_1.env.SUPPLIER_OPERATOR_ID,
    secretKey: env_1.env.SUPPLIER_SECRET_KEY,
    timeout: 10000
};
InnovaApiService.config = _a.DEFAULT_CONFIG;
