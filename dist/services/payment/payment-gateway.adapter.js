"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgpxGatewayAdapter = exports.OxapayGatewayAdapter = exports.PayPalGatewayAdapter = exports.StripeGatewayAdapter = exports.PaymentGatewayFactory = exports.PaymentGatewayAdapter = void 0;
class PaymentGatewayAdapter {
    config;
    gatewayCode;
    constructor(config, gatewayCode) {
        this.config = config;
        this.gatewayCode = gatewayCode;
    }
    // Common utility methods
    validateConfig() {
        if (!this.config.api_key || !this.config.api_secret || !this.config.api_endpoint) {
            throw new Error(`Invalid configuration for gateway ${this.gatewayCode}`);
        }
        return true;
    }
    generateOrderId() {
        return `${this.gatewayCode}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    calculateFees(amount) {
        // Default fee calculation - can be overridden by specific gateways
        const percentageFee = this.config.config?.fees_percentage || 0;
        const fixedFee = this.config.config?.fees_fixed || 0;
        return (amount * percentageFee / 100) + fixedFee;
    }
    async makeRequest(url, options) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            throw new Error(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    validateWebhookSignature(data, signature) {
        // Default signature validation - should be overridden by specific gateways
        if (!this.config.webhook_secret) {
            return true; // No secret configured, skip validation
        }
        // This is a basic example - each gateway should implement its own signature validation
        const expectedSignature = this.generateSignature(data, this.config.webhook_secret);
        return signature === expectedSignature;
    }
    generateSignature(data, secret) {
        // Default signature generation - should be overridden by specific gateways
        const crypto = require('crypto');
        const payload = typeof data === 'string' ? data : JSON.stringify(data);
        return crypto.createHmac('sha256', secret).update(payload).digest('hex');
    }
    // Get gateway information
    getGatewayInfo() {
        return {
            code: this.gatewayCode,
            config: {
                has_api_key: !!this.config.api_key,
                has_api_secret: !!this.config.api_secret,
                has_webhook_secret: !!this.config.webhook_secret,
                endpoint: this.config.api_endpoint,
            }
        };
    }
}
exports.PaymentGatewayAdapter = PaymentGatewayAdapter;
// Payment Gateway Factory
class PaymentGatewayFactory {
    static adapters = new Map();
    static registerGateway(gatewayCode, adapterClass) {
        this.adapters.set(gatewayCode, adapterClass);
    }
    static createGateway(gatewayCode, config) {
        const AdapterClass = this.adapters.get(gatewayCode);
        if (!AdapterClass) {
            throw new Error(`Payment gateway adapter not found for code: ${gatewayCode}`);
        }
        return new AdapterClass(config, gatewayCode);
    }
    static getAvailableGateways() {
        return Array.from(this.adapters.keys());
    }
}
exports.PaymentGatewayFactory = PaymentGatewayFactory;
// Example Stripe Gateway Adapter
class StripeGatewayAdapter extends PaymentGatewayAdapter {
    async createPayment(request) {
        this.validateConfig();
        try {
            const stripe = require('stripe')(this.config.api_secret);
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
                success_url: request.return_url || `${this.config.config?.success_url}`,
                cancel_url: request.cancel_url || `${this.config.config?.cancel_url}`,
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
        }
        catch (error) {
            return {
                success: false,
                status: 'failed',
                message: error instanceof Error ? error.message : 'Payment creation failed',
            };
        }
    }
    async checkPaymentStatus(transactionId) {
        this.validateConfig();
        try {
            const stripe = require('stripe')(this.config.api_secret);
            const session = await stripe.checkout.sessions.retrieve(transactionId);
            let status = 'pending';
            if (session.payment_status === 'paid') {
                status = 'completed';
            }
            else if (session.payment_status === 'unpaid') {
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
        }
        catch (error) {
            return {
                success: false,
                transaction_id: transactionId,
                status: 'failed',
                message: error instanceof Error ? error.message : 'Status check failed',
            };
        }
    }
    async processWebhook(data, signature) {
        this.validateConfig();
        if (!this.validateWebhookSignature(data, signature)) {
            throw new Error('Invalid webhook signature');
        }
        const event = data;
        let status = 'pending';
        if (event.type === 'checkout.session.completed') {
            status = 'completed';
        }
        else if (event.type === 'checkout.session.expired') {
            status = 'failed';
        }
        return {
            transaction_id: event.data.object.id,
            status,
            amount: event.data.object.amount_total ? event.data.object.amount_total / 100 : undefined,
            currency: event.data.object.currency?.toUpperCase(),
            gateway_data: event,
        };
    }
    async testConnection() {
        try {
            this.validateConfig();
            const stripe = require('stripe')(this.config.api_secret);
            // Test the connection by making a simple API call
            await stripe.paymentMethods.list({ limit: 1 });
            return {
                success: true,
                message: 'Stripe connection successful',
            };
        }
        catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Connection test failed',
            };
        }
    }
    validateWebhookSignature(data, signature) {
        if (!this.config.webhook_secret) {
            return true;
        }
        try {
            const stripe = require('stripe')(this.config.api_secret);
            const event = stripe.webhooks.constructEvent(JSON.stringify(data), signature, this.config.webhook_secret);
            return !!event;
        }
        catch (error) {
            return false;
        }
    }
}
exports.StripeGatewayAdapter = StripeGatewayAdapter;
// Example PayPal Gateway Adapter
class PayPalGatewayAdapter extends PaymentGatewayAdapter {
    async createPayment(request) {
        this.validateConfig();
        try {
            const paypal = require('@paypal/checkout-server-sdk');
            const environment = this.config.config?.sandbox_mode ?
                new paypal.core.SandboxEnvironment(this.config.api_key, this.config.api_secret) :
                new paypal.core.LiveEnvironment(this.config.api_key, this.config.api_secret);
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
            const approvalUrl = order.result.links.find((link) => link.rel === 'approve')?.href;
            return {
                success: true,
                transaction_id: order.result.id,
                payment_url: approvalUrl,
                status: 'pending',
                gateway_response: order.result,
            };
        }
        catch (error) {
            return {
                success: false,
                status: 'failed',
                message: error instanceof Error ? error.message : 'Payment creation failed',
            };
        }
    }
    async checkPaymentStatus(transactionId) {
        this.validateConfig();
        try {
            const paypal = require('@paypal/checkout-server-sdk');
            const environment = this.config.config?.sandbox_mode ?
                new paypal.core.SandboxEnvironment(this.config.api_key, this.config.api_secret) :
                new paypal.core.LiveEnvironment(this.config.api_key, this.config.api_secret);
            const client = new paypal.core.PayPalHttpClient(environment);
            const request = new paypal.orders.OrdersGetRequest(transactionId);
            const order = await client.execute(request);
            let status = 'pending';
            if (order.result.status === 'COMPLETED') {
                status = 'completed';
            }
            else if (order.result.status === 'CANCELLED') {
                status = 'cancelled';
            }
            else if (order.result.status === 'DENIED') {
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
        }
        catch (error) {
            return {
                success: false,
                transaction_id: transactionId,
                status: 'failed',
                message: error instanceof Error ? error.message : 'Status check failed',
            };
        }
    }
    async processWebhook(data, signature) {
        this.validateConfig();
        if (!this.validateWebhookSignature(data, signature)) {
            throw new Error('Invalid webhook signature');
        }
        const event = data;
        let status = 'pending';
        if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
            status = 'completed';
        }
        else if (event.event_type === 'PAYMENT.CAPTURE.DENIED') {
            status = 'failed';
        }
        return {
            transaction_id: event.resource.id,
            status,
            amount: parseFloat(event.resource.amount.value),
            currency: event.resource.amount.currency_code,
            gateway_data: event,
        };
    }
    async testConnection() {
        try {
            this.validateConfig();
            const paypal = require('@paypal/checkout-server-sdk');
            const environment = this.config.config?.sandbox_mode ?
                new paypal.core.SandboxEnvironment(this.config.api_key, this.config.api_secret) :
                new paypal.core.LiveEnvironment(this.config.api_key, this.config.api_secret);
            const client = new paypal.core.PayPalHttpClient(environment);
            // Test the connection by making a simple API call
            const request = new paypal.orders.OrdersGetRequest('test');
            try {
                await client.execute(request);
            }
            catch (error) {
                // Expected to fail with invalid order ID, but connection should work
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
        }
        catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Connection test failed',
            };
        }
    }
}
exports.PayPalGatewayAdapter = PayPalGatewayAdapter;
// Oxapay Gateway Adapter
class OxapayGatewayAdapter extends PaymentGatewayAdapter {
    async createPayment(request) {
        this.validateConfig();
        const axios = require('axios');
        try {
            const res = await axios.post(`${this.config.api_endpoint}/merchant/invoice`, {
                amount: request.amount,
                currency: request.currency,
                callback_url: this.config.webhook_url,
                order_id: request.order_id,
                network: this.config.config?.network || 'TRC20',
                lifetime: this.config.config?.invoice_lifetime || 900,
                confirmations: this.config.config?.callback_confirmations || 1,
                description: request.description || 'Deposit',
                ...request.metadata,
            }, {
                headers: { 'Authorization': `Bearer ${this.config.api_key}` }
            });
            return {
                success: true,
                transaction_id: res.data.invoice_id || res.data.id,
                payment_url: res.data.payment_url || res.data.pay_address_url || res.data.url,
                status: 'pending',
                gateway_response: res.data,
            };
        }
        catch (error) {
            return {
                success: false,
                status: 'failed',
                message: error?.response?.data?.message || error.message || 'Oxapay payment creation failed',
                gateway_response: error?.response?.data,
            };
        }
    }
    async checkPaymentStatus(transactionId) {
        this.validateConfig();
        const axios = require('axios');
        try {
            const res = await axios.get(`${this.config.api_endpoint}/merchant/invoice/${transactionId}`, {
                headers: { 'Authorization': `Bearer ${this.config.api_key}` }
            });
            let status = 'pending';
            if (res.data.status === 'paid' || res.data.status === 'confirmed') {
                status = 'completed';
            }
            else if (res.data.status === 'expired' || res.data.status === 'cancelled') {
                status = 'cancelled';
            }
            else if (res.data.status === 'failed') {
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
        }
        catch (error) {
            return {
                success: false,
                transaction_id: transactionId,
                status: 'failed',
                message: error?.response?.data?.message || error.message || 'Oxapay status check failed',
                gateway_response: error?.response?.data,
            };
        }
    }
    async processWebhook(data, signature) {
        // Optionally validate signature if Oxapay provides one
        let status = 'pending';
        if (data.status === 'paid' || data.status === 'confirmed') {
            status = 'completed';
        }
        else if (data.status === 'expired' || data.status === 'cancelled') {
            status = 'cancelled';
        }
        else if (data.status === 'failed') {
            status = 'failed';
        }
        return {
            transaction_id: data.order_id || data.invoice_id,
            status,
            amount: data.amount,
            currency: data.currency,
            gateway_data: data,
            signature,
        };
    }
    async testConnection() {
        const axios = require('axios');
        try {
            this.validateConfig();
            // Try to fetch supported currencies as a test
            const res = await axios.get(`${this.config.api_endpoint}/merchant/currencies`, {
                headers: { 'Authorization': `Bearer ${this.config.api_key}` }
            });
            if (res.data && Array.isArray(res.data)) {
                return { success: true, message: 'Oxapay connection successful' };
            }
            return { success: false, message: 'Oxapay connection failed' };
        }
        catch (error) {
            return { success: false, message: error?.response?.data?.message || error.message || 'Oxapay connection failed' };
        }
    }
}
exports.OxapayGatewayAdapter = OxapayGatewayAdapter;
// IGPX Sportsbook Gateway Adapter
class IgpxGatewayAdapter extends PaymentGatewayAdapter {
    async createPayment(request) {
        this.validateConfig();
        const axios = require('axios');
        try {
            // Step 1: Authenticate to get token
            const authResponse = await axios.post(`${this.config.api_endpoint}/auth`, {
                username: this.config.api_key, // CLIENT_USERNAME
                password: this.config.api_secret // CLIENT_PASSWORD
            });
            if (!authResponse.data.token) {
                throw new Error('Failed to authenticate with IGPX');
            }
            const token = authResponse.data.token;
            const expiresIn = authResponse.data.expires_in;
            // Step 2: Start session to get play URL
            const sessionResponse = await axios.post(`${this.config.api_endpoint}/start-session`, {
                user_id: request.metadata?.user_id?.toString() || request.order_id,
                currency: request.currency,
                lang: request.metadata?.language || 'en',
                mode: 'real' // Force real money mode (not demo)
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
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
        }
        catch (error) {
            return {
                success: false,
                status: 'failed',
                message: error?.response?.data?.message || error.message || 'IGPX payment creation failed',
                gateway_response: error?.response?.data,
            };
        }
    }
    async checkPaymentStatus(transactionId) {
        // IGPX doesn't have a direct status check endpoint
        // Status is managed through webhooks
        return {
            success: true,
            transaction_id: transactionId,
            status: 'pending',
            message: 'IGPX status check not available - use webhooks for status updates',
            gateway_response: {}
        };
    }
    async processWebhook(data, signature) {
        try {
            // Verify security hash
            if (signature && this.config.webhook_secret) {
                const crypto = require('crypto');
                const expectedHash = crypto
                    .createHmac('sha256', this.config.webhook_secret)
                    .update(JSON.stringify(data))
                    .digest('hex');
                if (signature !== expectedHash) {
                    throw new Error('Invalid security hash');
                }
            }
            const { transaction_id, action, user_id, currency, amount } = data;
            if (!transaction_id || !action || !user_id || !currency || !amount) {
                throw new Error('Missing required fields in IGPX webhook');
            }
            let status = 'pending';
            let transactionType = 'deposit';
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
        }
        catch (error) {
            return {
                success: false,
                transaction_id: data?.transaction_id || 'unknown',
                status: 'failed',
                message: error instanceof Error ? error.message : 'IGPX webhook processing failed',
                gateway_data: data
            };
        }
    }
    async testConnection() {
        try {
            const axios = require('axios');
            // Test authentication
            const authResponse = await axios.post(`${this.config.api_endpoint}/auth`, {
                username: this.config.api_key,
                password: this.config.api_secret
            });
            if (authResponse.data.token) {
                return {
                    success: true,
                    message: 'IGPX connection successful - authentication token received'
                };
            }
            else {
                return {
                    success: false,
                    message: 'IGPX authentication failed - no token received'
                };
            }
        }
        catch (error) {
            return {
                success: false,
                message: `IGPX connection failed: ${error?.response?.data?.message || error.message}`
            };
        }
    }
}
exports.IgpxGatewayAdapter = IgpxGatewayAdapter;
// Register the gateway adapters
PaymentGatewayFactory.registerGateway('stripe', StripeGatewayAdapter);
PaymentGatewayFactory.registerGateway('paypal', PayPalGatewayAdapter);
PaymentGatewayFactory.registerGateway('oxapay', OxapayGatewayAdapter);
PaymentGatewayFactory.registerGateway('igpx', IgpxGatewayAdapter);
