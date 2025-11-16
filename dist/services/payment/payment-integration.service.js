"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentIntegrationService = void 0;
class PaymentIntegrationService {
    constructor() {
        this.gatewayHandlers = new Map();
        this.webhookHandlers = new Map();
        this.initializeGatewayHandlers();
        this.initializeWebhookHandlers();
    }
    static getInstance() {
        if (!PaymentIntegrationService.instance) {
            PaymentIntegrationService.instance = new PaymentIntegrationService();
        }
        return PaymentIntegrationService.instance;
    }
    initializeGatewayHandlers() {
        // Register different payment gateway handlers
        this.gatewayHandlers.set('stripe', this.handleStripePayment.bind(this));
        this.gatewayHandlers.set('paypal', this.handlePayPalPayment.bind(this));
        this.gatewayHandlers.set('razorpay', this.handleRazorpayPayment.bind(this));
        this.gatewayHandlers.set('crypto', this.handleCryptoPayment.bind(this));
        this.gatewayHandlers.set('oxapay', this.handleOxapayPayment.bind(this));
        this.gatewayHandlers.set('igpx', this.handleIgpxPayment.bind(this));
    }
    initializeWebhookHandlers() {
        this.webhookHandlers.set('stripe', this.handleStripeWebhook.bind(this));
        this.webhookHandlers.set('paypal', this.handlePayPalWebhook.bind(this));
        this.webhookHandlers.set('razorpay', this.handleRazorpayWebhook.bind(this));
        this.webhookHandlers.set('crypto', this.handleCryptoWebhook.bind(this));
        this.webhookHandlers.set('oxapay', this.handleOxapayWebhook.bind(this));
        this.webhookHandlers.set('igpx', this.handleIgpxWebhook.bind(this));
    }
    async createPayment(gatewayCode, config, request) {
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
        }
        catch (error) {
            return {
                success: false,
                status: 'failed',
                message: error instanceof Error ? error.message : 'Payment creation failed',
            };
        }
    }
    async createWithdrawal(gatewayCode, config, request) {
        if (gatewayCode.toLowerCase() === 'oxapay') {
            return await this.handleOxapayWithdrawal(config, request);
        }
        return {
            success: false,
            status: 'failed',
            message: `Withdrawal not supported for gateway: ${gatewayCode}`,
        };
    }
    async checkPaymentStatus(gatewayCode, config, transactionId) {
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
    async testGatewayConnection(gatewayCode, config) {
        const handler = this.gatewayHandlers.get(gatewayCode.toLowerCase());
        if (!handler) {
            return {
                success: false,
                message: `Unsupported payment gateway: ${gatewayCode}`,
            };
        }
        try {
            return await this.testConnectionHandler(gatewayCode, config);
        }
        catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Connection test failed',
            };
        }
    }
    async processWebhook(gatewayCode, config, data, signature) {
        const handler = this.webhookHandlers.get(gatewayCode.toLowerCase());
        if (!handler) {
            throw new Error(`Unsupported webhook gateway: ${gatewayCode}`);
        }
        try {
            return await handler(config, data, signature);
        }
        catch (error) {
            throw new Error(`Webhook processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    // Stripe Payment Handler
    async handleStripePayment(config, request) {
        var _a, _b;
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
                success_url: request.return_url || `${(_a = config.config) === null || _a === void 0 ? void 0 : _a.success_url}`,
                cancel_url: request.cancel_url || `${(_b = config.config) === null || _b === void 0 ? void 0 : _b.cancel_url}`,
                metadata: Object.assign({ order_id: request.order_id }, request.metadata),
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
                message: error instanceof Error ? error.message : 'Stripe payment creation failed',
            };
        }
    }
    // PayPal Payment Handler
    async handlePayPalPayment(config, request) {
        var _a, _b;
        try {
            const paypal = require('@paypal/checkout-server-sdk');
            const environment = ((_a = config.config) === null || _a === void 0 ? void 0 : _a.sandbox_mode) ?
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
            const approvalUrl = (_b = order.result.links.find((link) => link.rel === 'approve')) === null || _b === void 0 ? void 0 : _b.href;
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
                message: error instanceof Error ? error.message : 'PayPal payment creation failed',
            };
        }
    }
    // Razorpay Payment Handler
    async handleRazorpayPayment(config, request) {
        var _a;
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
                notes: Object.assign({ description: request.description || 'Payment' }, request.metadata),
                callback_url: request.return_url,
                cancel_url: request.cancel_url,
            };
            const order = await razorpay.orders.create(options);
            return {
                success: true,
                transaction_id: order.id,
                payment_url: `${((_a = config.config) === null || _a === void 0 ? void 0 : _a.payment_url) || 'https://checkout.razorpay.com/v1/checkout.html'}?key=${config.api_key}&amount=${options.amount}&currency=${options.currency}&order_id=${order.id}`,
                status: 'pending',
                gateway_response: order,
            };
        }
        catch (error) {
            return {
                success: false,
                status: 'failed',
                message: error instanceof Error ? error.message : 'Razorpay payment creation failed',
            };
        }
    }
    // Crypto Payment Handler (Example with Coinbase Commerce)
    async handleCryptoPayment(config, request) {
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
                metadata: Object.assign({ order_id: request.order_id }, request.metadata),
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
        }
        catch (error) {
            return {
                success: false,
                status: 'failed',
                message: error instanceof Error ? error.message : 'Crypto payment creation failed',
            };
        }
    }
    // Oxapay Payment Handler
    async handleOxapayPayment(config, request) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        try {
            const axios = require('axios');
            // Try different possible endpoints for creating invoices
            const possibleEndpoints = [
                '/merchant/invoice',
                '/invoice',
                '/payment/invoice',
                '/general/invoice'
            ];
            let lastError = null;
            for (const endpoint of possibleEndpoints) {
                try {
                    const res = await axios.post(`${config.api_endpoint}${endpoint}`, Object.assign({ amount: request.amount, currency: request.currency, callback_url: config.webhook_url, order_id: request.order_id, network: ((_a = config.config) === null || _a === void 0 ? void 0 : _a.network) || 'TRC20', lifetime: ((_b = config.config) === null || _b === void 0 ? void 0 : _b.invoice_lifetime) || 900, confirmations: ((_c = config.config) === null || _c === void 0 ? void 0 : _c.callback_confirmations) || 1, description: request.description || 'Deposit', merchant_id: config.merchant_id }, request.metadata), {
                        headers: {
                            'merchant_api_key': config.merchant_id || config.api_key,
                            'Content-Type': 'application/json'
                        }
                    });
                    console.log('OxaPay response:', JSON.stringify(res.data, null, 2));
                    return {
                        success: true,
                        transaction_id: ((_d = res.data.data) === null || _d === void 0 ? void 0 : _d.track_id) || res.data.invoice_id || res.data.id,
                        payment_url: ((_e = res.data.data) === null || _e === void 0 ? void 0 : _e.payment_url) || res.data.payment_url || res.data.pay_address_url || res.data.url,
                        status: 'pending',
                        gateway_response: res.data,
                    };
                }
                catch (error) {
                    lastError = error;
                    // If it's a 404, try the next endpoint
                    if (((_f = error === null || error === void 0 ? void 0 : error.response) === null || _f === void 0 ? void 0 : _f.status) === 404) {
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
                message: ((_h = (_g = lastError === null || lastError === void 0 ? void 0 : lastError.response) === null || _g === void 0 ? void 0 : _g.data) === null || _h === void 0 ? void 0 : _h.message) || (lastError === null || lastError === void 0 ? void 0 : lastError.message) || 'Oxapay payment creation failed - no valid endpoint found',
                gateway_response: (_j = lastError === null || lastError === void 0 ? void 0 : lastError.response) === null || _j === void 0 ? void 0 : _j.data,
            };
        }
        catch (error) {
            return {
                success: false,
                status: 'failed',
                message: ((_l = (_k = error === null || error === void 0 ? void 0 : error.response) === null || _k === void 0 ? void 0 : _k.data) === null || _l === void 0 ? void 0 : _l.message) || error.message || 'Oxapay payment creation failed',
                gateway_response: (_m = error === null || error === void 0 ? void 0 : error.response) === null || _m === void 0 ? void 0 : _m.data,
            };
        }
    }
    // Oxapay Withdrawal Handler
    async handleOxapayWithdrawal(config, request) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
        try {
            const axios = require('axios');
            console.log('OxaPay Withdrawal Request:', {
                endpoint: `${config.api_endpoint}/payout`,
                address: (_a = request.metadata) === null || _a === void 0 ? void 0 : _a.address,
                amount: request.amount,
                currency: request.currency,
                network: ((_b = request.metadata) === null || _b === void 0 ? void 0 : _b.network) || ((_c = config.config) === null || _c === void 0 ? void 0 : _c.network) || 'TRC20',
                memo: (_d = request.metadata) === null || _d === void 0 ? void 0 : _d.memo,
                description: request.description || 'Withdrawal',
                order_id: request.order_id,
                payout_api_key: config.payout_api_key ? 'SET' : 'NOT SET'
            });
            // Use the payout API endpoint and authentication header
            const res = await axios.post(`${config.api_endpoint}/payout`, {
                address: (_e = request.metadata) === null || _e === void 0 ? void 0 : _e.address,
                amount: request.amount,
                currency: request.currency,
                network: ((_f = request.metadata) === null || _f === void 0 ? void 0 : _f.network) || ((_g = config.config) === null || _g === void 0 ? void 0 : _g.network) || 'TRC20',
                memo: (_h = request.metadata) === null || _h === void 0 ? void 0 : _h.memo,
                description: request.description || 'Withdrawal',
                order_id: request.order_id,
            }, {
                headers: {
                    'payout_api_key': config.payout_api_key || config.api_secret,
                    'Content-Type': 'application/json'
                }
            });
            console.log('OxaPay Withdrawal Response:', res.data);
            return {
                success: true,
                transaction_id: res.data.payout_id || res.data.id,
                payment_url: res.data.payment_url || res.data.url,
                status: 'pending',
                gateway_response: res.data,
            };
        }
        catch (error) {
            console.log('OxaPay Withdrawal Error:', {
                message: ((_k = (_j = error === null || error === void 0 ? void 0 : error.response) === null || _j === void 0 ? void 0 : _j.data) === null || _k === void 0 ? void 0 : _k.message) || error.message,
                status: (_l = error === null || error === void 0 ? void 0 : error.response) === null || _l === void 0 ? void 0 : _l.status,
                data: (_m = error === null || error === void 0 ? void 0 : error.response) === null || _m === void 0 ? void 0 : _m.data
            });
            // Extract the specific error message from OxaPay response
            const oxaPayError = ((_q = (_p = (_o = error === null || error === void 0 ? void 0 : error.response) === null || _o === void 0 ? void 0 : _o.data) === null || _p === void 0 ? void 0 : _p.error) === null || _q === void 0 ? void 0 : _q.message) || ((_s = (_r = error === null || error === void 0 ? void 0 : error.response) === null || _r === void 0 ? void 0 : _r.data) === null || _s === void 0 ? void 0 : _s.message);
            return {
                success: false,
                status: 'failed',
                message: oxaPayError || error.message || 'Oxapay withdrawal creation failed',
                gateway_response: (_t = error === null || error === void 0 ? void 0 : error.response) === null || _t === void 0 ? void 0 : _t.data,
            };
        }
    }
    // IGPX Sportsbook Payment Handler
    async handleIgpxPayment(config, request) {
        var _a, _b, _c, _d, _e, _f;
        try {
            const axios = require('axios');
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
            // Step 2: Start session to get play URL
            const sessionResponse = await axios.post(`${config.api_endpoint}/start-session`, {
                user_id: ((_b = (_a = request.metadata) === null || _a === void 0 ? void 0 : _a.user_id) === null || _b === void 0 ? void 0 : _b.toString()) || request.order_id,
                currency: request.currency,
                lang: ((_c = request.metadata) === null || _c === void 0 ? void 0 : _c.language) || 'en'
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
                message: ((_e = (_d = error === null || error === void 0 ? void 0 : error.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.message) || error.message || 'IGPX payment creation failed',
                gateway_response: (_f = error === null || error === void 0 ? void 0 : error.response) === null || _f === void 0 ? void 0 : _f.data,
            };
        }
    }
    // Status check handlers
    async checkStatusHandler(gatewayCode, config, transactionId) {
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
    async checkStripeStatus(config, transactionId) {
        var _a;
        try {
            const stripe = require('stripe')(config.api_secret);
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
                currency: (_a = session.currency) === null || _a === void 0 ? void 0 : _a.toUpperCase(),
                gateway_response: session,
            };
        }
        catch (error) {
            return {
                success: false,
                transaction_id: transactionId,
                status: 'failed',
                message: error instanceof Error ? error.message : 'Stripe status check failed',
            };
        }
    }
    async checkPayPalStatus(config, transactionId) {
        var _a;
        try {
            const paypal = require('@paypal/checkout-server-sdk');
            const environment = ((_a = config.config) === null || _a === void 0 ? void 0 : _a.sandbox_mode) ?
                new paypal.core.SandboxEnvironment(config.api_key, config.api_secret) :
                new paypal.core.LiveEnvironment(config.api_key, config.api_secret);
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
                message: error instanceof Error ? error.message : 'PayPal status check failed',
            };
        }
    }
    async checkRazorpayStatus(config, transactionId) {
        try {
            const Razorpay = require('razorpay');
            const razorpay = new Razorpay({
                key_id: config.api_key,
                key_secret: config.api_secret,
            });
            const order = await razorpay.orders.fetch(transactionId);
            let status = 'pending';
            if (order.status === 'paid') {
                status = 'completed';
            }
            else if (order.status === 'attempted') {
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
        }
        catch (error) {
            return {
                success: false,
                transaction_id: transactionId,
                status: 'failed',
                message: error instanceof Error ? error.message : 'Razorpay status check failed',
            };
        }
    }
    async checkCryptoStatus(config, transactionId) {
        try {
            const { Client } = require('coinbase-commerce-node');
            const client = new Client({ apiKey: config.api_key });
            const charge = await client.charges.retrieve(transactionId);
            let status = 'pending';
            if (charge.timeline.find((event) => event.status === 'COMPLETED')) {
                status = 'completed';
            }
            else if (charge.timeline.find((event) => event.status === 'EXPIRED')) {
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
        }
        catch (error) {
            return {
                success: false,
                transaction_id: transactionId,
                status: 'failed',
                message: error instanceof Error ? error.message : 'Crypto status check failed',
            };
        }
    }
    async checkOxapayStatus(config, transactionId) {
        var _a, _b, _c;
        try {
            const axios = require('axios');
            const res = await axios.get(`${config.api_endpoint}/merchant/invoice/${transactionId}`, {
                headers: {
                    'general_api_key': config.api_key,
                    'Content-Type': 'application/json'
                }
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
                message: ((_b = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || error.message || 'Oxapay status check failed',
                gateway_response: (_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data,
            };
        }
    }
    // Connection test handlers
    async testConnectionHandler(gatewayCode, config) {
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
    async testStripeConnection(config) {
        try {
            const stripe = require('stripe')(config.api_secret);
            await stripe.paymentMethods.list({ limit: 1 });
            return {
                success: true,
                message: 'Stripe connection successful',
            };
        }
        catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Stripe connection failed',
            };
        }
    }
    async testPayPalConnection(config) {
        var _a;
        try {
            const paypal = require('@paypal/checkout-server-sdk');
            const environment = ((_a = config.config) === null || _a === void 0 ? void 0 : _a.sandbox_mode) ?
                new paypal.core.SandboxEnvironment(config.api_key, config.api_secret) :
                new paypal.core.LiveEnvironment(config.api_key, config.api_secret);
            const client = new paypal.core.PayPalHttpClient(environment);
            const request = new paypal.orders.OrdersGetRequest('test');
            try {
                await client.execute(request);
            }
            catch (error) {
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
                message: error instanceof Error ? error.message : 'PayPal connection failed',
            };
        }
    }
    async testRazorpayConnection(config) {
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
        }
        catch (error) {
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
    async testCryptoConnection(config) {
        try {
            const { Client } = require('coinbase-commerce-node');
            const client = new Client({ apiKey: config.api_key });
            await client.charges.list({ limit: 1 });
            return {
                success: true,
                message: 'Crypto connection successful',
            };
        }
        catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Crypto connection failed',
            };
        }
    }
    async testOxapayConnection(config) {
        var _a, _b, _c, _d, _e, _f;
        try {
            const axios = require('axios');
            // Test with the general API endpoint that we know works
            const res = await axios.post(`${config.api_endpoint}/general/swap`, {
                amount: 0.1,
                from_currency: "USDT",
                to_currency: "USDT"
            }, {
                headers: {
                    'general_api_key': config.api_key,
                    'Content-Type': 'application/json'
                }
            });
            // If we get a response (even with an error), the connection is working
            return { success: true, message: 'Oxapay connection successful' };
        }
        catch (error) {
            // If we get a specific error about balance or invalid data, the connection is working
            if (((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status) === 400 && ((_d = (_c = (_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error) === null || _d === void 0 ? void 0 : _d.key)) {
                return { success: true, message: 'Oxapay connection successful' };
            }
            return { success: false, message: ((_f = (_e = error === null || error === void 0 ? void 0 : error.response) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.message) || error.message || 'Oxapay connection failed' };
        }
    }
    // Get available gateways
    getAvailableGateways() {
        return ['stripe', 'paypal', 'razorpay', 'crypto', 'oxapay', 'igpx'];
    }
    // Get gateway information
    getGatewayInfo(gatewayCode) {
        const supportedGateways = this.getAvailableGateways();
        const isSupported = supportedGateways.includes(gatewayCode.toLowerCase());
        const features = [];
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
    async handleStripeWebhook(config, data, signature) {
        var _a, _b, _c, _d, _e, _f;
        try {
            // Verify webhook signature
            if (signature && config.webhook_secret) {
                const stripe = require('stripe')(config.api_secret);
                const event = stripe.webhooks.constructEvent(JSON.stringify(data), signature, config.webhook_secret);
                data = event;
            }
            const { type, data: eventData } = data;
            let status = 'pending';
            let transactionType = 'deposit';
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
                        transaction_id: ((_a = eventData === null || eventData === void 0 ? void 0 : eventData.object) === null || _a === void 0 ? void 0 : _a.id) || 'unknown',
                        status: 'pending',
                        message: `Unhandled Stripe event: ${type}`
                    };
            }
            return {
                success: true,
                transaction_id: (_b = eventData === null || eventData === void 0 ? void 0 : eventData.object) === null || _b === void 0 ? void 0 : _b.id,
                status: status,
                amount: ((_c = eventData === null || eventData === void 0 ? void 0 : eventData.object) === null || _c === void 0 ? void 0 : _c.amount) ? eventData.object.amount / 100 : 0,
                currency: (_d = eventData === null || eventData === void 0 ? void 0 : eventData.object) === null || _d === void 0 ? void 0 : _d.currency,
                type: transactionType,
                gateway_data: data
            };
        }
        catch (error) {
            return {
                success: false,
                transaction_id: ((_f = (_e = data === null || data === void 0 ? void 0 : data.data) === null || _e === void 0 ? void 0 : _e.object) === null || _f === void 0 ? void 0 : _f.id) || 'unknown',
                status: 'failed',
                message: error instanceof Error ? error.message : 'Stripe webhook processing failed',
                gateway_data: data
            };
        }
    }
    // PayPal Webhook Handler
    async handlePayPalWebhook(config, data, signature) {
        var _a, _b, _c;
        try {
            const { event_type, resource } = data;
            let status = 'pending';
            let transactionType = 'deposit';
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
                        transaction_id: (resource === null || resource === void 0 ? void 0 : resource.id) || 'unknown',
                        status: 'pending',
                        message: `Unhandled PayPal event: ${event_type}`
                    };
            }
            return {
                success: true,
                transaction_id: resource === null || resource === void 0 ? void 0 : resource.id,
                status: status,
                amount: ((_a = resource === null || resource === void 0 ? void 0 : resource.amount) === null || _a === void 0 ? void 0 : _a.value) ? parseFloat(resource.amount.value) : 0,
                currency: (_b = resource === null || resource === void 0 ? void 0 : resource.amount) === null || _b === void 0 ? void 0 : _b.currency_code,
                type: transactionType,
                gateway_data: data
            };
        }
        catch (error) {
            return {
                success: false,
                transaction_id: ((_c = data === null || data === void 0 ? void 0 : data.resource) === null || _c === void 0 ? void 0 : _c.id) || 'unknown',
                status: 'failed',
                message: error instanceof Error ? error.message : 'PayPal webhook processing failed',
                gateway_data: data
            };
        }
    }
    // Razorpay Webhook Handler
    async handleRazorpayWebhook(config, data, signature) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
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
            let status = 'pending';
            let transactionType = 'deposit';
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
                        transaction_id: ((_b = (_a = payload === null || payload === void 0 ? void 0 : payload.payment) === null || _a === void 0 ? void 0 : _a.entity) === null || _b === void 0 ? void 0 : _b.id) || 'unknown',
                        status: 'pending',
                        message: `Unhandled Razorpay event: ${event}`
                    };
            }
            return {
                success: true,
                transaction_id: (_d = (_c = payload === null || payload === void 0 ? void 0 : payload.payment) === null || _c === void 0 ? void 0 : _c.entity) === null || _d === void 0 ? void 0 : _d.id,
                status: status,
                amount: ((_f = (_e = payload === null || payload === void 0 ? void 0 : payload.payment) === null || _e === void 0 ? void 0 : _e.entity) === null || _f === void 0 ? void 0 : _f.amount) ? payload.payment.entity.amount / 100 : 0,
                currency: (_h = (_g = payload === null || payload === void 0 ? void 0 : payload.payment) === null || _g === void 0 ? void 0 : _g.entity) === null || _h === void 0 ? void 0 : _h.currency,
                type: transactionType,
                gateway_data: data
            };
        }
        catch (error) {
            return {
                success: false,
                transaction_id: ((_l = (_k = (_j = data === null || data === void 0 ? void 0 : data.payload) === null || _j === void 0 ? void 0 : _j.payment) === null || _k === void 0 ? void 0 : _k.entity) === null || _l === void 0 ? void 0 : _l.id) || 'unknown',
                status: 'failed',
                message: error instanceof Error ? error.message : 'Razorpay webhook processing failed',
                gateway_data: data
            };
        }
    }
    // Crypto Webhook Handler
    async handleCryptoWebhook(config, data, signature) {
        var _a, _b, _c, _d, _e;
        try {
            const { type, data: eventData } = data;
            let status = 'pending';
            let transactionType = 'deposit';
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
                        transaction_id: (eventData === null || eventData === void 0 ? void 0 : eventData.id) || 'unknown',
                        status: 'pending',
                        message: `Unhandled Crypto event: ${type}`
                    };
            }
            return {
                success: true,
                transaction_id: eventData === null || eventData === void 0 ? void 0 : eventData.id,
                status: status,
                amount: ((_b = (_a = eventData === null || eventData === void 0 ? void 0 : eventData.pricing) === null || _a === void 0 ? void 0 : _a.local) === null || _b === void 0 ? void 0 : _b.amount) ? parseFloat(eventData.pricing.local.amount) : 0,
                currency: (_d = (_c = eventData === null || eventData === void 0 ? void 0 : eventData.pricing) === null || _c === void 0 ? void 0 : _c.local) === null || _d === void 0 ? void 0 : _d.currency,
                type: transactionType,
                gateway_data: data
            };
        }
        catch (error) {
            return {
                success: false,
                transaction_id: ((_e = data === null || data === void 0 ? void 0 : data.data) === null || _e === void 0 ? void 0 : _e.id) || 'unknown',
                status: 'failed',
                message: error instanceof Error ? error.message : 'Crypto webhook processing failed',
                gateway_data: data
            };
        }
    }
    // Oxapay Webhook Handler
    async handleOxapayWebhook(config, data, signature) {
        try {
            const { status: oxapayStatus, invoice_id, amount, currency } = data;
            let status = 'pending';
            let transactionType = 'deposit';
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
        }
        catch (error) {
            return {
                success: false,
                transaction_id: (data === null || data === void 0 ? void 0 : data.invoice_id) || 'unknown',
                status: 'failed',
                message: error instanceof Error ? error.message : 'Oxapay webhook processing failed',
                gateway_data: data
            };
        }
    }
    // IGPX Webhook Handler
    async handleIgpxWebhook(config, data, signature) {
        try {
            // Verify security hash
            if (signature && config.webhook_secret) {
                const crypto = require('crypto');
                const expectedHash = crypto
                    .createHmac('sha256', config.webhook_secret)
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
                transaction_id: (data === null || data === void 0 ? void 0 : data.transaction_id) || 'unknown',
                status: 'failed',
                message: error instanceof Error ? error.message : 'IGPX webhook processing failed',
                gateway_data: data
            };
        }
    }
}
exports.PaymentIntegrationService = PaymentIntegrationService;
