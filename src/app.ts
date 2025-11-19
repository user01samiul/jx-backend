import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import fs from "fs";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import apiRoutes from "./routes/api";
// Routes
import adminModulesRoutes from "./routes/admin-modules.routes";
import adminRoutes from "./routes/admin.routes";
import affiliateRoutes from "./routes/affiliate.routes";
import authRoutes from "./routes/auth.routes";
import chatRoutes from "./routes/chat.routes";
import crmRoutes from "./routes/crm.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import enhancedAffiliateRoutes from "./routes/enhanced-affiliate.routes";
import isoftbetProxyRoutes from "./routes/isoftbet-proxy.routes";
import jxOriginalsRoutes from "./routes/jxoriginals.routes";
import managerRoutes from "./routes/manager.routes";
import roleRoutes from "./routes/role.routes";
import supportTicketRoutes from "./routes/support-ticket.routes";
import supportUserRoutes from "./routes/support-user.routes";
import userManagementRoutes from "./routes/user-management.routes";
import withdrawalRoutes from "./routes/withdrawal.routes";
// import userRoutes from "./api/user/user.routes";

// Middleware
import { connectMongo } from "./db/mongo";
import errorHandler from "./middlewares/errorHandler";

// Enhanced rate limiting and monitoring
import {
  authRateLimiter,
  circuitBreakerMiddleware,
  cloudflareHeadersMiddleware,
  errorTrackingMiddleware,
  getCircuitBreakerStatus,
  providerRateLimiter,
  standardRateLimiter
} from "./middlewares/rate-limiter.middleware";
import { HealthMonitorService } from "./services/health/health-monitor.service";

const app: Application = express();
(async () => {
  await connectMongo();
})();

app.set("trust proxy", 1);

// Start health monitoring
HealthMonitorService.startMonitoring();

// 1. CORS - allow all origins
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "device-id", "Cache-Control", "Pragma", "X-Requested-With"],
    maxAge: 3600
  })
);

// 2. THEN all other middleware and routes
// Use helmet with custom CSP for Swagger UI compatibility
app.use(
  helmet({
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
  })
);
app.use(compression());

// Middleware to capture raw body for IGPX webhook signature verification
app.use('/api/payment/webhook/igpx', express.json({
  verify: (req: any, res, buf, encoding) => {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
}));

// Regular JSON parser for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Global debug log for all incoming requests (after body parser)
app.use((req, res, next) => {
  console.log('[APP DEBUG] Incoming request:', req.method, req.originalUrl, 'body:', JSON.stringify(req.body));
  next();
});

// Enhanced middleware stack for Cloudflare compatibility
app.use(cloudflareHeadersMiddleware);
app.use(errorTrackingMiddleware);
app.use(circuitBreakerMiddleware);

// Request tracking for health monitoring
app.use((req: Request, res: Response, next) => {
  HealthMonitorService.incrementRequestCount();
  
  // Track Cloudflare requests
  if (req.headers['cf-ray'] || req.headers['cf-connecting-ip']) {
    HealthMonitorService.incrementCloudflareRequests();
  }
  
  next();
});

// Global rate limiter with enhanced Cloudflare support
app.use(standardRateLimiter);

const env = process.env.NODE_ENV || "development";
if (env === "production") {
  const accessLogStream = fs.createWriteStream(
    path.join(process.cwd(), "access.log"),
    { flags: "a" }
  );
  app.use(morgan("combined", { stream: accessLogStream }));
} else {
  app.use(morgan("dev"));
}

// Serve static files for uploads (avatars, banners, etc.)
app.use('/user/avatar', express.static(path.join(process.cwd(), 'uploads/avatars')));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// 3. ROUTES AFTER CORS
app.use("/api", apiRoutes);

// Apply rate limiter to auth routes
app.use("/api/auth", authRateLimiter, authRoutes);

// Affiliate routes
app.use("/api/affiliate", affiliateRoutes);

// Enhanced affiliate routes
app.use("/api/enhanced-affiliate", enhancedAffiliateRoutes);

// Manager routes
app.use("/api/manager", managerRoutes);

// Admin modules routes
app.use("/api/admin-modules", adminModulesRoutes);

// Admin routes
app.use("/api/admin", adminRoutes);

// CRM routes (Player 360 View, Support, VIP Management)
app.use("/api/admin/crm", crmRoutes);

// Dashboard routes (Statistics, Metrics, Real-time data)
app.use("/api/admin/dashboard", dashboardRoutes);

// Chat routes (Live Chat System with WebSocket support)
app.use("/api/chat", chatRoutes);

// Support User Management routes (Admin only)
app.use("/api/admin/support-users", supportUserRoutes);

// Role Management routes (Admin only)
app.use("/api/admin/roles", roleRoutes);

// User Management routes (Admin & Support)
app.use("/api/admin/users", userManagementRoutes);

// Support Ticket routes (Player-facing ticketing system)
app.use("/api/support", supportTicketRoutes);

// JxOriginals routes (Internal games with full source code)
app.use("/api/jxoriginals", jxOriginalsRoutes);

// ISoftBet XML Proxy (mimics gpm.isoftbet.com for ISB games)
app.use("/generate-xml", isoftbetProxyRoutes);

// Withdrawal routes
app.use("/api/withdrawals", withdrawalRoutes);

// Callback Filter routes (GGR Control - Admin only)
import callbackFilterRoutes from "./routes/admin/callback-filter.routes";
import freeSpinsCampaignsRoutes from "./routes/admin/free-spins-campaigns.routes";
app.use("/api/admin/callback-filter", callbackFilterRoutes);
app.use("/api/admin/free-spins-campaigns", freeSpinsCampaignsRoutes);

// Campaigns routes (Free Spins / Bonus API)
import campaignsRoutes from "./routes/campaigns";
app.use("/api/campaigns", campaignsRoutes);

// Jackpots routes
import jackpotsRoutes from "./routes/jackpots";
app.use("/api/jackpots", jackpotsRoutes);

// Tournaments routes
import tournamentsRoutes from "./routes/tournaments";
app.use("/api/tournaments", tournamentsRoutes);

// Innova Webhooks routes (Receive notifications from Innova)
import innovaWebhooksRoutes from "./routes/innova-webhooks.routes";
app.use("/api/innova/webhooks", innovaWebhooksRoutes);

// Widget Authentication (Secure key generation for Innova SDK)
import widgetAuthRoutes from "./routes/widget-auth.routes";
app.use("/api/widget-auth", widgetAuthRoutes);

// Enterprise Features - Challenges routes
import challengesRoutes from "./routes/challenges.routes";
app.use("/api/challenges", challengesRoutes);

// Enterprise Features - Loyalty routes
import loyaltyRoutes from "./routes/loyalty.routes";
app.use("/api/loyalty", loyaltyRoutes);

// Enterprise Features - Mini Games routes
import miniGamesRoutes from "./routes/mini-games.routes";
app.use("/api/mini-games", miniGamesRoutes);

// Enterprise Features - Personal Jackpots routes
import personalJackpotsRoutes from "./routes/personal-jackpots.routes";
app.use("/api/personal-jackpots", personalJackpotsRoutes);

// Enterprise Features - Risk Management routes
import riskManagementRoutes from "./routes/risk-management.routes";
app.use("/api/risk", riskManagementRoutes);

// Enterprise Features - Custom Reports routes
import reportsRoutes from "./routes/reports.routes";
app.use("/api/reports", reportsRoutes);

// Enterprise Features - Dashboard & Integration
import enterpriseDashboardRoutes from "./routes/enterprise-dashboard.routes";
app.use("/api/enterprise", enterpriseDashboardRoutes);

// =====================================================
// NEW ENTERPRISE FEATURES (Compliance & International)
// =====================================================
import { checkBlockedIP, checkGeoRestriction } from "./middlewares/ip-tracking.middleware";
import metadataRoutes from "./routes/metadata.routes";
import multilanguageRoutes from "./routes/multilanguage.routes";
import responsibleGamingRoutes from "./routes/responsible-gaming.routes";

// Apply IP security middleware globally
app.use(checkBlockedIP);
app.use(checkGeoRestriction);

// Metadata APIs (Currencies, Countries, Mobile Prefixes)
app.use("/api/metadata", metadataRoutes);

// Multilanguage APIs (Translations, Languages)
app.use("/api/multilanguage", multilanguageRoutes);

// Responsible Gaming APIs (Deposit Limits, Self-Exclusion)
app.use("/api/responsible-gaming", responsibleGamingRoutes);

console.log('✅ Enterprise Features Loaded: Metadata, Multilanguage, Responsible Gaming');

// Provider callback routes at root level for legacy support
import providerCallbackRoutes from "./routes/provider-callback.routes";

// Apply provider rate limiter to both root and API routes
app.use("/innova", providerRateLimiter, providerCallbackRoutes);

// Temporary legacy support for old /api/innova endpoints
app.use("/api/innova", providerRateLimiter, providerCallbackRoutes);

// TEMP: List all registered routes for debugging
app.get('/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) { // routes registered directly on the app
      routes.push(middleware.route);
    } else if (middleware.name === 'router' && middleware.handle && middleware.handle.stack) { // router middleware 
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
app.get('/health', (_req: Request, res: Response) => {
  const healthStatus = HealthMonitorService.getHealthStatus();
  res.json(healthStatus);
});

app.get('/health/detailed', (_req: Request, res: Response) => {
  const detailedMetrics = HealthMonitorService.getDetailedMetrics();
  const circuitBreakerStatus = getCircuitBreakerStatus();
  const cloudflareMetrics = HealthMonitorService.getCloudflareMetrics();
  
  res.json({
    status: 'OK',
    timestamp: new Date(),
    metrics: detailedMetrics,
    circuitBreaker: circuitBreakerStatus,
    cloudflare: cloudflareMetrics
  });
});

app.get('/health/cloudflare', (_req: Request, res: Response) => {
  const cloudflareMetrics = HealthMonitorService.getCloudflareMetrics();
  res.json({
    status: 'OK',
    timestamp: new Date(),
    cloudflare: cloudflareMetrics
  });
});
// app.use("/api/users", userRoutes);

// Error handler (should be last)
app.use(errorHandler);

export default app;