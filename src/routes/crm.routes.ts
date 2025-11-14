/**
 * CRM Routes - Player 360 View, Support, VIP Management
 * All endpoints return real data from PostgreSQL database
 */

import { Router } from "express";
import * as crmController from "../controllers/crmController";
import * as ticketsController from "../controllers/crmTicketsController";
import segmentationRoutes from "./admin/segmentationRoutes";
import { authenticateToken } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize";
import { Roles } from "../constants/roles";

const router = Router();

// All CRM routes require authentication and admin/manager role
router.use(authenticateToken);
router.use(authorize([Roles.ADMIN, Roles.MANAGER]));

/**
 * @swagger
 * /api/admin/crm/players/{userId}/360:
 *   get:
 *     summary: Get complete Player 360° View
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: Complete player 360 view with financial, gaming, VIP, compliance, support data
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get("/players/:userId/360", crmController.getPlayer360View);

/**
 * @swagger
 * /api/admin/crm/players/{userId}/notes:
 *   post:
 *     summary: Add customer note
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - note_type
 *               - category
 *               - subject
 *               - content
 *             properties:
 *               note_type:
 *                 type: string
 *                 enum: [call, email, chat, internal, escalation, meeting]
 *               category:
 *                 type: string
 *               subject:
 *                 type: string
 *               content:
 *                 type: string
 *               sentiment:
 *                 type: string
 *                 enum: [positive, neutral, negative]
 *               is_important:
 *                 type: boolean
 *               is_flagged:
 *                 type: boolean
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Note added successfully
 *       500:
 *         description: Internal server error
 */
router.post("/players/:userId/notes", crmController.addCustomerNote);

/**
 * @swagger
 * /api/admin/crm/players/{userId}/tags:
 *   post:
 *     summary: Add tag to player
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tag_id
 *             properties:
 *               tag_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Tag added successfully
 *       500:
 *         description: Internal server error
 */
router.post("/players/:userId/tags", crmController.addPlayerTag);

/**
 * @swagger
 * /api/admin/crm/players/{userId}/game-history:
 *   get:
 *     summary: Get player game history with pagination
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Player game history with pagination
 *       500:
 *         description: Internal server error
 */
router.get("/players/:userId/game-history", crmController.getPlayerGameHistory);

/**
 * @swagger
 * /api/admin/crm/game-history/{betId}/hand-history:
 *   get:
 *     summary: Get hand history from Innova API for a specific bet
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: betId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Hand history from Innova API
 *       404:
 *         description: Bet not found or hand history not available
 *       500:
 *         description: Internal server error
 */
router.get("/game-history/:betId/hand-history", crmController.getHandHistory);

// Support Tickets Routes
router.get("/tickets", ticketsController.getSupportTickets);
router.get("/tickets/:ticketId", ticketsController.getTicketDetails);
router.post("/tickets", ticketsController.createSupportTicket);
router.patch("/tickets/:ticketId/status", ticketsController.updateTicketStatus);
router.post("/tickets/:ticketId/messages", ticketsController.addTicketMessage);
router.patch("/tickets/:ticketId/assign", ticketsController.assignTicket);

// Advanced Segmentation Routes (300+ dynamic filters)
router.use("/segmentation", segmentationRoutes);

export default router;
