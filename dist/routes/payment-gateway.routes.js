"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validate_1 = require("../middlewares/validate");
const authenticate_1 = require("../middlewares/authenticate");
const authorize_1 = require("../middlewares/authorize");
const admin_schema_1 = require("../api/admin/admin.schema");
const payment_gateway_service_1 = require("../services/admin/payment-gateway.service");
const router = (0, express_1.Router)();
// Create a wrapper for the authorize middleware
const adminAuth = (req, res, next) => {
    (0, authorize_1.authorize)(['Admin'])(req, res, next);
};
// Apply authentication and admin role middleware to all routes
router.use(authenticate_1.authenticate);
router.use(adminAuth);
// =====================================================
// PAYMENT GATEWAY MANAGEMENT ROUTES
// =====================================================
/**
 * @openapi
 * /api/admin/payment-gateways:
 *   post:
 *     summary: Create a new payment gateway
 *     tags:
 *       - Payment Gateways
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 description: Display name of the payment gateway
 *                 example: "Stripe"
 *               code:
 *                 type: string
 *                 description: Unique code for the gateway
 *                 example: "stripe"
 *               type:
 *                 type: string
 *                 enum: [deposit, withdrawal, both]
 *                 description: Type of transactions supported
 *                 example: "both"
 *               description:
 *                 type: string
 *                 description: Description of the payment gateway
 *                 example: "Secure online payment processing"
 *               logo_url:
 *                 type: string
 *                 format: uri
 *                 description: URL to the gateway logo
 *                 example: "https://example.com/stripe-logo.png"
 *               website_url:
 *                 type: string
 *                 format: uri
 *                 description: Gateway website URL
 *                 example: "https://stripe.com"
 *               api_endpoint:
 *                 type: string
 *                 format: uri
 *                 description: API endpoint for the gateway
 *                 example: "https://api.stripe.com/v1"
 *               api_key:
 *                 type: string
 *                 description: API key for authentication
 *                 example: "pk_test_1234567890"
 *               api_secret:
 *                 type: string
 *                 description: API secret for authentication
 *                 example: "sk_test_1234567890"
 *               webhook_url:
 *                 type: string
 *                 format: uri
 *                 description: Webhook URL for notifications
 *                 example: "https://yourdomain.com/webhooks/stripe"
 *               webhook_secret:
 *                 type: string
 *                 description: Secret for webhook verification
 *                 example: "whsec_1234567890"
 *               is_active:
 *                 type: boolean
 *                 description: Whether the gateway is active
 *                 example: true
 *               supported_currencies:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Supported currencies
 *                 example: ["USD", "EUR", "GBP"]
 *               supported_countries:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Supported countries
 *                 example: ["US", "CA", "UK"]
 *               min_amount:
 *                 type: number
 *                 description: Minimum transaction amount
 *                 example: 1.00
 *               max_amount:
 *                 type: number
 *                 description: Maximum transaction amount
 *                 example: 10000.00
 *               processing_time:
 *                 type: string
 *                 description: Expected processing time
 *                 example: "1-3 business days"
 *               fees_percentage:
 *                 type: number
 *                 description: Percentage fee
 *                 example: 2.9
 *               fees_fixed:
 *                 type: number
 *                 description: Fixed fee amount
 *                 example: 0.30
 *               auto_approval:
 *                 type: boolean
 *                 description: Whether transactions are auto-approved
 *                 example: false
 *               requires_kyc:
 *                 type: boolean
 *                 description: Whether KYC is required
 *                 example: true
 *               config:
 *                 type: object
 *                 description: Additional configuration
 *                 example: {"sandbox_mode": true}
 *     responses:
 *       201:
 *         description: Payment gateway created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "Stripe"
 *                     code:
 *                       type: string
 *                       example: "stripe"
 *                     type:
 *                       type: string
 *                       example: "both"
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Gateway code already exists
 */
router.post("/payment-gateways", (0, validate_1.validate)({ body: admin_schema_1.CreatePaymentGatewayInput }), async (req, res) => {
    try {
        const gatewayData = req.validated?.body;
        const gateway = await (0, payment_gateway_service_1.createPaymentGatewayService)(gatewayData);
        res.status(201).json({ success: true, data: gateway });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @openapi
 * /api/admin/payment-gateways:
 *   get:
 *     summary: Get all payment gateways with filtering
 *     tags:
 *       - Payment Gateways
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [deposit, withdrawal, both]
 *         description: Filter by transaction type
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: supported_currency
 *         schema:
 *           type: string
 *         description: Filter by supported currency
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or code
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Payment gateways retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       code:
 *                         type: string
 *                       type:
 *                         type: string
 *                       is_active:
 *                         type: boolean
 *                       supported_currencies:
 *                         type: array
 *                         items:
 *                           type: string
 *       401:
 *         description: Unauthorized
 */
router.get("/payment-gateways", (0, validate_1.validate)({ query: admin_schema_1.PaymentGatewayFiltersInput }), async (req, res) => {
    try {
        const filters = req.query;
        const gateways = await (0, payment_gateway_service_1.getPaymentGatewaysService)(filters);
        res.status(200).json({ success: true, data: gateways });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @openapi
 * /api/admin/payment-gateways/{id}:
 *   get:
 *     summary: Get payment gateway by ID
 *     tags:
 *       - Payment Gateways
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment gateway ID
 *     responses:
 *       200:
 *         description: Payment gateway retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     code:
 *                       type: string
 *                     type:
 *                       type: string
 *                     api_endpoint:
 *                       type: string
 *                     is_active:
 *                       type: boolean
 *                     supported_currencies:
 *                       type: array
 *                       items:
 *                         type: string
 *       404:
 *         description: Payment gateway not found
 *       401:
 *         description: Unauthorized
 */
router.get("/payment-gateways/:id", async (req, res) => {
    try {
        const gatewayId = parseInt(req.params.id);
        if (isNaN(gatewayId)) {
            res.status(400).json({ success: false, message: "Invalid gateway ID" });
            return;
        }
        const gateway = await (0, payment_gateway_service_1.getPaymentGatewayByIdService)(gatewayId);
        if (!gateway) {
            res.status(404).json({ success: false, message: "Payment gateway not found" });
            return;
        }
        res.status(200).json({ success: true, data: gateway });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @openapi
 * /api/admin/payment-gateways/{id}:
 *   put:
 *     summary: Update payment gateway
 *     tags:
 *       - Payment Gateways
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment gateway ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePaymentGatewayInput'
 *     responses:
 *       200:
 *         description: Payment gateway updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Payment gateway not found
 *       401:
 *         description: Unauthorized
 */
router.put("/payment-gateways/:id", (0, validate_1.validate)({ body: admin_schema_1.UpdatePaymentGatewayInput }), async (req, res) => {
    try {
        const gatewayId = parseInt(req.params.id);
        if (isNaN(gatewayId)) {
            res.status(400).json({ success: false, message: "Invalid gateway ID" });
            return;
        }
        const gatewayData = req.validated?.body;
        const gateway = await (0, payment_gateway_service_1.updatePaymentGatewayService)(gatewayId, gatewayData);
        res.status(200).json({ success: true, data: gateway });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @openapi
 * /api/admin/payment-gateways/{id}:
 *   delete:
 *     summary: Delete payment gateway
 *     tags:
 *       - Payment Gateways
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment gateway ID
 *     responses:
 *       200:
 *         description: Payment gateway deleted successfully
 *       404:
 *         description: Payment gateway not found
 *       401:
 *         description: Unauthorized
 */
router.delete("/payment-gateways/:id", async (req, res) => {
    try {
        const gatewayId = parseInt(req.params.id);
        if (isNaN(gatewayId)) {
            res.status(400).json({ success: false, message: "Invalid gateway ID" });
            return;
        }
        const gateway = await (0, payment_gateway_service_1.deletePaymentGatewayService)(gatewayId);
        if (!gateway) {
            res.status(404).json({ success: false, message: "Payment gateway not found" });
            return;
        }
        res.status(200).json({ success: true, data: gateway });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @openapi
 * /api/admin/payment-gateways/active:
 *   get:
 *     summary: Get active payment gateways for specific type and currency
 *     tags:
 *       - Payment Gateways
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [deposit, withdrawal, both]
 *         description: Transaction type
 *       - in: query
 *         name: currency
 *         required: true
 *         schema:
 *           type: string
 *         description: Currency code
 *     responses:
 *       200:
 *         description: Active payment gateways retrieved successfully
 *       400:
 *         description: Type and currency are required
 *       401:
 *         description: Unauthorized
 */
router.get("/payment-gateways/active", async (req, res) => {
    try {
        const { type, currency } = req.query;
        if (!type || !currency) {
            res.status(400).json({ success: false, message: "Type and currency are required" });
            return;
        }
        const gateways = await (0, payment_gateway_service_1.getActivePaymentGatewaysService)(type, currency);
        res.status(200).json({ success: true, data: gateways });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @openapi
 * /api/admin/payment-gateways/{id}/test:
 *   post:
 *     summary: Test payment gateway connection
 *     tags:
 *       - Payment Gateways
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment gateway ID
 *     responses:
 *       200:
 *         description: Connection test completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     connected:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: "Connection successful"
 *       404:
 *         description: Payment gateway not found
 *       401:
 *         description: Unauthorized
 */
router.post("/payment-gateways/:id/test", async (req, res) => {
    try {
        const gatewayId = parseInt(req.params.id);
        if (isNaN(gatewayId)) {
            res.status(400).json({ success: false, message: "Invalid gateway ID" });
            return;
        }
        const result = await (0, payment_gateway_service_1.testPaymentGatewayConnectionService)(gatewayId);
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @openapi
 * /api/admin/payment-gateways/{id}/stats:
 *   get:
 *     summary: Get payment gateway statistics
 *     tags:
 *       - Payment Gateways
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment gateway ID
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     gateway_name:
 *                       type: string
 *                     total_transactions:
 *                       type: integer
 *                     total_amount:
 *                       type: number
 *                     completed_transactions:
 *                       type: integer
 *                     pending_transactions:
 *                       type: integer
 *                     failed_transactions:
 *                       type: integer
 *                     avg_transaction_amount:
 *                       type: number
 *       404:
 *         description: Payment gateway not found
 *       401:
 *         description: Unauthorized
 */
router.get("/payment-gateways/:id/stats", async (req, res) => {
    try {
        const gatewayId = parseInt(req.params.id);
        if (isNaN(gatewayId)) {
            res.status(400).json({ success: false, message: "Invalid gateway ID" });
            return;
        }
        const { start_date, end_date } = req.query;
        const stats = await (0, payment_gateway_service_1.getPaymentGatewayStatsService)(gatewayId, start_date, end_date);
        res.status(200).json({ success: true, data: stats });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.default = router;
