import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import * as supportTicketController from '../controllers/supportTicketController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Ticket routes
router.get('/tickets', supportTicketController.getUserTickets);
router.post('/tickets', supportTicketController.createTicket);
router.get('/tickets/:ticketId', supportTicketController.getTicketById);
router.post('/tickets/:ticketId/reply', supportTicketController.replyToTicket);
router.put('/tickets/:ticketId/close', supportTicketController.closeTicket);

export default router;
