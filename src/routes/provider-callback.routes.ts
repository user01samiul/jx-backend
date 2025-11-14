import { Router, Request, Response } from 'express';
import { ProviderCallbackService } from '../services/provider/provider-callback.service';

const router = Router();

// Enhanced debug logging middleware for all POST requests
router.use((req, res, next) => {
  if (req.method === 'POST') {
    console.log('[PROVIDER DEBUG]', {
      path: req.originalUrl,
      method: req.method,
      headers: req.headers,
      body: req.body,
      timestamp: new Date().toISOString()
    });
  }
  next();
});

// Generic handler for all provider callback endpoints
const handleProviderCallback = async (req: Request, res: Response) => {
  console.log('[ROUTE DEBUG] /innova route handler hit - VERSION 3.0');
  console.log('[ROUTE DEBUG] Request path:', req.path);
  console.log('[ROUTE DEBUG] Request method:', req.method);
  console.log('[ROUTE DEBUG] Request body:', JSON.stringify(req.body, null, 2));
  try {
    console.log('Provider callback received:', {
      path: req.path,
      method: req.method,
      headers: req.headers,
      body: req.body,
      timestamp: new Date().toISOString()
    });

    // Handle GET requests (like ping) differently
    if (req.method === 'GET') {
      // For GET requests, just call the ping handler
      const response = await ProviderCallbackService.handlePing();
      return res.json(response);
    }

    // For POST requests, validate request structure
    const { command, request_timestamp, hash, data } = req.body;

    if (!command || !request_timestamp || !hash || !data) {
      console.error('Invalid request structure:', { command, request_timestamp, hash, data });
      return res.status(400).json({
        status: 'ERROR',
        response_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        error_code: 'OP_21',
        error_message: 'Invalid request structure'
      });
    }

    // Get authorization header
    const authHeader = req.headers['x-authorization'] as string;
    if (!authHeader) {
      console.error('Missing X-Authorization header');
      return res.status(403).json({
        status: 'ERROR',
        response_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        error_code: 'OP_99',
        error_message: 'Missing X-Authorization header'
      });
    }

    console.log('Processing provider callback:', { command, data });

    // Handle the request
    const response = await ProviderCallbackService.handleRequest(req.body, authHeader);

    // Log the provider response for debugging
    console.log('PROVIDER RESPONSE OUTPUT:', JSON.stringify(response, null, 2));

    console.log('Provider callback response:', JSON.stringify(response, null, 2));

    // Return response
    res.json(response);

  } catch (error) {
    console.error('Provider callback error:', error);
    res.status(500).json({
      status: 'ERROR',
      response_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      error_code: 'OP_99',
      error_message: 'Internal server error'
    });
  }
};

// All provider callback endpoints use the same handler
// Add catch-all log for /authenticate POST requests
router.post('/authenticate', (req, res, next) => {
  console.log('[DEBUG][TOKEN_TRACE][ROUTE] Incoming POST /provider-callback/authenticate', {
    body: req.body,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
  next();
}, handleProviderCallback);
router.post('/balance', handleProviderCallback);
router.post('/changebalance', (req, res, next) => {
  console.log('[TEST ROUTE] /changebalance route hit!');
  console.log('[TEST ROUTE] Request body:', JSON.stringify(req.body, null, 2));
  next();
}, handleProviderCallback);
router.post('/status', handleProviderCallback);
router.post('/cancel', handleProviderCallback);
router.post('/finishround', handleProviderCallback);
router.get('/ping', handleProviderCallback);

// Add a POST '' route for /innova (no trailing slash)
router.post('', (req, res, next) => {
  console.log('[TEST ROOT ROUTE] /innova root route hit!');
  console.log('[TEST ROOT ROUTE] Request body:', JSON.stringify(req.body, null, 2));
  next();
}, handleProviderCallback);
router.post('/', (req, res, next) => {
  console.log('[TEST ROOT ROUTE] /innova/ root route hit!');
  console.log('[TEST ROOT ROUTE] Request body:', JSON.stringify(req.body, null, 2));
  next();
}, handleProviderCallback);

// Legacy endpoint for backward compatibility
router.post('/innova/', handleProviderCallback);

export default router; 