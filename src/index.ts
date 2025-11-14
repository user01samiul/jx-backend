import { createServer } from 'http';
import app from "./app";
import { Config } from "./configs/config";
import { setupSwagger } from "./swagger";
import { CronManagerService } from "./services/cron/cron-manager.service";
import { ChatSocketService } from "./services/chat/chat-socket.service";
import EnterpriseCronService from "./services/cron/enterprise-cron.service";

const PORT = Config.port || 3000;

// Setup Swagger with the configured app
setupSwagger(app);

// Create HTTP server (needed for WebSocket)
const httpServer = createServer(app);

// Initialize WebSocket chat service
const chatSocketService = new ChatSocketService(httpServer);
console.log('✅ WebSocket Chat Service initialized');

// Start server
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);

  // Start background cron jobs for RTP auto-adjustment (only once)
  console.log('[APP] Starting background cron jobs...');
  CronManagerService.startAllCronJobs();
  console.log('[APP] Background cron jobs initialized');

  // Start enterprise feature cron jobs
  console.log('[APP] Starting enterprise cron jobs...');
  EnterpriseCronService.start();
  console.log('[APP] Enterprise cron jobs initialized');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  EnterpriseCronService.stop();
  await chatSocketService.shutdown();
  httpServer.close(() => {
    console.log('HTTP server closed');
  });
});