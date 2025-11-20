"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const api_1 = __importDefault(require("./routes/api"));
// Routes
const admin_modules_routes_1 = __importDefault(require("./routes/admin-modules.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const affiliate_routes_1 = __importDefault(require("./routes/affiliate.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const crm_routes_1 = __importDefault(require("./routes/crm.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const enhanced_affiliate_routes_1 = __importDefault(require("./routes/enhanced-affiliate.routes"));
const isoftbet_proxy_routes_1 = __importDefault(require("./routes/isoftbet-proxy.routes"));
const jxoriginals_routes_1 = __importDefault(require("./routes/jxoriginals.routes"));
const manager_routes_1 = __importDefault(require("./routes/manager.routes"));
const role_routes_1 = __importDefault(require("./routes/role.routes"));
const support_ticket_routes_1 = __importDefault(require("./routes/support-ticket.routes"));
const support_user_routes_1 = __importDefault(require("./routes/support-user.routes"));
const user_management_routes_1 = __importDefault(require("./routes/user-management.routes"));
const withdrawal_routes_1 = __importDefault(require("./routes/withdrawal.routes"));
// import userRoutes from "./api/user/user.routes";
// Middleware
const mongo_1 = require("./db/mongo");
const errorHandler_1 = __importDefault(require("./middlewares/errorHandler"));
// Enhanced rate limiting and monitoring
const rate_limiter_middleware_1 = require("./middlewares/rate-limiter.middleware");
const health_monitor_service_1 = require("./services/health/health-monitor.service");
const app = (0, express_1.default)();
(async () => {
    await (0, mongo_1.connectMongo)();
})();
app.set("trust proxy", 1);
// Start health monitoring
health_monitor_service_1.HealthMonitorService.startMonitoring();
// 1. CORS - allow all origins
app.use((0, cors_1.default)({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "device-id", "Cache-Control", "Pragma", "X-Requested-With"],
    maxAge: 3600
}));
// 2. THEN all other middleware and routes
// Use helmet with custom CSP for Swagger UI compatibility
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://static.cloudflareinsights.com", "'unsafe-inline'"],
            styleSrc: ["'self'", "https:", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https:", "wss:", "https://static.cloudflareinsights.com"],
            fontSrc: ["'self'", "https:", "data:"],
            objectSrc: ["'none'"],
        },
    },
}));
app.use((0, compression_1.default)());
// Middleware to capture raw body for IGPX webhook signature verification
app.use('/api/payment/webhook/igpx', express_1.default.json({
    verify: (req, res, buf, encoding) => {
        req.rawBody = buf.toString(encoding || 'utf8');
    }
}));
// Middleware to capture raw body for IGPX callback endpoints
app.use('/igpx', express_1.default.json({
    verify: (req, res, buf, encoding) => {
        req.rawBody = buf.toString(encoding || 'utf8');
    }
}));
app.use('/igpx/transaction', express_1.default.json({
    verify: (req, res, buf, encoding) => {
        req.rawBody = buf.toString(encoding || 'utf8');
    }
}));
app.use('/igpx/transaction-rollback', express_1.default.json({
    verify: (req, res, buf, encoding) => {
        req.rawBody = buf.toString(encoding || 'utf8');
    }
}));
// Regular JSON parser for all other routes
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// Global debug log for all incoming requests (after body parser)
app.use((req, res, next) => {
    console.log('[APP DEBUG] Incoming request:', req.method, req.originalUrl, 'body:', JSON.stringify(req.body));
    next();
});
// Enhanced middleware stack for Cloudflare compatibility
app.use(rate_limiter_middleware_1.cloudflareHeadersMiddleware);
app.use(rate_limiter_middleware_1.errorTrackingMiddleware);
app.use(rate_limiter_middleware_1.circuitBreakerMiddleware);
// Request tracking for health monitoring
app.use((req, res, next) => {
    health_monitor_service_1.HealthMonitorService.incrementRequestCount();
    // Track Cloudflare requests
    if (req.headers['cf-ray'] || req.headers['cf-connecting-ip']) {
        health_monitor_service_1.HealthMonitorService.incrementCloudflareRequests();
    }
    next();
});
// Global rate limiter with enhanced Cloudflare support
app.use(rate_limiter_middleware_1.standardRateLimiter);
const env = process.env.NODE_ENV || "development";
if (env === "production") {
    const accessLogStream = fs_1.default.createWriteStream(path_1.default.join(process.cwd(), "access.log"), { flags: "a" });
    app.use((0, morgan_1.default)("combined", { stream: accessLogStream }));
}
else {
    app.use((0, morgan_1.default)("dev"));
}
// Serve static files for uploads (avatars, banners, etc.)
app.use('/user/avatar', express_1.default.static(path_1.default.join(process.cwd(), 'uploads/avatars')));
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
// IGPX callback handler (reusable for all endpoints)
const handleIgpxCallback = async (req, res, endpointName) => {
    try {
        const callbackData = req.body;
        const securityHash = req.headers['x-security-hash'];
        console.log(`[IGPX] Callback received at ${endpointName}:`, {
            action: callbackData.action,
            user_id: callbackData.user_id,
            amount: callbackData.amount,
            transaction_id: callbackData.transaction_id,
            hasSignature: !!securityHash
        });
        // Get raw body for HMAC verification
        const rawBody = req.rawBody || JSON.stringify(req.body);
        // Get IGPX gateway configuration
        const { getPaymentGatewayByCodeService } = require("./services/admin/payment-gateway.service");
        const gateway = await getPaymentGatewayByCodeService('igpx');
        if (!gateway || !gateway.is_active) {
            console.error('[IGPX] Gateway not found or inactive');
            res.status(400).json({ error: "IGPX gateway not available" });
            return;
        }
        // Use IgpxCallbackService for proper callback handling
        const { IgpxCallbackService } = require("./services/payment/igpx-callback.service");
        const igpxService = IgpxCallbackService.getInstance();
        // Process callback using the callback service
        const response = await igpxService.processCallback(callbackData, securityHash || '', gateway.webhook_secret || '');
        console.log(`[IGPX] Callback processed at ${endpointName}:`, response);
        // Return response in IGPX format
        res.status(200).json(response);
    }
    catch (error) {
        console.error(`[IGPX] Callback error at ${endpointName}:`, error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
};
// IGPX callback endpoints at root level (before /api routes)
app.post('/igpx', (req, res) => handleIgpxCallback(req, res, '/igpx'));
app.post('/igpx/transaction', (req, res) => handleIgpxCallback(req, res, '/igpx/transaction'));
app.post('/igpx/transaction-rollback', (req, res) => handleIgpxCallback(req, res, '/igpx/transaction-rollback'));
// 3. ROUTES AFTER CORS
app.use("/api", api_1.default);
// Apply rate limiter to auth routes
app.use("/api/auth", rate_limiter_middleware_1.authRateLimiter, auth_routes_1.default);
// Affiliate routes
app.use("/api/affiliate", affiliate_routes_1.default);
// Enhanced affiliate routes
app.use("/api/enhanced-affiliate", enhanced_affiliate_routes_1.default);
// Manager routes
app.use("/api/manager", manager_routes_1.default);
// Admin modules routes
app.use("/api/admin-modules", admin_modules_routes_1.default);
// Admin routes
app.use("/api/admin", admin_routes_1.default);
// CRM routes (Player 360 View, Support, VIP Management)
app.use("/api/admin/crm", crm_routes_1.default);
// Dashboard routes (Statistics, Metrics, Real-time data)
app.use("/api/admin/dashboard", dashboard_routes_1.default);
// Chat routes (Live Chat System with WebSocket support)
app.use("/api/chat", chat_routes_1.default);
// Support User Management routes (Admin only)
app.use("/api/admin/support-users", support_user_routes_1.default);
// Role Management routes (Admin only)
app.use("/api/admin/roles", role_routes_1.default);
// User Management routes (Admin & Support)
app.use("/api/admin/users", user_management_routes_1.default);
// Support Ticket routes (Player-facing ticketing system)
app.use("/api/support", support_ticket_routes_1.default);
// JxOriginals routes (Internal games with full source code)
app.use("/api/jxoriginals", jxoriginals_routes_1.default);
// ISoftBet XML Proxy (mimics gpm.isoftbet.com for ISB games)
app.use("/generate-xml", isoftbet_proxy_routes_1.default);
// Withdrawal routes
app.use("/api/withdrawals", withdrawal_routes_1.default);
// Callback Filter routes (GGR Control - Admin only)
const callback_filter_routes_1 = __importDefault(require("./routes/admin/callback-filter.routes"));
const free_spins_campaigns_routes_1 = __importDefault(require("./routes/admin/free-spins-campaigns.routes"));
app.use("/api/admin/callback-filter", callback_filter_routes_1.default);
app.use("/api/admin/free-spins-campaigns", free_spins_campaigns_routes_1.default);
// Campaigns routes (Free Spins / Bonus API)
const campaigns_1 = __importDefault(require("./routes/campaigns"));
app.use("/api/campaigns", campaigns_1.default);
// Jackpots routes
const jackpots_1 = __importDefault(require("./routes/jackpots"));
app.use("/api/jackpots", jackpots_1.default);
// Tournaments routes
const tournaments_1 = __importDefault(require("./routes/tournaments"));
app.use("/api/tournaments", tournaments_1.default);
// Innova Webhooks routes (Receive notifications from Innova)
const innova_webhooks_routes_1 = __importDefault(require("./routes/innova-webhooks.routes"));
app.use("/api/innova/webhooks", innova_webhooks_routes_1.default);
// Widget Authentication (Secure key generation for Innova SDK)
const widget_auth_routes_1 = __importDefault(require("./routes/widget-auth.routes"));
app.use("/api/widget-auth", widget_auth_routes_1.default);
// Enterprise Features - Challenges routes
const challenges_routes_1 = __importDefault(require("./routes/challenges.routes"));
app.use("/api/challenges", challenges_routes_1.default);
// Enterprise Features - Loyalty routes
const loyalty_routes_1 = __importDefault(require("./routes/loyalty.routes"));
app.use("/api/loyalty", loyalty_routes_1.default);
// Enterprise Features - Mini Games routes
const mini_games_routes_1 = __importDefault(require("./routes/mini-games.routes"));
app.use("/api/mini-games", mini_games_routes_1.default);
// Enterprise Features - Personal Jackpots routes
const personal_jackpots_routes_1 = __importDefault(require("./routes/personal-jackpots.routes"));
app.use("/api/personal-jackpots", personal_jackpots_routes_1.default);
// Enterprise Features - Risk Management routes
const risk_management_routes_1 = __importDefault(require("./routes/risk-management.routes"));
app.use("/api/risk", risk_management_routes_1.default);
// Enterprise Features - Custom Reports routes
const reports_routes_1 = __importDefault(require("./routes/reports.routes"));
app.use("/api/reports", reports_routes_1.default);
// Enterprise Features - Dashboard & Integration
const enterprise_dashboard_routes_1 = __importDefault(require("./routes/enterprise-dashboard.routes"));
app.use("/api/enterprise", enterprise_dashboard_routes_1.default);
// =====================================================
// NEW ENTERPRISE FEATURES (Compliance & International)
// =====================================================
const ip_tracking_middleware_1 = require("./middlewares/ip-tracking.middleware");
const metadata_routes_1 = __importDefault(require("./routes/metadata.routes"));
const multilanguage_routes_1 = __importDefault(require("./routes/multilanguage.routes"));
const responsible_gaming_routes_1 = __importDefault(require("./routes/responsible-gaming.routes"));
// Apply IP security middleware globally
app.use(ip_tracking_middleware_1.checkBlockedIP);
app.use(ip_tracking_middleware_1.checkGeoRestriction);
// Metadata APIs (Currencies, Countries, Mobile Prefixes)
app.use("/api/metadata", metadata_routes_1.default);
// Multilanguage APIs (Translations, Languages)
app.use("/api/multilanguage", multilanguage_routes_1.default);
// Responsible Gaming APIs (Deposit Limits, Self-Exclusion)
app.use("/api/responsible-gaming", responsible_gaming_routes_1.default);
console.log('✅ Enterprise Features Loaded: Metadata, Multilanguage, Responsible Gaming');
// Provider callback routes at root level for legacy support
const provider_callback_routes_1 = __importDefault(require("./routes/provider-callback.routes"));
// Apply provider rate limiter to both root and API routes
app.use("/innova", rate_limiter_middleware_1.providerRateLimiter, provider_callback_routes_1.default);
// Temporary legacy support for old /api/innova endpoints
app.use("/api/innova", rate_limiter_middleware_1.providerRateLimiter, provider_callback_routes_1.default);
// TEMP: List all registered routes for debugging
app.get('/routes', (req, res) => {
    const routes = [];
    app._router.stack.forEach((middleware) => {
        if (middleware.route) { // routes registered directly on the app
            routes.push(middleware.route);
        }
        else if (middleware.name === 'router' && middleware.handle && middleware.handle.stack) { // router middleware 
            middleware.handle.stack.forEach((handler) => {
                if (handler.route) {
                    routes.push(handler.route);
                }
            });
        }
    });
    res.json(routes.map(r => Object.keys(r.methods).map(m => m.toUpperCase() + ' ' + r.path)).flat());
});
// Enhanced health check endpoints
app.get('/health', (_req, res) => {
    const healthStatus = health_monitor_service_1.HealthMonitorService.getHealthStatus();
    res.json(healthStatus);
});
app.get('/health/detailed', (_req, res) => {
    const detailedMetrics = health_monitor_service_1.HealthMonitorService.getDetailedMetrics();
    const circuitBreakerStatus = (0, rate_limiter_middleware_1.getCircuitBreakerStatus)();
    const cloudflareMetrics = health_monitor_service_1.HealthMonitorService.getCloudflareMetrics();
    res.json({
        status: 'OK',
        timestamp: new Date(),
        metrics: detailedMetrics,
        circuitBreaker: circuitBreakerStatus,
        cloudflare: cloudflareMetrics
    });
});
app.get('/health/cloudflare', (_req, res) => {
    const cloudflareMetrics = health_monitor_service_1.HealthMonitorService.getCloudflareMetrics();
    res.json({
        status: 'OK',
        timestamp: new Date(),
        cloudflare: cloudflareMetrics
    });
});
// app.use("/api/users", userRoutes);
// Error handler (should be last)
app.use(errorHandler_1.default);
exports.default = app;
