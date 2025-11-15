"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validate_1 = require("../middlewares/validate");
const authenticate_1 = require("../middlewares/authenticate");
const authorize_1 = require("../middlewares/authorize");
const manager_schema_1 = require("../api/affiliate/manager.schema");
const manager_controller_1 = require("../api/affiliate/manager.controller");
const router = (0, express_1.Router)();
// Create a wrapper for manager authorization
const managerAuth = (req, res, next) => {
    (0, authorize_1.authorize)(["Affiliates Manager"])(req, res, next);
};
// =====================================================
// MANAGER ROUTES (Requires Affiliates Manager role)
// =====================================================
// Apply authentication and manager role for all manager routes
router.use(authenticate_1.authenticate);
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
router.get("/dashboard", manager_controller_1.getManagerDashboard);
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
router.get("/teams", manager_controller_1.getManagerTeams);
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
router.post("/teams", (0, validate_1.validate)({ body: manager_schema_1.CreateTeamSchema.shape.body }), manager_controller_1.createTeam);
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
router.put("/teams/:id", (0, validate_1.validate)({ body: manager_schema_1.UpdateTeamSchema.shape.body }), manager_controller_1.updateTeam);
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
router.get("/teams/:id/affiliates", manager_controller_1.getTeamAffiliates);
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
router.get("/teams/:id/performance", manager_controller_1.getTeamPerformance);
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
router.post("/assign-affiliate", (0, validate_1.validate)({ body: manager_schema_1.AssignAffiliateSchema.shape.body }), manager_controller_1.assignAffiliateToTeam);
exports.default = router;
