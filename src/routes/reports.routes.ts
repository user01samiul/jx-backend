import express, { Request, Response } from 'express';
import ReportsService from '../services/ReportsService';
import { authenticateToken } from '../middlewares/auth.middleware';
import { adminMiddleware as isAdmin } from '../middlewares/admin.middleware';

const router = express.Router();

/**
 * ADMIN ROUTES - Custom Reports
 */

/**
 * @route GET /api/reports/admin/all
 * @desc Get all custom reports
 * @access Admin only
 */
router.get('/admin/all', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { category, status } = req.query;
    const reports = await ReportsService.getAllReports(
      category as string,
      status as string
    );
    res.json({ success: true, reports });
  } catch (error: any) {
    console.error('[REPORTS] Error fetching reports:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/reports/admin/:id
 * @desc Get report by ID
 * @access Admin only
 */
router.get('/admin/:id', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const report = await ReportsService.getReportById(parseInt(id));

    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    res.json({ success: true, report });
  } catch (error: any) {
    console.error('[REPORTS] Error fetching report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/reports/admin/create
 * @desc Create new custom report
 * @access Admin only
 */
router.post('/admin/create', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const createdBy = (req as any).user.id;
    const report = await ReportsService.createReport({ ...req.body, created_by: createdBy });
    res.json({ success: true, report });
  } catch (error: any) {
    console.error('[REPORTS] Error creating report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route PUT /api/reports/admin/:id
 * @desc Update custom report
 * @access Admin only
 */
router.put('/admin/:id', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const report = await ReportsService.updateReport(parseInt(id), req.body);
    res.json({ success: true, report });
  } catch (error: any) {
    console.error('[REPORTS] Error updating report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route DELETE /api/reports/admin/:id
 * @desc Delete custom report
 * @access Admin only
 */
router.delete('/admin/:id', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await ReportsService.deleteReport(parseInt(id));

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (error: any) {
    console.error('[REPORTS] Error deleting report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/reports/admin/execute/:id
 * @desc Execute custom report
 * @access Admin only
 */
router.post('/admin/execute/:id', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const executedBy = (req as any).user.id;
    const { parameters } = req.body;

    const result = await ReportsService.executeReport(parseInt(id), executedBy, parameters);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[REPORTS] Error executing report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/reports/admin/executions/:reportId
 * @desc Get execution history for a report
 * @access Admin only
 */
router.get('/admin/executions/:reportId', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const { limit } = req.query;

    const executions = await ReportsService.getReportExecutions(
      parseInt(reportId),
      limit ? parseInt(limit as string) : 50
    );

    res.json({ success: true, executions });
  } catch (error: any) {
    console.error('[REPORTS] Error fetching executions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/reports/admin/all-executions
 * @desc Get all report executions
 * @access Admin only
 */
router.get('/admin/all-executions', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;

    const executions = await ReportsService.getAllExecutions(
      limit ? parseInt(limit as string) : 100
    );

    res.json({ success: true, executions });
  } catch (error: any) {
    console.error('[REPORTS] Error fetching all executions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/reports/admin/templates
 * @desc Get predefined report templates
 * @access Admin only
 */
router.get('/admin/templates', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const templates = await ReportsService.getReportTemplates();
    res.json({ success: true, templates });
  } catch (error: any) {
    console.error('[REPORTS] Error fetching templates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/reports/admin/from-template
 * @desc Create report from template
 * @access Admin only
 */
router.post('/admin/from-template', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const createdBy = (req as any).user.id;
    const { templateIndex } = req.body;

    if (templateIndex === undefined) {
      return res.status(400).json({ success: false, error: 'templateIndex is required' });
    }

    const report = await ReportsService.createFromTemplate(templateIndex, createdBy);
    res.json({ success: true, report });
  } catch (error: any) {
    console.error('[REPORTS] Error creating report from template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
