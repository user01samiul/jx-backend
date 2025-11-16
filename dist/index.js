"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const app_1 = __importDefault(require("./app"));
const config_1 = require("./configs/config");
const swagger_1 = require("./swagger");
const cron_manager_service_1 = require("./services/cron/cron-manager.service");
const chat_socket_service_1 = require("./services/chat/chat-socket.service");
const enterprise_cron_service_1 = __importDefault(require("./services/cron/enterprise-cron.service"));
const PORT = Number(config_1.Config.port) || 3000;
// Setup Swagger with the configured app
(0, swagger_1.setupSwagger)(app_1.default);
// Create HTTP server (needed for WebSocket)
const httpServer = (0, http_1.createServer)(app_1.default);
// Initialize WebSocket chat service
const chatSocketService = new chat_socket_service_1.ChatSocketService(httpServer);
console.log('✅ WebSocket Chat Service initialized');
// Start server
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WebSocket server running on ws://localhost:${PORT}`);
    // Start background cron jobs for RTP auto-adjustment (only once)
    console.log('[APP] Starting background cron jobs...');
    cron_manager_service_1.CronManagerService.startAllCronJobs();
    console.log('[APP] Background cron jobs initialized');
    // Start enterprise feature cron jobs
    console.log('[APP] Starting enterprise cron jobs...');
    enterprise_cron_service_1.default.start();
    console.log('[APP] Enterprise cron jobs initialized');
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    enterprise_cron_service_1.default.stop();
    await chatSocketService.shutdown();
    httpServer.close(() => {
        console.log('HTTP server closed');
    });
});
