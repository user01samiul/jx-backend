import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { Roles } from '../constants/roles';
import * as chatController from '../controllers/chatController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Player routes
router.get('/history', chatController.getPlayerChatHistory);
router.get('/sessions/:sessionId/messages', chatController.getSessionMessages);
router.post('/sessions/:sessionId/rate', chatController.rateChatSession);

// Agent/Admin routes (Support role acts as Agent)
router.get(
  '/agent/sessions',
  authorize([Roles.ADMIN, Roles.SUPPORT]),
  chatController.getAgentSessions
);

router.get(
  '/agent/settings',
  authorize([Roles.ADMIN, Roles.SUPPORT]),
  chatController.getAgentSettings
);

router.put(
  '/agent/settings',
  authorize([Roles.ADMIN, Roles.SUPPORT]),
  chatController.updateAgentSettings
);

router.get(
  '/queue',
  authorize([Roles.ADMIN, Roles.SUPPORT]),
  chatController.getChatQueue
);

router.get(
  '/canned-responses',
  authorize([Roles.ADMIN, Roles.SUPPORT]),
  chatController.getCannedResponses
);

// Admin only routes
router.post(
  '/canned-responses',
  authorize([Roles.ADMIN]),
  chatController.saveCannedResponse
);

router.get(
  '/stats',
  authorize([Roles.ADMIN]),
  chatController.getChatStats
);

export default router;
