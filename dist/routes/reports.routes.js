"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ReportsService_1 = __importDefault(require("../services/ReportsService"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const admin_middleware_1 = require("../middlewares/admin.middleware");
const router = express_1.default.Router();
/**
 * ADMIN ROUTES - Custom Reports
 */
/**
 * @route GET /api/reports/admin/all
 * @desc Get all custom reports
 * @access Admin only
 */
router.get('/admin/all', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { category, status } = req.query;
        const reports = await ReportsService_1.default.getAllReports(category, status);
        res.json({ success: true, reports });
    }
    catch (error) {
        console.error('[REPORTS] Error fetching reports:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/reports/admin/:id
 * @desc Get report by ID
 * @access Admin only
 */
router.get('/admin/:id', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const report = await ReportsService_1.default.getReportById(parseInt(id));
        if (!report) {
            return res.status(404).json({ success: false, error: 'Report not found' });
        }
        res.json({ success: true, report });
    }
    catch (error) {
        console.error('[REPORTS] Error fetching report:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/reports/admin/create
 * @desc Create new custom report
 * @access Admin only
 */
router.post('/admin/create', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const createdBy = req.user.id;
        const report = await ReportsService_1.default.createReport({ ...req.body, created_by: createdBy });
        res.json({ success: true, report });
    }
    catch (error) {
        console.error('[REPORTS] Error creating report:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route PUT /api/reports/admin/:id
 * @desc Update custom report
 * @access Admin only
 */
router.put('/admin/:id', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const report = await ReportsService_1.default.updateReport(parseInt(id), req.body);
        res.json({ success: true, report });
    }
    catch (error) {
        console.error('[REPORTS] Error updating report:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route DELETE /api/reports/admin/:id
 * @desc Delete custom report
 * @access Admin only
 */
router.delete('/admin/:id', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await ReportsService_1.default.deleteReport(parseInt(id));
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Report not found' });
        }
        res.json({ success: true, message: 'Report deleted successfully' });
    }
    catch (error) {
        console.error('[REPORTS] Error deleting report:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/reports/admin/execute/:id
 * @desc Execute custom report
 * @access Admin only
 */
router.post('/admin/execute/:id', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const executedBy = req.user.id;
        const { parameters } = req.body;
        const result = await ReportsService_1.default.executeReport(parseInt(id), executedBy, parameters);
        res.json({ success: true, ...result });
    }
    catch (error) {
        console.error('[REPORTS] Error executing report:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/reports/admin/executions/:reportId
 * @desc Get execution history for a report
 * @access Admin only
 */
router.get('/admin/executions/:reportId', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { reportId } = req.params;
        const { limit } = req.query;
        const executions = await ReportsService_1.default.getReportExecutions(parseInt(reportId), limit ? parseInt(limit) : 50);
        res.json({ success: true, executions });
    }
    catch (error) {
        console.error('[REPORTS] Error fetching executions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/reports/admin/all-executions
 * @desc Get all report executions
 * @access Admin only
 */
router.get('/admin/all-executions', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { limit } = req.query;
        const executions = await ReportsService_1.default.getAllExecutions(limit ? parseInt(limit) : 100);
        res.json({ success: true, executions });
    }
    catch (error) {
        console.error('[REPORTS] Error fetching all executions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/reports/admin/templates
 * @desc Get predefined report templates
 * @access Admin only
 */
router.get('/admin/templates', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const templates = await ReportsService_1.default.getReportTemplates();
        res.json({ success: true, templates });
    }
    catch (error) {
        console.error('[REPORTS] Error fetching templates:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/reports/admin/from-template
 * @desc Create report from template
 * @access Admin only
 */
router.post('/admin/from-template', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const createdBy = req.user.id;
        const { templateIndex } = req.body;
        if (templateIndex === undefined) {
            return res.status(400).json({ success: false, error: 'templateIndex is required' });
        }
        const report = await ReportsService_1.default.createFromTemplate(templateIndex, createdBy);
        res.json({ success: true, report });
    }
    catch (error) {
        console.error('[REPORTS] Error creating report from template:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
