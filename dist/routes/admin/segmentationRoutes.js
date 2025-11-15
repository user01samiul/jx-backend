"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const segmentationController = __importStar(require("../../controllers/admin/segmentationController"));
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const authorize_1 = require("../../middlewares/authorize");
const roles_1 = require("../../constants/roles");
const router = express_1.default.Router();
/**
 * ADVANCED PLAYER SEGMENTATION ROUTES
 *
 * All routes require authentication and Admin/Manager role
 */
// Apply authentication middleware to all routes
router.use(auth_middleware_1.authenticateToken);
router.use((0, authorize_1.authorize)([roles_1.Roles.ADMIN, roles_1.Roles.MANAGER]));
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
exports.default = router;
