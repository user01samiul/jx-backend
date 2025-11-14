import { HttpRetryService } from '../http/http-retry.service';
import { env } from '../../configs/env';

export interface InnovaApiConfig {
  baseUrl: string;
  operatorId: string;
  secretKey: string;
  timeout: number;
}

export interface InnovaAuthenticateRequest {
  command: string;
  data: {
    token: string;
  };
  request_timestamp: string;
  hash: string;
}

export interface InnovaAuthenticateResponse {
  status: string;
  response_timestamp: string;
  hash: string;
  data: {
    user_id: string;
    username: string;
    balance: number;
    currency_code: string;
  };
}

export class InnovaApiService {
  private static readonly DEFAULT_CONFIG: InnovaApiConfig = {
    baseUrl: process.env.INNOVA_API_BASE_URL || 'https://backend.jackpotx.net',
    operatorId: env.SUPPLIER_OPERATOR_ID,
    secretKey: env.SUPPLIER_SECRET_KEY,
    timeout: 10000
  };

  private static config: InnovaApiConfig = this.DEFAULT_CONFIG;

  /**
   * Initialize the service with custom configuration
   */
  static initialize(config?: Partial<InnovaApiConfig>): void {
    this.config = { ...this.DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate hash for Innova API requests
   */
  private static generateHash(command: string, timestamp: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha1')
      .update(command + timestamp + this.config.secretKey)
      .digest('hex');
  }

  /**
   * Generate authorization header
   */
  private static generateAuthHeader(command: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha1')
      .update(command + this.config.secretKey)
      .digest('hex');
  }

  /**
   * Make an authenticated request to Innova API with retry logic
   */
  private static async makeRequest<T>(
    endpoint: string,
    data: any,
    command: string
  ): Promise<T> {
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
      const response = await HttpRetryService.post<T>(
        `${this.config.baseUrl}${endpoint}`,
        requestData,
        {
          headers: {
            'X-Authorization': authHeader,
            'X-Operator-Id': this.config.operatorId,
            'X-TT-Operator-Id': this.config.operatorId,
            'X-Req-Id': `WT${Date.now()}${Math.random().toString(36).substr(2, 4)}`,
            'Content-Type': 'application/json',
            'User-Agent': 'WT99'
          },
          timeout: this.config.timeout
        },
        {
          maxRetries: 3,
          baseDelay: 2000, // 2 seconds for API calls
          maxDelay: 15000, // 15 seconds max
          retryableStatusCodes: [429, 500, 502, 503, 504]
        }
      );

      console.log(`[INNOVA_API] ${command} response:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`[INNOVA_API] ${command} request failed:`, {
        status: error?.response?.status,
        message: error?.message,
        data: error?.response?.data
      });
      throw error;
    }
  }

  /**
   * Authenticate user with Innova
   */
  static async authenticate(token: string, gameId?: number): Promise<InnovaAuthenticateResponse> {
    const data: any = { token };
    if (gameId) {
      data.game_id = gameId;
    }

    return this.makeRequest<InnovaAuthenticateResponse>(
      '/innova/authenticate',
      data,
      'authenticate'
    );
  }

  /**
   * Get user balance from Innova
   */
  static async getBalance(token: string, gameId?: number): Promise<any> {
    const data: any = { token };
    if (gameId) {
      data.game_id = gameId;
    }

    return this.makeRequest(
      '/innova/balance',
      data,
      'balance'
    );
  }

  /**
   * Change balance (bet/win) with Innova
   */
  static async changeBalance(
    token: string,
    userId: string,
    amount: number,
    transactionId: string,
    gameId: number,
    sessionId?: string,
    currencyCode?: string
  ): Promise<any> {
    const data: any = {
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

    return this.makeRequest(
      '/innova/changebalance',
      data,
      'changebalance'
    );
  }

  /**
   * Get transaction status from Innova
   */
  static async getStatus(token: string, transactionId: string): Promise<any> {
    return this.makeRequest(
      '/innova/status',
      { token, transaction_id: transactionId },
      'status'
    );
  }

  /**
   * Cancel transaction with Innova
   */
  static async cancel(
    token: string,
    userId: string,
    transactionId: string,
    roundId?: string,
    roundFinished?: boolean,
    gameId?: number
  ): Promise<any> {
    const data: any = {
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

    return this.makeRequest(
      '/innova/cancel',
      data,
      'cancel'
    );
  }

  /**
   * Finish round with Innova
   */
  static async finishRound(
    token: string,
    userId: string,
    roundId: string,
    gameId: number,
    sessionId?: string
  ): Promise<any> {
    const data: any = {
      token,
      user_id: userId,
      round_id: roundId,
      game_id: gameId
    };

    if (sessionId) {
      data.session_id = sessionId;
    }

    return this.makeRequest(
      '/innova/finishround',
      data,
      'finishround'
    );
  }

  /**
   * Ping Innova API
   */
  static async ping(): Promise<any> {
    return this.makeRequest(
      '/innova/ping',
      {},
      'ping'
    );
  }

  /**
   * Get Hand History from Innova API
   * @param transactionId The transaction ID (BIGINT)
   * @param historyId The history ID (STRING) - typically the round ID or session ID
   * @param vendorId The vendor ID (optional, defaults to operator ID)
   */
  static async getHandHistory(
    transactionId: number | string,
    historyId: string,
    vendorId?: string
  ): Promise<any> {
    const crypto = require('crypto');
    const command = 'handHistory';
    const authHeader = crypto.createHash('sha1')
      .update(command + this.config.secretKey)
      .digest('hex');

    const url = `https://run.games378.com/api/generic/handHistory/${transactionId}/${historyId}`;

    console.log(`[INNOVA_API] Getting hand history for transaction ${transactionId}, history ${historyId}`);

    try {
      const response = await HttpRetryService.get<any>(
        url,
        {
          headers: {
            'X-Authorization': authHeader,
            'X-Operator-Id': this.config.operatorId,
            'X-Vendor-Id': vendorId || this.config.operatorId,
            'Content-Type': 'application/json',
            'User-Agent': 'WT99'
          },
          timeout: this.config.timeout
        },
        {
          maxRetries: 3,
          baseDelay: 2000,
          maxDelay: 15000,
          retryableStatusCodes: [429, 500, 502, 503, 504]
        }
      );

      console.log(`[INNOVA_API] Hand history response:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`[INNOVA_API] Hand history request failed:`, {
        status: error?.response?.status,
        message: error?.message,
        data: error?.response?.data
      });
      throw error;
    }
  }
} 