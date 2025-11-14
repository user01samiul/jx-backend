import { Router } from "express";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import {
  CreateTeamSchema,
  UpdateTeamSchema,
  AssignAffiliateSchema,
  TeamPerformanceSchema
} from "../api/affiliate/manager.schema";
import {
  getManagerDashboard,
  getManagerTeams,
  createTeam,
  updateTeam,
  getTeamAffiliates,
  assignAffiliateToTeam,
  getTeamPerformance
} from "../api/affiliate/manager.controller";

const router = Router();

// Create a wrapper for manager authorization
const managerAuth = (req: any, res: any, next: any) => {
  authorize(["Affiliates Manager"])(req, res, next);
};

// =====================================================
// MANAGER ROUTES (Requires Affiliates Manager role)
// =====================================================

// Apply authentication and manager role for all manager routes
router.use(authenticate);
router.use(managerAuth);

/**
 * @swagger
 * /api/manager/dashboard:
 *   get:
 *     summary: Get manager dashboard
 *     tags: [Manager Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Manager dashboard data retrieved successfully
 */
router.get("/dashboard", getManagerDashboard);

/**
 * @swagger
 * /api/manager/teams:
 *   get:
 *     summary: Get all teams managed by the manager
 *     tags: [Manager Teams]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Teams retrieved successfully
 */
router.get("/teams", getManagerTeams);

/**
 * @swagger
 * /api/manager/teams:
 *   post:
 *     summary: Create a new team
 *     tags: [Manager Teams]
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
 *             properties:
 *               name:
 *                 type: string
 *                 description: Team name
 *               description:
 *                 type: string
 *                 description: Team description
 *               team_commission_rate:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 50
 *                 description: Default commission rate for team
 *               team_goals:
 *                 type: object
 *                 description: Team performance goals
 *     responses:
 *       201:
 *         description: Team created successfully
 */
router.post("/teams", validate({ body: CreateTeamSchema.shape.body }), createTeam);

/**
 * @swagger
 * /api/manager/teams/{id}:
 *   put:
 *     summary: Update team
 *     tags: [Manager Teams]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Team name
 *               description:
 *                 type: string
 *                 description: Team description
 *               team_commission_rate:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 50
 *                 description: Default commission rate for team
 *               team_goals:
 *                 type: object
 *                 description: Team performance goals
 *               is_active:
 *                 type: boolean
 *                 description: Whether team is active
 *     responses:
 *       200:
 *         description: Team updated successfully
 */
router.put("/teams/:id", validate({ body: UpdateTeamSchema.shape.body }), updateTeam);

/**
 * @swagger
 * /api/manager/teams/{id}/affiliates:
 *   get:
 *     summary: Get affiliates in a team
 *     tags: [Manager Teams]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Team affiliates retrieved successfully
 */
router.get("/teams/:id/affiliates", getTeamAffiliates);

/**
 * @swagger
 * /api/manager/teams/{id}/performance:
 *   get:
 *     summary: Get team performance
 *     tags: [Manager Teams]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Team performance retrieved successfully
 */
router.get("/teams/:id/performance", getTeamPerformance);

/**
 * @swagger
 * /api/manager/assign-affiliate:
 *   post:
 *     summary: Assign affiliate to team
 *     tags: [Manager Teams]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - affiliate_id
 *               - team_id
 *             properties:
 *               affiliate_id:
 *                 type: integer
 *                 description: Affiliate user ID
 *               team_id:
 *                 type: integer
 *                 description: Team ID
 *     responses:
 *       200:
 *         description: Affiliate assigned to team successfully
 */
router.post("/assign-affiliate", validate({ body: AssignAffiliateSchema.shape.body }), assignAffiliateToTeam);

export default router; 