import pool from "../../db/postgres";

export interface PaymentGatewayConfig {
  api_key: string;
  api_secret: string;
  api_endpoint: string;
  merchant_id?: string;
  payout_api_key?: string;
  webhook_url?: string;
  webhook_secret?: string;
  config?: Record<string, any>;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  order_id: string;
  customer_email?: string;
  customer_name?: string;
  description?: string;
  return_url?: string;
  cancel_url?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  transaction_id?: string;
  payment_url?: string;
  redirect_url?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  message?: string;
  gateway_response?: any;
  fees?: number;
}

export interface PaymentStatusResponse {
  success: boolean;
  transaction_id: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  amount?: number;
  currency?: string;
  fees?: number;
  gateway_response?: any;
  message?: string;
}

export interface WebhookData {
  success: boolean;
  transaction_id: string;
  status: 'completed' | 'failed' | 'pending';
  amount?: number;
  currency?: string;
  type?: 'deposit' | 'withdrawal';
  user_id?: string;
  message?: string;
  gateway_data?: any;
  metadata?: Record<string, any>;
}

export class PaymentIntegrationService {
  private static instance: PaymentIntegrationService;
  private gatewayHandlers: Map<string, any> = new Map();
  private webhookHandlers: Map<string, any> = new Map();

  private constructor() {
    this.initializeGatewayHandlers();
    this.initializeWebhookHandlers();
  }

  public static getInstance(): PaymentIntegrationService {
    if (!PaymentIntegrationService.instance) {
      PaymentIntegrationService.instance = new PaymentIntegrationService();
    }
    return PaymentIntegrationService.instance;
  }

  private initializeGatewayHandlers() {
    // Register different payment gateway handlers
    this.gatewayHandlers.set('stripe', this.handleStripePayment.bind(this));
    this.gatewayHandlers.set('paypal', this.handlePayPalPayment.bind(this));
    this.gatewayHandlers.set('razorpay', this.handleRazorpayPayment.bind(this));
    this.gatewayHandlers.set('crypto', this.handleCryptoPayment.bind(this));
    this.gatewayHandlers.set('oxapay', this.handleOxapayPayment.bind(this));
    this.gatewayHandlers.set('igpx', this.handleIgpxPayment.bind(this));
  }

  private initializeWebhookHandlers() {
    this.webhookHandlers.set('stripe', this.handleStripeWebhook.bind(this));
    this.webhookHandlers.set('paypal', this.handlePayPalWebhook.bind(this));
    this.webhookHandlers.set('razorpay', this.handleRazorpayWebhook.bind(this));
    this.webhookHandlers.set('crypto', this.handleCryptoWebhook.bind(this));
    this.webhookHandlers.set('oxapay', this.handleOxapayWebhook.bind(this));
    this.webhookHandlers.set('igpx', this.handleIgpxWebhook.bind(this));
  }

  async createPayment(gatewayCode: string, config: PaymentGatewayConfig, request: PaymentRequest): Promise<PaymentResponse> {
    const handler = this.gatewayHandlers.get(gatewayCode.toLowerCase());
    if (!handler) {
      return {
        success: false,
        status: 'failed',
        message: `Unsupported payment gateway: ${gatewayCode}`,
      };
    }

    try {
      return await handler(config, request);
    } catch (error) {
      return {
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Payment creation failed',
      };
    }
  }

  async createWithdrawal(gatewayCode: string, config: PaymentGatewayConfig, request: PaymentRequest): Promise<PaymentResponse> {
    if (gatewayCode.toLowerCase() === 'oxapay') {
      return await this.handleOxapayWithdrawal(config, request);
    }

    return {
      success: false,
      status: 'failed',
      message: `Withdrawal not supported for gateway: ${gatewayCode}`,
    };
  }

  async convertCurrency(gatewayCode: string, config: PaymentGatewayConfig, usdAmount: number, targetCurrency: string): Promise<{ success: boolean; cryptoAmount?: number; rate?: number; message?: string }> {
    if (gatewayCode.toLowerCase() === 'oxapay') {
      return await this.convertUSDToCrypto(config, usdAmount, targetCurrency);
    }

    return {
      success: false,
      message: `Currency conversion not supported for gateway: ${gatewayCode}`,
    };
  }

  async convertCryptoToUSD(gatewayCode: string, config: PaymentGatewayConfig, cryptoAmount: number, cryptoCurrency: string): Promise<{ success: boolean; usdAmount?: number; rate?: number; message?: string }> {
    if (gatewayCode.toLowerCase() === 'oxapay') {
      return await this.convertCryptoToUSDInternal(config, cryptoAmount, cryptoCurrency);
    }

    return {
      success: false,
      message: `Currency conversion not supported for gateway: ${gatewayCode}`,
    };
  }

  async checkPaymentStatus(gatewayCode: string, config: PaymentGatewayConfig, transactionId: string): Promise<PaymentStatusResponse> {
    const handler = this.gatewayHandlers.get(gatewayCode.toLowerCase());
    if (!handler) {
      return {
        success: false,
        transaction_id: transactionId,
        status: 'failed',
        message: `Unsupported payment gateway: ${gatewayCode}`,
      };
    }

    try {
      return await this.checkStatusHandler(gatewayCode, config, transactionId);
    } catch (error) {
      return {
        success: false,
        transaction_id: transactionId,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Status check failed',
      };
    }
  }

  async testGatewayConnection(gatewayCode: string, config: PaymentGatewayConfig): Promise<{ success: boolean; message: string }> {
    const handler = this.gatewayHandlers.get(gatewayCode.toLowerCase());
    if (!handler) {
      return {
        success: false,
        message: `Unsupported payment gateway: ${gatewayCode}`,
      };
    }

    try {
      return await this.testConnectionHandler(gatewayCode, config);
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }

  async processWebhook(gatewayCode: string, config: PaymentGatewayConfig, data: any, signature?: string): Promise<WebhookData> {
    const handler = this.webhookHandlers.get(gatewayCode.toLowerCase());
    if (!handler) {
      throw new Error(`Unsupported webhook gateway: ${gatewayCode}`);
    }

    try {
      return await handler(config, data, signature);
    } catch (error) {
      throw new Error(`Webhook processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Stripe Payment Handler
  private async handleStripePayment(config: PaymentGatewayConfig, request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const stripe = require('stripe')(config.api_secret);
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: request.currency.toLowerCase(),
            product_data: {
              name: request.description || 'Payment',
            },
            unit_amount: Math.round(request.amount * 100), // Stripe uses cents
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: request.return_url || `${config.config?.success_url}`,
        cancel_url: request.cancel_url || `${config.config?.cancel_url}`,
        metadata: {
          order_id: request.order_id,
          ...request.metadata,
        },
      });

      return {
        success: true,
        transaction_id: session.id,
        payment_url: session.url,
        status: 'pending',
        gateway_response: session,
      };
    } catch (error) {
      return {
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Stripe payment creation failed',
      };
    }
  }

  // PayPal Payment Handler
  private async handlePayPalPayment(config: PaymentGatewayConfig, request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const paypal = require('@paypal/checkout-server-sdk');
      const environment = config.config?.sandbox_mode ? 
        new paypal.core.SandboxEnvironment(config.api_key, config.api_secret) :
        new paypal.core.LiveEnvironment(config.api_key, config.api_secret);
      
      const client = new paypal.core.PayPalHttpClient(environment);
      
      const request_paypal = new paypal.orders.OrdersCreateRequest();
      request_paypal.prefer("return=representation");
      request_paypal.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: request.currency,
            value: request.amount.toString(),
          },
          description: request.description || 'Payment',
          custom_id: request.order_id,
        }],
        application_context: {
          return_url: request.return_url,
          cancel_url: request.cancel_url,
        },
      });

      const order = await client.execute(request_paypal);
      
      const approvalUrl = order.result.links.find((link: any) => link.rel === 'approve')?.href;

      return {
        success: true,
        transaction_id: order.result.id,
        payment_url: approvalUrl,
        status: 'pending',
        gateway_response: order.result,
      };
    } catch (error) {
      return {
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'PayPal payment creation failed',
      };
    }
  }

  // Razorpay Payment Handler
  private async handleRazorpayPayment(config: PaymentGatewayConfig, request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const Razorpay = require('razorpay');
      const razorpay = new Razorpay({
        key_id: config.api_key,
        key_secret: config.api_secret,
      });

      const options = {
        amount: Math.round(request.amount * 100), // Razorpay uses paise
        currency: request.currency,
        receipt: request.order_id,
        notes: {
          description: request.description || 'Payment',
          ...request.metadata,
        },
        callback_url: request.return_url,
        cancel_url: request.cancel_url,
      };

      const order = await razorpay.orders.create(options);

      return {
        success: true,
        transaction_id: order.id,
        payment_url: `${config.config?.payment_url || 'https://checkout.razorpay.com/v1/checkout.html'}?key=${config.api_key}&amount=${options.amount}&currency=${options.currency}&order_id=${order.id}`,
        status: 'pending',
        gateway_response: order,
      };
    } catch (error) {
      return {
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Razorpay payment creation failed',
      };
    }
  }

  // Crypto Payment Handler (Example with Coinbase Commerce)
  private async handleCryptoPayment(config: PaymentGatewayConfig, request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const { Client, resources } = require('coinbase-commerce-node');
      const client = new Client({ apiKey: config.api_key });

      const charge = await client.charges.create({
        name: request.description || 'Payment',
        description: request.description || 'Payment',
        local_price: {
          amount: request.amount.toString(),
          currency: request.currency,
        },
        pricing_type: 'fixed_price',
        metadata: {
          order_id: request.order_id,
          ...request.metadata,
        },
        redirect_url: request.return_url,
        cancel_url: request.cancel_url,
      });

      return {
        success: true,
        transaction_id: charge.id,
        payment_url: charge.hosted_url,
        status: 'pending',
        gateway_response: charge,
      };
    } catch (error) {
      return {
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Crypto payment creation failed',
      };
    }
  }

  // Oxapay Payment Handler (Official API: https://docs.oxapay.com/api-reference/creating-an-invoice)
  private async handleOxapayPayment(config: PaymentGatewayConfig, request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const axios = require('axios');

      console.log('[Oxapay] Creating invoice with request:', {
        amount: request.amount,
        currency: request.currency,
        order_id: request.order_id,
        endpoint: `${config.api_endpoint}/payment/invoice`
      });

      // Official Oxapay API endpoint
      const endpoint = `${config.api_endpoint}/payment/invoice`;

      // Build request body according to official Oxapay API docs
      const requestBody: any = {
        amount: request.amount,
        currency: request.currency,
        order_id: request.order_id,
        description: request.description || 'Deposit',
      };

      // Add optional parameters if provided
      if (config.webhook_url) {
        requestBody.callback_url = config.webhook_url;
      }
      if (request.return_url) {
        requestBody.return_url = request.return_url;
      }
      if (request.customer_email) {
        requestBody.email = request.customer_email;
      }
      if (config.config?.invoice_lifetime) {
        requestBody.lifetime = config.config.invoice_lifetime; // Minutes (15-2880, default: 60)
      }
      if (config.config?.fee_paid_by_payer !== undefined) {
        requestBody.fee_paid_by_payer = config.config.fee_paid_by_payer; // 0 or 1
      }
      if (config.config?.under_paid_coverage !== undefined) {
        requestBody.under_paid_coverage = config.config.under_paid_coverage; // 0-60.00
      }

      console.log('[Oxapay] Request body:', JSON.stringify(requestBody, null, 2));

      const res = await axios.post(
        endpoint,
        requestBody,
        {
          headers: {
            'merchant_api_key': config.api_key, // Use api_key directly (not merchant_id)
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      console.log('[Oxapay] Response:', JSON.stringify(res.data, null, 2));

      // Check if response is successful
      if (!res.data || res.data.status !== 200) {
        throw new Error(res.data?.message || 'Oxapay API returned non-200 status');
      }

      // Extract payment details from response
      const trackId = res.data.data?.track_id;
      const paymentUrl = res.data.data?.payment_url;

      if (!trackId || !paymentUrl) {
        throw new Error('Invalid Oxapay response: missing track_id or payment_url');
      }

      return {
        success: true,
        transaction_id: trackId,
        payment_url: paymentUrl,
        status: 'pending',
        gateway_response: res.data,
      };
    } catch (error: any) {
      console.error('[Oxapay] Payment creation error:', {
        message: error?.response?.data?.message || error.message,
        status: error?.response?.status,
        data: error?.response?.data,
        error: error?.response?.data?.error
      });

      // Extract the specific error message from Oxapay response
      const errorMessage =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error.message ||
        'Oxapay payment creation failed';

      return {
        success: false,
        status: 'failed',
        message: errorMessage,
        gateway_response: error?.response?.data,
      };
    }
  }

  // Currency Conversion using CoinGecko API (Free, no API key needed)
  private async convertUSDToCrypto(config: PaymentGatewayConfig, usdAmount: number, targetCurrency: string): Promise<{ success: boolean; cryptoAmount?: number; rate?: number; message?: string }> {
    try {
      const axios = require('axios');

      // Stablecoins don't need conversion (1:1 with USD)
      const stablecoins = ['USDT', 'USDC', 'BUSD', 'DAI', 'USDD'];
      if (stablecoins.includes(targetCurrency.toUpperCase())) {
        console.log('[Conversion] No conversion needed for stablecoin:', targetCurrency);
        return {
          success: true,
          cryptoAmount: usdAmount,
          rate: 1.0
        };
      }

      console.log('[Conversion] Converting USD to crypto:', {
        usd_amount: usdAmount,
        target_currency: targetCurrency
      });

      // Map crypto symbols to CoinGecko IDs
      const currencyMap: { [key: string]: string } = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'LTC': 'litecoin',
        'BCH': 'bitcoin-cash',
        'XRP': 'ripple',
        'TRX': 'tron',
        'BNB': 'binancecoin',
        'ADA': 'cardano',
        'SOL': 'solana',
        'DOT': 'polkadot',
        'DOGE': 'dogecoin',
        'MATIC': 'matic-network',
        'SHIB': 'shiba-inu',
        'AVAX': 'avalanche-2',
        'UNI': 'uniswap',
        'LINK': 'chainlink',
        'XLM': 'stellar',
        'ATOM': 'cosmos',
        'ETC': 'ethereum-classic',
        'XMR': 'monero',
        'TON': 'the-open-network',
        'DAI': 'dai',
        'USDT': 'tether',
        'USDC': 'usd-coin'
      };

      const coinId = currencyMap[targetCurrency.toUpperCase()];
      if (!coinId) {
        throw new Error(`Unsupported currency: ${targetCurrency}. Please contact support to add this currency.`);
      }

      // Use CoinGecko API (Free, no API key needed)
      // Rate limit: 10-50 calls/minute on free tier
      const endpoint = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;

      console.log('[Conversion] Fetching rate from CoinGecko:', endpoint);

      const res = await axios.get(endpoint, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json'
        }
      });

      console.log('[Conversion] CoinGecko response:', JSON.stringify(res.data, null, 2));

      // Extract price
      const cryptoPrice = res.data?.[coinId]?.usd;

      if (!cryptoPrice || cryptoPrice <= 0) {
        throw new Error(`Failed to get price for ${targetCurrency} from CoinGecko`);
      }

      // Calculate crypto amount: USD amount / crypto price in USD
      const cryptoAmount = usdAmount / cryptoPrice;

      // Determine precision based on crypto value
      let precision = 8; // Default for most cryptos
      if (cryptoPrice >= 1000) {
        precision = 6; // BTC, ETH (high value coins)
      } else if (cryptoPrice >= 1) {
        precision = 4; // Mid-range coins
      } else if (cryptoPrice >= 0.01) {
        precision = 2; // Low value coins
      }

      const roundedAmount = parseFloat(cryptoAmount.toFixed(precision));

      console.log('[Conversion] Conversion successful:', {
        usd_amount: usdAmount,
        crypto_price: cryptoPrice,
        crypto_amount: roundedAmount,
        currency: targetCurrency,
        precision: precision
      });

      return {
        success: true,
        cryptoAmount: roundedAmount,
        rate: cryptoPrice
      };

    } catch (error: any) {
      console.error('[Conversion] Conversion error:', {
        message: error?.response?.data?.message || error.message,
        status: error?.response?.status,
        data: error?.response?.data
      });

      // Fallback error message
      const errorMessage = error?.response?.data?.status?.error_message ||
        error?.response?.data?.error ||
        error.message ||
        'Currency conversion failed';

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  // Convert Crypto to USD for deposits (opposite of convertUSDToCrypto)
  private async convertCryptoToUSDInternal(config: PaymentGatewayConfig, cryptoAmount: number, cryptoCurrency: string): Promise<{ success: boolean; usdAmount?: number; rate?: number; message?: string }> {
    try {
      const axios = require('axios');

      // Stablecoins are 1:1 with USD
      const stablecoins = ['USDT', 'USDC', 'BUSD', 'DAI', 'USDD'];
      if (stablecoins.includes(cryptoCurrency.toUpperCase())) {
        console.log('[Conversion] No conversion needed for stablecoin:', cryptoCurrency);
        return {
          success: true,
          usdAmount: cryptoAmount,
          rate: 1.0
        };
      }

      console.log('[Conversion] Converting crypto to USD:', {
        crypto_amount: cryptoAmount,
        crypto_currency: cryptoCurrency
      });

      // Map crypto symbols to CoinGecko IDs
      const currencyMap: { [key: string]: string } = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'LTC': 'litecoin',
        'BCH': 'bitcoin-cash',
        'XRP': 'ripple',
        'TRX': 'tron',
        'BNB': 'binancecoin',
        'ADA': 'cardano',
        'SOL': 'solana',
        'DOT': 'polkadot',
        'DOGE': 'dogecoin',
        'MATIC': 'matic-network',
        'SHIB': 'shiba-inu',
        'AVAX': 'avalanche-2',
        'UNI': 'uniswap',
        'LINK': 'chainlink',
        'XLM': 'stellar',
        'ATOM': 'cosmos',
        'ETC': 'ethereum-classic',
        'XMR': 'monero',
        'TON': 'the-open-network',
        'DAI': 'dai',
        'USDT': 'tether',
        'USDC': 'usd-coin'
      };

      const coinId = currencyMap[cryptoCurrency.toUpperCase()];
      if (!coinId) {
        throw new Error(`Unsupported currency: ${cryptoCurrency}. Please contact support to add this currency.`);
      }

      // Use CoinGecko API (Free, no API key needed)
      const endpoint = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;

      console.log('[Conversion] Fetching rate from CoinGecko:', endpoint);

      const res = await axios.get(endpoint, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json'
        }
      });

      console.log('[Conversion] CoinGecko response:', JSON.stringify(res.data, null, 2));

      // Extract price (price of 1 crypto in USD)
      const cryptoPrice = res.data?.[coinId]?.usd;

      if (!cryptoPrice || cryptoPrice <= 0) {
        throw new Error(`Failed to get price for ${cryptoCurrency} from CoinGecko`);
      }

      // Calculate USD amount: crypto amount × crypto price in USD
      const usdAmount = cryptoAmount * cryptoPrice;

      // Round to 2 decimal places for USD
      const roundedUSD = parseFloat(usdAmount.toFixed(2));

      console.log('[Conversion] Conversion successful:', {
        crypto_amount: cryptoAmount,
        crypto_currency: cryptoCurrency,
        crypto_price: cryptoPrice,
        usd_amount: roundedUSD
      });

      return {
        success: true,
        usdAmount: roundedUSD,
        rate: cryptoPrice  // Price of 1 crypto in USD
      };

    } catch (error: any) {
      console.error('[Conversion] Crypto to USD conversion error:', {
        message: error?.response?.data?.message || error.message,
        status: error?.response?.status,
        data: error?.response?.data
      });

      const errorMessage = error?.response?.data?.status?.error_message ||
        error?.response?.data?.error ||
        error.message ||
        'Crypto to USD conversion failed';

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  // Oxapay Withdrawal Handler (Payout API: https://docs.oxapay.com/api-reference/creating-payout)
  private async handleOxapayWithdrawal(config: PaymentGatewayConfig, request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const axios = require('axios');

      // Validate required metadata
      if (!request.metadata?.address) {
        throw new Error('Withdrawal address is required in metadata.address');
      }

      console.log('[Oxapay] Creating payout with request:', {
        address: request.metadata.address,
        amount: request.amount,
        currency: request.currency,
        network: request.metadata?.network || config.config?.network || 'TRC20',
        has_payout_key: !!config.payout_api_key
      });

      // IMPORTANT: request.amount should already be in crypto currency at this point
      // The conversion from USD to crypto should happen BEFORE calling this method

      // Oxapay Official Payout API Endpoint
      const endpoint = config.config?.payout_api_endpoint || 'https://api.oxapay.com/v1/payout';

      const requestBody: any = {
        address: request.metadata.address,
        amount: request.amount, // This MUST be in crypto currency amount
        currency: request.currency, // This MUST be crypto currency code (BTC, ETH, USDT, etc.)
        network: request.metadata?.network || config.config?.network || 'TRC20',
        description: request.description || 'Withdrawal',
      };

      // Add memo if provided (required for some currencies like XRP, XLM)
      if (request.metadata?.memo) {
        requestBody.memo = request.metadata.memo;
      }

      console.log('[Oxapay] Payout request body:', JSON.stringify(requestBody, null, 2));

      const res = await axios.post(
        endpoint,
        requestBody,
        {
          headers: {
            'payout_api_key': config.payout_api_key || config.api_key, // Use payout_api_key if available
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      console.log('[Oxapay] Payout response:', JSON.stringify(res.data, null, 2));

      // Check if response is successful
      if (!res.data || res.data.status !== 200) {
        throw new Error(res.data?.message || 'Oxapay API returned non-200 status');
      }

      return {
        success: true,
        transaction_id: res.data.data?.track_id || res.data.data?.payout_id || request.order_id,
        payment_url: undefined, // Payouts don't have payment URLs
        status: 'pending',
        gateway_response: res.data,
      };
    } catch (error: any) {
      console.error('[Oxapay] Payout error:', {
        message: error?.response?.data?.message || error.message,
        status: error?.response?.status,
        data: error?.response?.data,
        error: error?.response?.data?.error
      });

      // Extract the specific error message from Oxapay response
      const errorMessage =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error.message ||
        'Oxapay payout creation failed';

      return {
        success: false,
        status: 'failed',
        message: errorMessage,
        gateway_response: error?.response?.data,
      };
    }
  }

  // IGPX Sportsbook Payment Handler
  private async handleIgpxPayment(config: PaymentGatewayConfig, request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const axios = require('axios');

      console.log('[IGPX] Creating session with request:', {
        user_id: request.metadata?.user_id,
        currency: request.currency,
        language: request.metadata?.language,
        order_id: request.order_id
      });

      // Step 1: Authenticate to get token
      const authResponse = await axios.post(`${config.api_endpoint}/auth`, {
        username: config.api_key, // CLIENT_USERNAME
        password: config.api_secret // CLIENT_PASSWORD
      });

      if (!authResponse.data.token) {
        throw new Error('Failed to authenticate with IGPX');
      }

      const token = authResponse.data.token;
      const expiresIn = authResponse.data.expires_in;

      console.log('[IGPX] Authentication successful');

      // Step 2: Start session to get play URL
      // Note: Callback URL is configured once on IGPX's side, not passed per session
      const sessionData = {
        user_id: request.metadata?.user_id?.toString() || request.order_id,
        currency: request.currency,
        lang: request.metadata?.language || 'en'
      };

      console.log('[IGPX] Starting session with data:', sessionData);

      const sessionResponse = await axios.post(`${config.api_endpoint}/start-session`, sessionData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('[IGPX] Session response:', sessionResponse.data);

      if (!sessionResponse.data.url) {
        throw new Error('Failed to create IGPX session');
      }

      return {
        success: true,
        transaction_id: request.order_id,
        payment_url: sessionResponse.data.url,
        status: 'pending',
        gateway_response: {
          token: token,
          expires_in: expiresIn,
          session_data: sessionResponse.data
        },
      };
    } catch (error: any) {
      return {
        success: false,
        status: 'failed',
        message: error?.response?.data?.message || error.message || 'IGPX payment creation failed',
        gateway_response: error?.response?.data,
      };
    }
  }

  // Status check handlers
  private async checkStatusHandler(gatewayCode: string, config: PaymentGatewayConfig, transactionId: string): Promise<PaymentStatusResponse> {
    switch (gatewayCode.toLowerCase()) {
      case 'stripe':
        return await this.checkStripeStatus(config, transactionId);
      case 'paypal':
        return await this.checkPayPalStatus(config, transactionId);
      case 'razorpay':
        return await this.checkRazorpayStatus(config, transactionId);
      case 'crypto':
        return await this.checkCryptoStatus(config, transactionId);
      case 'oxapay':
        return await this.checkOxapayStatus(config, transactionId);
      default:
        return {
          success: false,
          transaction_id: transactionId,
          status: 'failed',
          message: `Unsupported gateway for status check: ${gatewayCode}`,
        };
    }
  }

  private async checkStripeStatus(config: PaymentGatewayConfig, transactionId: string): Promise<PaymentStatusResponse> {
    try {
      const stripe = require('stripe')(config.api_secret);
      const session = await stripe.checkout.sessions.retrieve(transactionId);
      
      let status: 'pending' | 'completed' | 'failed' | 'cancelled' = 'pending';
      if (session.payment_status === 'paid') {
        status = 'completed';
      } else if (session.payment_status === 'unpaid') {
        status = 'failed';
      }

      return {
        success: true,
        transaction_id: session.id,
        status,
        amount: session.amount_total ? session.amount_total / 100 : undefined,
        currency: session.currency?.toUpperCase(),
        gateway_response: session,
      };
    } catch (error) {
      return {
        success: false,
        transaction_id: transactionId,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Stripe status check failed',
      };
    }
  }

  private async checkPayPalStatus(config: PaymentGatewayConfig, transactionId: string): Promise<PaymentStatusResponse> {
    try {
      const paypal = require('@paypal/checkout-server-sdk');
      const environment = config.config?.sandbox_mode ? 
        new paypal.core.SandboxEnvironment(config.api_key, config.api_secret) :
        new paypal.core.LiveEnvironment(config.api_key, config.api_secret);
      
      const client = new paypal.core.PayPalHttpClient(environment);
      const request = new paypal.orders.OrdersGetRequest(transactionId);
      const order = await client.execute(request);
      
      let status: 'pending' | 'completed' | 'failed' | 'cancelled' = 'pending';
      if (order.result.status === 'COMPLETED') {
        status = 'completed';
      } else if (order.result.status === 'CANCELLED') {
        status = 'cancelled';
      } else if (order.result.status === 'DENIED') {
        status = 'failed';
      }

      return {
        success: true,
        transaction_id: order.result.id,
        status,
        amount: parseFloat(order.result.purchase_units[0].amount.value),
        currency: order.result.purchase_units[0].amount.currency_code,
        gateway_response: order.result,
      };
    } catch (error) {
      return {
        success: false,
        transaction_id: transactionId,
        status: 'failed',
        message: error instanceof Error ? error.message : 'PayPal status check failed',
      };
    }
  }

  private async checkRazorpayStatus(config: PaymentGatewayConfig, transactionId: string): Promise<PaymentStatusResponse> {
    try {
      const Razorpay = require('razorpay');
      const razorpay = new Razorpay({
        key_id: config.api_key,
        key_secret: config.api_secret,
      });

      const order = await razorpay.orders.fetch(transactionId);
      
      let status: 'pending' | 'completed' | 'failed' | 'cancelled' = 'pending';
      if (order.status === 'paid') {
        status = 'completed';
      } else if (order.status === 'attempted') {
        status = 'failed';
      }

      return {
        success: true,
        transaction_id: order.id,
        status,
        amount: order.amount / 100, // Convert from paise
        currency: order.currency,
        gateway_response: order,
      };
    } catch (error) {
      return {
        success: false,
        transaction_id: transactionId,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Razorpay status check failed',
      };
    }
  }

  private async checkCryptoStatus(config: PaymentGatewayConfig, transactionId: string): Promise<PaymentStatusResponse> {
    try {
      const { Client } = require('coinbase-commerce-node');
      const client = new Client({ apiKey: config.api_key });

      const charge = await client.charges.retrieve(transactionId);
      
      let status: 'pending' | 'completed' | 'failed' | 'cancelled' = 'pending';
      if (charge.timeline.find((event: any) => event.status === 'COMPLETED')) {
        status = 'completed';
      } else if (charge.timeline.find((event: any) => event.status === 'EXPIRED')) {
        status = 'failed';
      }

      return {
        success: true,
        transaction_id: charge.id,
        status,
        amount: parseFloat(charge.pricing.local.amount),
        currency: charge.pricing.local.currency,
        gateway_response: charge,
      };
    } catch (error) {
      return {
        success: false,
        transaction_id: transactionId,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Crypto status check failed',
      };
    }
  }

  private async checkOxapayStatus(config: PaymentGatewayConfig, transactionId: string): Promise<PaymentStatusResponse> {
    try {
      const axios = require('axios');

      console.log('[Oxapay] Checking payment status for:', transactionId);

      // Use the payment information endpoint
      const res = await axios.post(
        `${config.api_endpoint}/payment/info`,
        {
          track_id: transactionId
        },
        {
          headers: {
            'merchant_api_key': config.api_key,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      console.log('[Oxapay] Status check response:', JSON.stringify(res.data, null, 2));

      if (!res.data || res.data.status !== 200) {
        throw new Error(res.data?.message || 'Oxapay status check failed');
      }

      const paymentData = res.data.data;
      let status: 'pending' | 'completed' | 'failed' | 'cancelled' = 'pending';

      // Map Oxapay status to our status
      switch (paymentData?.status) {
        case 'Paid':
        case 'Confirmed':
          status = 'completed';
          break;
        case 'Expired':
        case 'Cancelled':
          status = 'cancelled';
          break;
        case 'Failed':
          status = 'failed';
          break;
        case 'Waiting':
        case 'Pending':
        default:
          status = 'pending';
          break;
      }

      return {
        success: true,
        transaction_id: transactionId,
        status,
        amount: paymentData?.amount,
        currency: paymentData?.currency,
        gateway_response: res.data,
      };
    } catch (error: any) {
      console.error('[Oxapay] Status check error:', {
        message: error?.response?.data?.message || error.message,
        status: error?.response?.status,
        data: error?.response?.data
      });

      return {
        success: false,
        transaction_id: transactionId,
        status: 'failed',
        message: error?.response?.data?.error?.message || error?.response?.data?.message || error.message || 'Oxapay status check failed',
        gateway_response: error?.response?.data,
      };
    }
  }

  // Connection test handlers
  private async testConnectionHandler(gatewayCode: string, config: PaymentGatewayConfig): Promise<{ success: boolean; message: string }> {
    switch (gatewayCode.toLowerCase()) {
      case 'stripe':
        return await this.testStripeConnection(config);
      case 'paypal':
        return await this.testPayPalConnection(config);
      case 'razorpay':
        return await this.testRazorpayConnection(config);
      case 'crypto':
        return await this.testCryptoConnection(config);
      case 'oxapay':
        return await this.testOxapayConnection(config);
      default:
        return {
          success: false,
          message: `Unsupported gateway for connection test: ${gatewayCode}`,
        };
    }
  }

  private async testStripeConnection(config: PaymentGatewayConfig): Promise<{ success: boolean; message: string }> {
    try {
      const stripe = require('stripe')(config.api_secret);
      await stripe.paymentMethods.list({ limit: 1 });
      return {
        success: true,
        message: 'Stripe connection successful',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Stripe connection failed',
      };
    }
  }

  private async testPayPalConnection(config: PaymentGatewayConfig): Promise<{ success: boolean; message: string }> {
    try {
      const paypal = require('@paypal/checkout-server-sdk');
      const environment = config.config?.sandbox_mode ? 
        new paypal.core.SandboxEnvironment(config.api_key, config.api_secret) :
        new paypal.core.LiveEnvironment(config.api_key, config.api_secret);
      
      const client = new paypal.core.PayPalHttpClient(environment);
      const request = new paypal.orders.OrdersGetRequest('test');
      
      try {
        await client.execute(request);
      } catch (error: any) {
        if (error.statusCode === 404) {
          return {
            success: true,
            message: 'PayPal connection successful',
          };
        }
        throw error;
      }
      
      return {
        success: true,
        message: 'PayPal connection successful',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'PayPal connection failed',
      };
    }
  }

  private async testRazorpayConnection(config: PaymentGatewayConfig): Promise<{ success: boolean; message: string }> {
    try {
      const Razorpay = require('razorpay');
      const razorpay = new Razorpay({
        key_id: config.api_key,
        key_secret: config.api_secret,
      });

      await razorpay.orders.fetch('test');
      return {
        success: true,
        message: 'Razorpay connection successful',
      };
    } catch (error: any) {
      if (error.statusCode === 400) {
        return {
          success: true,
          message: 'Razorpay connection successful',
        };
      }
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Razorpay connection failed',
      };
    }
  }

  private async testCryptoConnection(config: PaymentGatewayConfig): Promise<{ success: boolean; message: string }> {
    try {
      const { Client } = require('coinbase-commerce-node');
      const client = new Client({ apiKey: config.api_key });
      
      await client.charges.list({ limit: 1 });
      return {
        success: true,
        message: 'Crypto connection successful',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Crypto connection failed',
      };
    }
  }

  private async testOxapayConnection(config: PaymentGatewayConfig): Promise<{ success: boolean; message: string }> {
    try {
      const axios = require('axios');

      console.log('[Oxapay] Testing connection with API key:', config.api_key?.substring(0, 10) + '...');

      // Test by creating a minimal test invoice (the most reliable way)
      // This actually validates the API key and connection
      const testAmount = 0.01; // Minimal test amount
      const testOrderId = `test_${Date.now()}`;

      const res = await axios.post(
        `${config.api_endpoint}/payment/invoice`,
        {
          amount: testAmount,
          currency: 'USD',
          order_id: testOrderId,
          description: 'Connection test',
          lifetime: 1 // Expire in 1 minute
        },
        {
          headers: {
            'merchant_api_key': config.api_key,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      console.log('[Oxapay] Connection test response:', {
        status: res.status,
        response_status: res.data?.status,
        has_payment_url: !!res.data?.data?.payment_url
      });

      // Check if we got a successful response
      if (res.data && res.data.status === 200 && res.data.data?.payment_url) {
        return {
          success: true,
          message: 'Oxapay connection successful! API key is valid and working'
        };
      }

      // If response is not as expected
      return {
        success: false,
        message: res.data?.message || 'Unexpected response from Oxapay'
      };
    } catch (error: any) {
      console.error('[Oxapay] Connection test error:', {
        status: error?.response?.status,
        message: error?.response?.data?.message,
        error: error?.response?.data?.error
      });

      // If we get a 401/403, API key is invalid
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return {
          success: false,
          message: 'Oxapay connection failed: Invalid API key'
        };
      }

      // If we get a 400 with specific error about the API key
      if (error?.response?.status === 400) {
        const errorKey = error?.response?.data?.error?.key;
        if (errorKey === 'invalid_merchant_api_key' || errorKey === 'unauthorized') {
          return {
            success: false,
            message: 'Oxapay connection failed: Invalid or unauthorized API key'
          };
        }
        // Other 400 errors might indicate the API is working but request is invalid
        // This is actually a good sign - means connection is working
        return {
          success: true,
          message: 'Oxapay connection successful! API is responding (request validation working)'
        };
      }

      // Extract error message
      const errorMessage =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error.message ||
        'Oxapay connection failed';

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  // Get available gateways
  getAvailableGateways(): string[] {
    return ['stripe', 'paypal', 'razorpay', 'crypto', 'oxapay', 'igpx'];
  }

  // Get gateway information
  getGatewayInfo(gatewayCode: string): { supported: boolean; features: string[] } {
    const supportedGateways = this.getAvailableGateways();
    const isSupported = supportedGateways.includes(gatewayCode.toLowerCase());
    
    const features: string[] = [];
    if (isSupported) {
      features.push('payment_creation', 'status_check', 'webhook_processing');
      if (gatewayCode.toLowerCase() === 'oxapay') {
        features.push('crypto_payments', 'instant_settlement', 'low_fees');
      }
    }
    
    return {
      supported: isSupported,
      features,
    };
  }

  // Stripe Webhook Handler
  private async handleStripeWebhook(config: PaymentGatewayConfig, data: any, signature?: string): Promise<WebhookData> {
    try {
      // Verify webhook signature
      if (signature && config.webhook_secret) {
        const stripe = require('stripe')(config.api_secret);
        const event = stripe.webhooks.constructEvent(JSON.stringify(data), signature, config.webhook_secret);
        data = event;
      }

      const { type, data: eventData } = data;
      let status: 'completed' | 'failed' | 'pending' = 'pending';
      let transactionType: 'deposit' | 'withdrawal' = 'deposit';

      switch (type) {
        case 'payment_intent.succeeded':
          status = 'completed';
          transactionType = 'deposit';
          break;
        case 'payment_intent.payment_failed':
          status = 'failed';
          break;
        default:
          return {
            success: false,
            transaction_id: eventData?.object?.id || 'unknown',
            status: 'pending',
            message: `Unhandled Stripe event: ${type}`
          };
      }

      return {
        success: true,
        transaction_id: eventData?.object?.id,
        status: status,
        amount: eventData?.object?.amount ? eventData.object.amount / 100 : 0,
        currency: eventData?.object?.currency,
        type: transactionType,
        gateway_data: data
      };
    } catch (error) {
      return {
        success: false,
        transaction_id: data?.data?.object?.id || 'unknown',
        status: 'failed',
        message: error instanceof Error ? error.message : 'Stripe webhook processing failed',
        gateway_data: data
      };
    }
  }

  // PayPal Webhook Handler
  private async handlePayPalWebhook(config: PaymentGatewayConfig, data: any, signature?: string): Promise<WebhookData> {
    try {
      const { event_type, resource } = data;
      let status: 'completed' | 'failed' | 'pending' = 'pending';
      let transactionType: 'deposit' | 'withdrawal' = 'deposit';

      switch (event_type) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          status = 'completed';
          transactionType = 'deposit';
          break;
        case 'PAYMENT.CAPTURE.DENIED':
          status = 'failed';
          break;
        default:
          return {
            success: false,
            transaction_id: resource?.id || 'unknown',
            status: 'pending',
            message: `Unhandled PayPal event: ${event_type}`
          };
      }

      return {
        success: true,
        transaction_id: resource?.id,
        status: status,
        amount: resource?.amount?.value ? parseFloat(resource.amount.value) : 0,
        currency: resource?.amount?.currency_code,
        type: transactionType,
        gateway_data: data
      };
    } catch (error) {
      return {
        success: false,
        transaction_id: data?.resource?.id || 'unknown',
        status: 'failed',
        message: error instanceof Error ? error.message : 'PayPal webhook processing failed',
        gateway_data: data
      };
    }
  }

  // Razorpay Webhook Handler
  private async handleRazorpayWebhook(config: PaymentGatewayConfig, data: any, signature?: string): Promise<WebhookData> {
    try {
      // Verify webhook signature
      if (signature && config.webhook_secret) {
        const crypto = require('crypto');
        const expectedSignature = crypto
          .createHmac('sha256', config.webhook_secret)
          .update(JSON.stringify(data))
          .digest('hex');
        
        if (signature !== expectedSignature) {
          throw new Error('Invalid Razorpay webhook signature');
        }
      }

      const { event, payload } = data;
      let status: 'completed' | 'failed' | 'pending' = 'pending';
      let transactionType: 'deposit' | 'withdrawal' = 'deposit';

      switch (event) {
        case 'payment.captured':
          status = 'completed';
          transactionType = 'deposit';
          break;
        case 'payment.failed':
          status = 'failed';
          break;
        default:
          return {
            success: false,
            transaction_id: payload?.payment?.entity?.id || 'unknown',
            status: 'pending',
            message: `Unhandled Razorpay event: ${event}`
          };
      }

      return {
        success: true,
        transaction_id: payload?.payment?.entity?.id,
        status: status,
        amount: payload?.payment?.entity?.amount ? payload.payment.entity.amount / 100 : 0,
        currency: payload?.payment?.entity?.currency,
        type: transactionType,
        gateway_data: data
      };
    } catch (error) {
      return {
        success: false,
        transaction_id: data?.payload?.payment?.entity?.id || 'unknown',
        status: 'failed',
        message: error instanceof Error ? error.message : 'Razorpay webhook processing failed',
        gateway_data: data
      };
    }
  }

  // Crypto Webhook Handler
  private async handleCryptoWebhook(config: PaymentGatewayConfig, data: any, signature?: string): Promise<WebhookData> {
    try {
      const { type, data: eventData } = data;
      let status: 'completed' | 'failed' | 'pending' = 'pending';
      let transactionType: 'deposit' | 'withdrawal' = 'deposit';

      switch (type) {
        case 'charge:confirmed':
          status = 'completed';
          transactionType = 'deposit';
          break;
        case 'charge:failed':
          status = 'failed';
          break;
        default:
          return {
            success: false,
            transaction_id: eventData?.id || 'unknown',
            status: 'pending',
            message: `Unhandled Crypto event: ${type}`
          };
      }

      return {
        success: true,
        transaction_id: eventData?.id,
        status: status,
        amount: eventData?.pricing?.local?.amount ? parseFloat(eventData.pricing.local.amount) : 0,
        currency: eventData?.pricing?.local?.currency,
        type: transactionType,
        gateway_data: data
      };
    } catch (error) {
      return {
        success: false,
        transaction_id: data?.data?.id || 'unknown',
        status: 'failed',
        message: error instanceof Error ? error.message : 'Crypto webhook processing failed',
        gateway_data: data
      };
    }
  }

  // Oxapay Webhook Handler (Official webhook format: https://docs.oxapay.com/webhook)
  private async handleOxapayWebhook(config: PaymentGatewayConfig, data: any, signature?: string): Promise<WebhookData> {
    try {
      console.log('[Oxapay] Processing webhook:', JSON.stringify(data, null, 2));

      // Oxapay webhook data structure
      const {
        trackId,
        status: oxapayStatus,
        amount,
        currency,
        payAmount,
        payCurrency,
        email,
        orderId,
        type: webhookType
      } = data;

      let status: 'completed' | 'failed' | 'pending' = 'pending';
      let transactionType: 'deposit' | 'withdrawal' = 'deposit';

      // Map Oxapay webhook status
      switch (oxapayStatus?.toLowerCase()) {
        case 'paid':
        case 'confirmed':
          status = 'completed';
          break;
        case 'expired':
        case 'cancelled':
        case 'canceled':
          status = 'failed';
          break;
        case 'waiting':
        case 'pending':
        default:
          status = 'pending';
          break;
      }

      // Determine transaction type (invoice = deposit, payout = withdrawal)
      if (webhookType?.toLowerCase() === 'payout') {
        transactionType = 'withdrawal';
      }

      return {
        success: true,
        transaction_id: trackId || orderId,
        status: status,
        amount: payAmount ? parseFloat(payAmount) : (amount ? parseFloat(amount) : 0),
        currency: payCurrency || currency,
        type: transactionType,
        gateway_data: data,
        metadata: {
          oxapay_track_id: trackId,
          oxapay_order_id: orderId,
          email: email,
          webhook_type: webhookType
        }
      };
    } catch (error) {
      console.error('[Oxapay] Webhook processing error:', error);

      return {
        success: false,
        transaction_id: data?.trackId || data?.orderId || 'unknown',
        status: 'failed',
        message: error instanceof Error ? error.message : 'Oxapay webhook processing failed',
        gateway_data: data
      };
    }
  }

  // IGPX Webhook Handler
  private async handleIgpxWebhook(config: PaymentGatewayConfig, data: any, signature?: string): Promise<WebhookData> {
    try {
      // Note: Signature verification is done in the route handler using raw body
      // This handler processes the already-verified webhook data

      const { transaction_id, action, user_id, currency, amount } = data;

      if (!transaction_id || !action || !user_id || !currency || !amount) {
        throw new Error('Missing required fields in IGPX webhook');
      }

      let status: 'completed' | 'failed' | 'pending' = 'pending';
      let transactionType: 'deposit' | 'withdrawal' = 'deposit';

      switch (action) {
        case 'bet':
          status = 'completed';
          transactionType = 'withdrawal';
          break;
        case 'result':
          status = 'completed';
          transactionType = 'deposit';
          break;
        case 'rollback':
          status = 'completed';
          transactionType = 'deposit'; // Rollback restores balance
          break;
        default:
          throw new Error(`Unknown IGPX action: ${action}`);
      }

      return {
        success: true,
        transaction_id: transaction_id,
        status: status,
        amount: parseFloat(amount),
        currency: currency,
        type: transactionType,
        user_id: user_id.toString(),
        gateway_data: data,
        metadata: {
          igpx_action: action,
          igpx_user_id: user_id,
          rollback_transaction_id: data.rollback_transaction_id
        }
      };
    } catch (error) {
      return {
        success: false,
        transaction_id: data?.transaction_id || 'unknown',
        status: 'failed',
        message: error instanceof Error ? error.message : 'IGPX webhook processing failed',
        gateway_data: data
      };
    }
  }
} 