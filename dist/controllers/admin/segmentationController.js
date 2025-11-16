"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeSegment = exports.exportSegment = exports.getSavedSegments = exports.saveSegment = exports.querySegment = exports.previewSegment = exports.getAvailableFilters = void 0;
const segmentationService_1 = __importDefault(require("../../services/crm/segmentationService"));
/**
 * ADVANCED PLAYER SEGMENTATION CONTROLLER
 *
 * Provides 300+ dynamic filters for player segmentation
 * Supports complex filter intersections (AND/OR logic)
 */
class SegmentationController {
    /**
     * GET /api/admin/crm/segmentation/filters
     *
     * Get all available filters (300+) with metadata
     */
    async getAvailableFilters(req, res) {
        try {
            console.log('[SEGMENTATION] Fetching available filters...');
            const filters = await segmentationService_1.default.getAvailableFilters();
            console.log(`[SEGMENTATION] Returned ${filters.total} filters across ${filters.categories.length} categories`);
            return res.status(200).json({
                success: true,
                data: filters
            });
        }
        catch (error) {
            console.error('[SEGMENTATION] Error fetching filters:', error.message);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch available filters',
                error: error.message
            });
        }
    }
    /**
     * POST /api/admin/crm/segmentation/preview
     *
     * Preview segment results (player count + sample players)
     * Body: { filters: SegmentFilter[], limit?: number }
     */
    async previewSegment(req, res) {
        try {
            const { filters, limit = 100 } = req.body;
            if (!filters || !Array.isArray(filters) || filters.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Filters array is required'
                });
            }
            console.log(`[SEGMENTATION] Previewing segment with ${filters.length} filters...`);
            const playerIds = await segmentationService_1.default.applySegment(filters, 10000);
            const samplePlayers = await segmentationService_1.default.getSegmentPlayers(filters, 1, Math.min(limit, 100));
            console.log(`[SEGMENTATION] Segment matched ${playerIds.length} players`);
            const categorySet = new Set(filters.map((f) => f.category));
            const categories = Array.from(categorySet);
            return res.status(200).json({
                success: true,
                data: {
                    totalPlayers: playerIds.length,
                    playerIds: playerIds.slice(0, 100), // First 100 IDs
                    samplePlayers: samplePlayers.players,
                    filtersSummary: {
                        totalFilters: filters.length,
                        categories: categories
                    }
                }
            });
        }
        catch (error) {
            console.error('[SEGMENTATION] Error previewing segment:', error.message);
            return res.status(500).json({
                success: false,
                message: 'Failed to preview segment',
                error: error.message
            });
        }
    }
    /**
     * POST /api/admin/crm/segmentation/query
     *
     * Execute segmentation query with pagination
     * Body: { filters: SegmentFilter[], page?: number, limit?: number }
     */
    async querySegment(req, res) {
        try {
            const { filters, page = 1, limit = 100 } = req.body;
            if (!filters || !Array.isArray(filters) || filters.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Filters array is required'
                });
            }
            console.log(`[SEGMENTATION] Querying segment - Page ${page}, Limit ${limit}`);
            const result = await segmentationService_1.default.getSegmentPlayers(filters, page, limit);
            console.log(`[SEGMENTATION] Returned ${result.players.length} players (${result.total} total)`);
            return res.status(200).json({
                success: true,
                data: result
            });
        }
        catch (error) {
            console.error('[SEGMENTATION] Error querying segment:', error.message);
            return res.status(500).json({
                success: false,
                message: 'Failed to query segment',
                error: error.message
            });
        }
    }
    /**
     * POST /api/admin/crm/segmentation/save
     *
     * Save segment for reuse
     * Body: { name, description?, filters, isActive? }
     */
    async saveSegment(req, res) {
        try {
            const { name, description, filters, isActive = true } = req.body;
            if (!name || !filters || !Array.isArray(filters)) {
                return res.status(400).json({
                    success: false,
                    message: 'Name and filters are required'
                });
            }
            console.log(`[SEGMENTATION] Saving segment "${name}" with ${filters.length} filters...`);
            // Calculate player count
            const playerIds = await segmentationService_1.default.applySegment(filters, 100000);
            // Save segment
            const segmentId = await segmentationService_1.default.saveSegment({
                name,
                description,
                filters,
                created_by: req.user?.userId,
                is_active: isActive
            });
            // Update player count
            await segmentationService_1.default.updateSegmentPlayerCount(segmentId, playerIds);
            console.log(`[SEGMENTATION] Segment saved with ID ${segmentId} (${playerIds.length} players)`);
            return res.status(201).json({
                success: true,
                message: 'Segment saved successfully',
                data: {
                    segmentId,
                    playerCount: playerIds.length
                }
            });
        }
        catch (error) {
            console.error('[SEGMENTATION] Error saving segment:', error.message);
            return res.status(500).json({
                success: false,
                message: 'Failed to save segment',
                error: error.message
            });
        }
    }
    /**
     * GET /api/admin/crm/segmentation/saved
     *
     * Get all saved segments
     */
    async getSavedSegments(req, res) {
        try {
            console.log('[SEGMENTATION] Fetching saved segments...');
            const segments = await segmentationService_1.default.getSavedSegments();
            console.log(`[SEGMENTATION] Returned ${segments.length} saved segments`);
            return res.status(200).json({
                success: true,
                data: segments
            });
        }
        catch (error) {
            console.error('[SEGMENTATION] Error fetching saved segments:', error.message);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch saved segments',
                error: error.message
            });
        }
    }
    /**
     * POST /api/admin/crm/segmentation/export
     *
     * Export segment player IDs (for campaigns, bulk actions)
     * Body: { filters: SegmentFilter[], format?: 'json' | 'csv' }
     */
    async exportSegment(req, res) {
        try {
            const { filters, format = 'json' } = req.body;
            if (!filters || !Array.isArray(filters) || filters.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Filters array is required'
                });
            }
            console.log(`[SEGMENTATION] Exporting segment in ${format} format...`);
            const playerIds = await segmentationService_1.default.applySegment(filters, 100000);
            const players = await segmentationService_1.default.getSegmentPlayers(filters, 1, 10000);
            if (format === 'csv') {
                // CSV export
                const csvHeader = 'ID,Username,Email,Country,VIP Tier,Current Balance,Total Deposited,Total Wagered\n';
                const csvRows = players.players.map((p) => `${p.id},"${p.username}","${p.email}","${p.country || ''}","${p.vip_tier || ''}",${p.current_balance || 0},${p.total_deposited || 0},${p.total_wagered || 0}`).join('\n');
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="segment-${Date.now()}.csv"`);
                return res.send(csvHeader + csvRows);
            }
            // JSON export
            return res.status(200).json({
                success: true,
                data: {
                    totalPlayers: playerIds.length,
                    playerIds,
                    exportedAt: new Date().toISOString()
                }
            });
        }
        catch (error) {
            console.error('[SEGMENTATION] Error exporting segment:', error.message);
            return res.status(500).json({
                success: false,
                message: 'Failed to export segment',
                error: error.message
            });
        }
    }
    /**
     * POST /api/admin/crm/segmentation/analyze
     *
     * Analyze segment demographics and metrics
     * Body: { filters: SegmentFilter[] }
     */
    async analyzeSegment(req, res) {
        try {
            const { filters } = req.body;
            if (!filters || !Array.isArray(filters) || filters.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Filters array is required'
                });
            }
            console.log(`[SEGMENTATION] Analyzing segment...`);
            const players = await segmentationService_1.default.getSegmentPlayers(filters, 1, 10000);
            // Calculate aggregate metrics
            const analysis = {
                totalPlayers: players.total,
                demographics: {
                    countries: this.aggregateField(players.players, 'country'),
                    vipTiers: this.aggregateField(players.players, 'vip_tier'),
                    kycStatuses: this.aggregateField(players.players, 'kyc_status')
                },
                financial: {
                    avgBalance: this.calculateAvg(players.players, 'current_balance'),
                    avgDeposited: this.calculateAvg(players.players, 'total_deposited'),
                    avgWithdrawn: this.calculateAvg(players.players, 'total_withdrawn'),
                    totalDeposited: this.calculateSum(players.players, 'total_deposited'),
                    totalWithdrawn: this.calculateSum(players.players, 'total_withdrawn')
                },
                gaming: {
                    avgWagered: this.calculateAvg(players.players, 'total_wagered'),
                    avgWon: this.calculateAvg(players.players, 'total_won'),
                    totalWagered: this.calculateSum(players.players, 'total_wagered'),
                    totalWon: this.calculateSum(players.players, 'total_won')
                },
                risk: {
                    churnRiskDistribution: this.aggregateField(players.players, 'churn_risk_level'),
                    avgChurnScore: this.calculateAvg(players.players, 'churn_score')
                }
            };
            console.log(`[SEGMENTATION] Analysis complete for ${players.total} players`);
            return res.status(200).json({
                success: true,
                data: analysis
            });
        }
        catch (error) {
            console.error('[SEGMENTATION] Error analyzing segment:', error.message);
            return res.status(500).json({
                success: false,
                message: 'Failed to analyze segment',
                error: error.message
            });
        }
    }
    // Helper methods for analysis
    aggregateField(players, field) {
        const result = {};
        players.forEach(player => {
            const value = player[field] || 'Unknown';
            result[value] = (result[value] || 0) + 1;
        });
        return result;
    }
    calculateAvg(players, field) {
        if (players.length === 0)
            return 0;
        const sum = players.reduce((acc, p) => acc + (parseFloat(p[field]) || 0), 0);
        return Math.round((sum / players.length) * 100) / 100;
    }
    calculateSum(players, field) {
        return players.reduce((acc, p) => acc + (parseFloat(p[field]) || 0), 0);
    }
}
const segmentationController = new SegmentationController();
exports.getAvailableFilters = segmentationController.getAvailableFilters.bind(segmentationController);
exports.previewSegment = segmentationController.previewSegment.bind(segmentationController);
exports.querySegment = segmentationController.querySegment.bind(segmentationController);
exports.saveSegment = segmentationController.saveSegment.bind(segmentationController);
exports.getSavedSegments = segmentationController.getSavedSegments.bind(segmentationController);
exports.exportSegment = segmentationController.exportSegment.bind(segmentationController);
exports.analyzeSegment = segmentationController.analyzeSegment.bind(segmentationController);
