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

  // Oxapay Payment Handler
  private async handleOxapayPayment(config: PaymentGatewayConfig, request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const axios = require('axios');
      
      // Try different possible endpoints for creating invoices
      const possibleEndpoints = [
        '/merchant/invoice',
        '/invoice',
        '/payment/invoice',
        '/general/invoice'
      ];
      
      let lastError: any = null;
      
      for (const endpoint of possibleEndpoints) {
        try {
          const res = await axios.post(
            `${config.api_endpoint}${endpoint}`,
            {
              amount: request.amount,
              currency: request.currency,
              callback_url: config.webhook_url,
              order_id: request.order_id,
              network: config.config?.network || 'TRC20',
              lifetime: config.config?.invoice_lifetime || 900,
              confirmations: config.config?.callback_confirmations || 1,
              description: request.description || 'Deposit',
              merchant_id: config.merchant_id,
              ...request.metadata,
            },
            {
              headers: { 
                'merchant_api_key': config.merchant_id || config.api_key,
                'Content-Type': 'application/json'
              }
            }
          );
          
          console.log('OxaPay response:', JSON.stringify(res.data, null, 2));
          
          return {
            success: true,
            transaction_id: res.data.data?.track_id || res.data.invoice_id || res.data.id,
            payment_url: res.data.data?.payment_url || res.data.payment_url || res.data.pay_address_url || res.data.url,
            status: 'pending',
            gateway_response: res.data,
          };
        } catch (error: any) {
          lastError = error;
          // If it's a 404, try the next endpoint
          if (error?.response?.status === 404) {
            continue;
          }
          // If it's a different error, break and return the error
          break;
        }
      }
      
      // If we get here, none of the endpoints worked
      return {
        success: false,
        status: 'failed',
        message: lastError?.response?.data?.message || lastError?.message || 'Oxapay payment creation failed - no valid endpoint found',
        gateway_response: lastError?.response?.data,
      };
    } catch (error: any) {
      return {
        success: false,
        status: 'failed',
        message: error?.response?.data?.message || error.message || 'Oxapay payment creation failed',
        gateway_response: error?.response?.data,
      };
    }
  }

  // Oxapay Withdrawal Handler
  private async handleOxapayWithdrawal(config: PaymentGatewayConfig, request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const axios = require('axios');
      
      console.log('OxaPay Withdrawal Request:', {
        endpoint: `${config.api_endpoint}/payout`,
        address: request.metadata?.address,
        amount: request.amount,
        currency: request.currency,
        network: request.metadata?.network || config.config?.network || 'TRC20',
        memo: request.metadata?.memo,
        description: request.description || 'Withdrawal',
        order_id: request.order_id,
        payout_api_key: config.payout_api_key ? 'SET' : 'NOT SET'
      });
      
      // Use the payout API endpoint and authentication header
      const res = await axios.post(
        `${config.api_endpoint}/payout`,
        {
          address: request.metadata?.address,
          amount: request.amount,
          currency: request.currency,
          network: request.metadata?.network || config.config?.network || 'TRC20',
          memo: request.metadata?.memo,
          description: request.description || 'Withdrawal',
          order_id: request.order_id,
        },
        {
          headers: { 
            'payout_api_key': config.payout_api_key || config.api_secret,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('OxaPay Withdrawal Response:', res.data);
      
      return {
        success: true,
        transaction_id: res.data.payout_id || res.data.id,
        payment_url: res.data.payment_url || res.data.url,
        status: 'pending',
        gateway_response: res.data,
      };
    } catch (error: any) {
      console.log('OxaPay Withdrawal Error:', {
        message: error?.response?.data?.message || error.message,
        status: error?.response?.status,
        data: error?.response?.data
      });
      
      // Extract the specific error message from OxaPay response
      const oxaPayError = error?.response?.data?.error?.message || error?.response?.data?.message;
      
      return {
        success: false,
        status: 'failed',
        message: oxaPayError || error.message || 'Oxapay withdrawal creation failed',
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
      const res = await axios.get(
        `${config.api_endpoint}/merchant/invoice/${transactionId}`,
        {
          headers: { 
            'general_api_key': config.api_key,
            'Content-Type': 'application/json'
          }
        }
      );
      let status: 'pending' | 'completed' | 'failed' | 'cancelled' = 'pending';
      if (res.data.status === 'paid' || res.data.status === 'confirmed') {
        status = 'completed';
      } else if (res.data.status === 'expired' || res.data.status === 'cancelled') {
        status = 'cancelled';
      } else if (res.data.status === 'failed') {
        status = 'failed';
      }
      return {
        success: true,
        transaction_id: transactionId,
        status,
        amount: res.data.amount,
        currency: res.data.currency,
        gateway_response: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        transaction_id: transactionId,
        status: 'failed',
        message: error?.response?.data?.message || error.message || 'Oxapay status check failed',
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
      // Test with the general API endpoint that we know works
      const res = await axios.post(
        `${config.api_endpoint}/general/swap`,
        {
          amount: 0.1,
          from_currency: "USDT",
          to_currency: "USDT"
        },
        {
          headers: { 
            'general_api_key': config.api_key,
            'Content-Type': 'application/json'
          }
        }
      );
      // If we get a response (even with an error), the connection is working
      return { success: true, message: 'Oxapay connection successful' };
    } catch (error: any) {
      // If we get a specific error about balance or invalid data, the connection is working
      if (error?.response?.status === 400 && error?.response?.data?.error?.key) {
        return { success: true, message: 'Oxapay connection successful' };
      }
      return { success: false, message: error?.response?.data?.message || error.message || 'Oxapay connection failed' };
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

  // Oxapay Webhook Handler
  private async handleOxapayWebhook(config: PaymentGatewayConfig, data: any, signature?: string): Promise<WebhookData> {
    try {
      const { status: oxapayStatus, invoice_id, amount, currency } = data;
      let status: 'completed' | 'failed' | 'pending' = 'pending';
      let transactionType: 'deposit' | 'withdrawal' = 'deposit';

      switch (oxapayStatus) {
        case 'paid':
        case 'confirmed':
          status = 'completed';
          transactionType = 'deposit';
          break;
        case 'expired':
        case 'cancelled':
          status = 'failed';
          break;
        default:
          status = 'pending';
      }

      return {
        success: true,
        transaction_id: invoice_id,
        status: status,
        amount: amount ? parseFloat(amount) : 0,
        currency: currency,
        type: transactionType,
        gateway_data: data
      };
    } catch (error) {
      return {
        success: false,
        transaction_id: data?.invoice_id || 'unknown',
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