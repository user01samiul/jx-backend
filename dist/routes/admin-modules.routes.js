"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_modules_controller_1 = require("../controllers/admin-modules.controller");
const authenticate_1 = require("../middlewares/authenticate");
const authorize_1 = require("../middlewares/authorize");
const roles_1 = require("../constants/roles");
const router = (0, express_1.Router)();
/**
 * @swagger
 * components:
 *   schemas:
 *     AdminModule:
 *       type: object
 *       required:
 *         - id
 *         - title
 *         - path
 *         - role_id
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier for the module
 *           example: 1
 *         title:
 *           type: string
 *           description: Display name of the module
 *           example: "Dashboard"
 *         path:
 *           type: string
 *           description: Frontend route path
 *           example: "/dashboard"
 *         icon:
 *           type: string
 *           description: Icon identifier for the module
 *           example: "dashboard-icon"
 *         parent_id:
 *           type: integer
 *           nullable: true
 *           description: ID of parent module for hierarchical structure
 *           example: null
 *         divider:
 *           type: string
 *           description: Divider type for UI organization
 *           example: "0"
 *         role_id:
 *           type: array
 *           items:
 *             type: integer
 *           description: Array of role IDs that can access this module
 *           example: [1, 3, 5]
 *
 *     AdminModuleTree:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         path:
 *           type: string
 *         icon:
 *           type: string
 *         parent_id:
 *           type: integer
 *           nullable: true
 *         divider:
 *           type: string
 *         role_id:
 *           type: array
 *           items:
 *             type: integer
 *         children:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AdminModuleTree'
 *
 *     CreateModuleRequest:
 *       type: object
 *       required:
 *         - title
 *         - path
 *         - role_id
 *       properties:
 *         title:
 *           type: string
 *           example: "New Module"
 *         path:
 *           type: string
 *           example: "/new-module"
 *         icon:
 *           type: string
 *           example: "new-icon"
 *         parent_id:
 *           type: integer
 *           nullable: true
 *           example: null
 *         divider:
 *           type: string
 *           example: "0"
 *         role_id:
 *           type: array
 *           items:
 *             type: integer
 *           example: [1, 2, 3]
 *
 *     UpdateModuleRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           example: "Updated Module"
 *         path:
 *           type: string
 *           example: "/updated-module"
 *         icon:
 *           type: string
 *           example: "updated-icon"
 *         parent_id:
 *           type: integer
 *           nullable: true
 *           example: null
 *         divider:
 *           type: string
 *           example: "0"
 *         role_id:
 *           type: array
 *           items:
 *             type: integer
 *           example: [1, 2, 3]
 *
 *     ApiResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: "success"
 *         message:
 *           type: string
 *           example: "Operation completed successfully"
 *         data:
 *           type: object
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: "error"
 *         message:
 *           type: string
 *           example: "Error message"
 *         error_code:
 *           type: string
 *           example: "VALIDATION_ERROR"
 */
// Apply authentication middleware to all routes
router.use(authenticate_1.authenticate);
/**
 * @swagger
 * /api/admin-modules/my-modules:
 *   get:
 *     summary: Get modules for current authenticated user
 *     description: Retrieves admin modules that the current user has access to based on their roles
 *     tags: [Admin Modules]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user's modules
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Modules retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AdminModuleTree'
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/my-modules', admin_modules_controller_1.AdminModulesController.getMyModules);
/**
 * @swagger
 * /api/admin-modules/roles:
 *   get:
 *     summary: Get available roles for admin modules
 *     description: Retrieves all available roles that can be assigned to admin modules (Admin only)
 *     tags: [Admin Modules]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved available roles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Roles retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Admin"
 *                       description:
 *                         type: string
 *                         example: "Administrator role with full access"
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/roles', (0, authorize_1.authorize)([roles_1.Roles.ADMIN]), admin_modules_controller_1.AdminModulesController.getAvailableRoles);
/**
 * @swagger
 * /api/admin-modules/by-role/{roleId}:
 *   get:
 *     summary: Get modules for a specific role
 *     description: Retrieves all admin modules accessible by a specific role (Admin only)
 *     tags: [Admin Modules]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the role to get modules for
 *         example: 1
 *     responses:
 *       200:
 *         description: Successfully retrieved modules for the role
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Modules retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AdminModuleTree'
 *       400:
 *         description: Bad request - Invalid role ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Role not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/by-role/:roleId', (0, authorize_1.authorize)([roles_1.Roles.ADMIN]), admin_modules_controller_1.AdminModulesController.getModulesByRole);
/**
 * @swagger
 * /api/admin-modules/all:
 *   get:
 *     summary: Get all admin modules
 *     description: Retrieves all admin modules in the system (Admin only)
 *     tags: [Admin Modules]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved all modules
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "All modules retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AdminModuleTree'
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/all', (0, authorize_1.authorize)([roles_1.Roles.ADMIN]), admin_modules_controller_1.AdminModulesController.getAllModules);
/**
 * @swagger
 * /api/admin-modules:
 *   post:
 *     summary: Create a new admin module
 *     description: Creates a new admin module with specified roles and properties (Admin only)
 *     tags: [Admin Modules]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateModuleRequest'
 *           example:
 *             title: "New Analytics Module"
 *             path: "/dashboard/analytics/new"
 *             icon: "analytics-icon"
 *             parent_id: 2
 *             divider: "0"
 *             role_id: [1, 3, 5]
 *     responses:
 *       201:
 *         description: Module created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Module created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/AdminModule'
 *       400:
 *         description: Bad request - Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Conflict - Module with same path already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', (0, authorize_1.authorize)([roles_1.Roles.ADMIN]), admin_modules_controller_1.AdminModulesController.createModule);
/**
 * @swagger
 * /api/admin-modules/{id}:
 *   put:
 *     summary: Update an existing admin module
 *     description: Updates an existing admin module with new properties (Admin only)
 *     tags: [Admin Modules]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the module to update
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateModuleRequest'
 *           example:
 *             title: "Updated Dashboard"
 *             path: "/dashboard/updated"
 *             icon: "updated-dashboard-icon"
 *             role_id: [1, 2, 3, 4]
 *     responses:
 *       200:
 *         description: Module updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Module updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/AdminModule'
 *       400:
 *         description: Bad request - Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Module not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Conflict - Module with same path already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', (0, authorize_1.authorize)([roles_1.Roles.ADMIN]), admin_modules_controller_1.AdminModulesController.updateModule);
/**
 * @swagger
 * /api/admin-modules/{id}:
 *   delete:
 *     summary: Delete an admin module
 *     description: Deletes an admin module and all its child modules (Admin only)
 *     tags: [Admin Modules]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the module to delete
 *         example: 1
 *     responses:
 *       200:
 *         description: Module deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Module and its children deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedCount:
 *                       type: integer
 *                       description: Number of modules deleted
 *                       example: 3
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Module not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', (0, authorize_1.authorize)([roles_1.Roles.ADMIN]), admin_modules_controller_1.AdminModulesController.deleteModule);
exports.default = router;
