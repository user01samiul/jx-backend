import express from 'express';
import * as segmentationController from '../../controllers/admin/segmentationController';
import { authenticateToken } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/authorize';
import { Roles } from '../../constants/roles';

const router = express.Router();

/**
 * ADVANCED PLAYER SEGMENTATION ROUTES
 *
 * All routes require authentication and Admin/Manager role
 */

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(authorize([Roles.ADMIN, Roles.MANAGER]));

/**
 * GET /api/admin/crm/segmentation/filters
 * Get all available filters (300+) with metadata
 */
router.get('/filters', segmentationController.getAvailableFilters);

/**
 * POST /api/admin/crm/segmentation/preview
 * Preview segment results (player count + sample)
 */
router.post('/preview', segmentationController.previewSegment);

/**
 * POST /api/admin/crm/segmentation/query
 * Execute segmentation query with pagination
 */
router.post('/query', segmentationController.querySegment);

/**
 * POST /api/admin/crm/segmentation/save
 * Save segment for reuse
 */
router.post('/save', segmentationController.saveSegment);

/**
 * GET /api/admin/crm/segmentation/saved
 * Get all saved segments
 */
router.get('/saved', segmentationController.getSavedSegments);

/**
 * POST /api/admin/crm/segmentation/export
 * Export segment player IDs (JSON or CSV)
 */
router.post('/export', segmentationController.exportSegment);

/**
 * POST /api/admin/crm/segmentation/analyze
 * Analyze segment demographics and metrics
 */
router.post('/analyze', segmentationController.analyzeSegment);

export default router;
