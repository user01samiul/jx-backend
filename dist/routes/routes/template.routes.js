"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const template_service_1 = require("../services/template/template.service");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const admin_middleware_1 = require("../middlewares/admin.middleware");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/template/admin/templates:
 *   get:
 *     summary: Get all templates (admin only)
 *     tags: [Template]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all templates
 *   post:
 *     summary: Create a new template (admin only)
 *     tags: [Template]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTemplateRequest'
 *     responses:
 *       201:
 *         description: Template created
 *   put:
 *     summary: Update a template (admin only)
 *     tags: [Template]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTemplateRequest'
 *     responses:
 *       200:
 *         description: Template updated
 *   delete:
 *     summary: Delete a template (admin only)
 *     tags: [Template]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template deleted
 */
/**
 * @swagger
 * /api/template/templates/{type}:
 *   get:
 *     summary: Get templates by type
 *     tags: [Template]
 *     parameters:
 *       - in: path
 *         name: type
 *         schema:
 *           type: string
 *           enum: [admin, user, premium]
 *         required: true
 *         description: Template type
 *     responses:
 *       200:
 *         description: List of templates by type
 */
/**
 * @swagger
 * /api/template/templates/id/{id}:
 *   get:
 *     summary: Get template by ID
 *     tags: [Template]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template details
 */
/**
 * @swagger
 * /api/template/templates/{id}/configs:
 *   get:
 *     summary: Get template with configs
 *     tags: [Template]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template with configs
 */
/**
 * @swagger
 * /api/template/user/template:
 *   get:
 *     summary: Get user's current template
 *     tags: [Template]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: The user's current template
 *   post:
 *     summary: Assign template to user
 *     tags: [Template]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               template_id:
 *                 type: integer
 *               custom_config:
 *                 type: object
 *     responses:
 *       200:
 *         description: Template assigned to user
 */
/**
 * @swagger
 * /api/template/user/templates/available:
 *   get:
 *     summary: Get available templates for user
 *     tags: [Template]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of available templates for user
 */
/**
 * @swagger
 * /api/template/user/template/load:
 *   get:
 *     summary: Load template on login
 *     tags: [Template]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Loaded user template on login
 */
// Get all templates (admin only)
router.get('/admin/templates', auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const templates = await template_service_1.TemplateService.getAllTemplates();
        res.json({
            success: true,
            data: templates
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to get templates'
        });
    }
});
// Get templates by type
router.get('/templates/:type', async (req, res) => {
    try {
        const { type } = req.params;
        if (!['admin', 'user', 'premium'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid template type'
            });
        }
        const templates = await template_service_1.TemplateService.getTemplatesByType(type);
        res.json({
            success: true,
            data: templates
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to get templates'
        });
    }
});
// Get template by ID
router.get('/templates/id/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const template = await template_service_1.TemplateService.getTemplateById(parseInt(id));
        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }
        res.json({
            success: true,
            data: template
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to get template'
        });
    }
});
// Get template with configs
router.get('/templates/:id/configs', async (req, res) => {
    try {
        const { id } = req.params;
        const template = await template_service_1.TemplateService.getTemplateWithConfigs(parseInt(id));
        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }
        res.json({
            success: true,
            data: template
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to get template configs'
        });
    }
});
// Get user's current template
router.get('/user/template', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const userTemplate = await template_service_1.TemplateService.getUserTemplate(userId);
        if (!userTemplate) {
            return res.status(404).json({
                success: false,
                message: 'No template assigned to user'
            });
        }
        res.json({
            success: true,
            data: userTemplate
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to get user template'
        });
    }
});
// Assign template to user
router.post('/user/template', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { template_id, custom_config = {} } = req.body;
        if (!template_id) {
            return res.status(400).json({
                success: false,
                message: 'Template ID is required'
            });
        }
        const userTemplate = await template_service_1.TemplateService.assignTemplateToUser(userId, template_id, custom_config);
        res.json({
            success: true,
            data: userTemplate,
            message: 'Template assigned successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to assign template'
        });
    }
});
// Get available templates for user
router.get('/user/templates/available', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const templates = await template_service_1.TemplateService.getAvailableTemplatesForUser(userId);
        res.json({
            success: true,
            data: templates
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to get available templates'
        });
    }
});
// Load template on login (called after successful authentication)
router.get('/user/template/load', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const userLevelId = req.user.level_id || 1; // Default to level 1 if not set
        const userTemplate = await template_service_1.TemplateService.loadUserTemplateOnLogin(userId, userLevelId);
        res.json({
            success: true,
            data: {
                current_template: userTemplate,
                template_config: userTemplate.template,
                features: userTemplate.features,
                custom_config: userTemplate.custom_config
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to load user template'
        });
    }
});
// Admin routes for template management
router.post('/admin/templates', auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const templateData = req.body;
        const template = await template_service_1.TemplateService.createTemplate(templateData);
        res.status(201).json({
            success: true,
            data: template,
            message: 'Template created successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to create template'
        });
    }
});
router.put('/admin/templates/:id', auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const template = await template_service_1.TemplateService.updateTemplate(parseInt(id), updateData);
        res.json({
            success: true,
            data: template,
            message: 'Template updated successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to update template'
        });
    }
});
router.delete('/admin/templates/:id', auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        await template_service_1.TemplateService.deleteTemplate(parseInt(id));
        res.json({
            success: true,
            message: 'Template deleted successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to delete template'
        });
    }
});
exports.default = router;
