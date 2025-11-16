"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPromotionClaims = exports.getPromotionOverviewStats = exports.getPromotionStats = exports.togglePromotion = exports.deletePromotion = exports.updatePromotion = exports.getPromotionById = exports.getPromotions = exports.createPromotion = void 0;
const promotion_service_1 = require("../../services/admin/promotion.service");
const activity_logger_service_1 = require("../../services/activity/activity-logger.service");
// Create a new promotion
const createPromotion = async (req, res) => {
    try {
        const data = req.body;
        const promotion = await promotion_service_1.AdminPromotionService.createPromotion(data);
        // Log activity
        await activity_logger_service_1.ActivityLoggerService.logPromotionCreated(req, promotion.id, promotion.title, promotion.type);
        res.status(201).json({
            success: true,
            message: "Promotion created successfully",
            data: promotion
        });
    }
    catch (error) {
        console.error("Error creating promotion:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to create promotion"
        });
    }
};
exports.createPromotion = createPromotion;
// Get all promotions with filters
const getPromotions = async (req, res) => {
    try {
        const filters = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            search: req.query.search,
            type: req.query.type,
            is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
            is_featured: req.query.is_featured !== undefined ? req.query.is_featured === 'true' : undefined,
            start_date: req.query.start_date,
            end_date: req.query.end_date
        };
        const result = await promotion_service_1.AdminPromotionService.getPromotions(filters);
        res.status(200).json({
            success: true,
            data: result.promotions,
            pagination: result.pagination
        });
    }
    catch (error) {
        console.error("Error fetching promotions:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch promotions"
        });
    }
};
exports.getPromotions = getPromotions;
// Get promotion by ID
const getPromotionById = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid promotion ID"
            });
        }
        const promotion = await promotion_service_1.AdminPromotionService.getPromotionById(id);
        if (!promotion) {
            return res.status(404).json({
                success: false,
                message: "Promotion not found"
            });
        }
        res.status(200).json({
            success: true,
            data: promotion
        });
    }
    catch (error) {
        console.error("Error fetching promotion:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch promotion"
        });
    }
};
exports.getPromotionById = getPromotionById;
// Update promotion
const updatePromotion = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid promotion ID"
            });
        }
        const data = Object.assign(Object.assign({}, req.body), { id });
        const promotion = await promotion_service_1.AdminPromotionService.updatePromotion(id, data);
        if (!promotion) {
            return res.status(404).json({
                success: false,
                message: "Promotion not found"
            });
        }
        // Log activity for each updated field
        for (const [key, value] of Object.entries(data)) {
            await activity_logger_service_1.ActivityLoggerService.logPromotionUpdated(req, id, key, null, value);
        }
        res.status(200).json({
            success: true,
            message: "Promotion updated successfully",
            data: promotion
        });
    }
    catch (error) {
        console.error("Error updating promotion:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to update promotion"
        });
    }
};
exports.updatePromotion = updatePromotion;
// Delete promotion
const deletePromotion = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid promotion ID"
            });
        }
        const promotion = await promotion_service_1.AdminPromotionService.deletePromotion(id);
        if (!promotion) {
            return res.status(404).json({
                success: false,
                message: "Promotion not found"
            });
        }
        // Log activity
        await activity_logger_service_1.ActivityLoggerService.logPromotionDeleted(req, id, promotion.title);
        res.status(200).json({
            success: true,
            message: "Promotion deleted successfully",
            data: promotion
        });
    }
    catch (error) {
        console.error("Error deleting promotion:", error);
        if (error.message.includes("Cannot delete promotion with existing claims")) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        res.status(500).json({
            success: false,
            message: error.message || "Failed to delete promotion"
        });
    }
};
exports.deletePromotion = deletePromotion;
// Toggle promotion status
const togglePromotion = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid promotion ID"
            });
        }
        const promotion = await promotion_service_1.AdminPromotionService.togglePromotion(id);
        if (!promotion) {
            return res.status(404).json({
                success: false,
                message: "Promotion not found"
            });
        }
        // Log activity
        await activity_logger_service_1.ActivityLoggerService.logPromotionStatusChanged(req, id, !promotion.is_active ? 'active' : 'inactive', promotion.is_active ? 'active' : 'inactive');
        res.status(200).json({
            success: true,
            message: `Promotion ${promotion.is_active ? 'activated' : 'deactivated'} successfully`,
            data: promotion
        });
    }
    catch (error) {
        console.error("Error toggling promotion:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to toggle promotion"
        });
    }
};
exports.togglePromotion = togglePromotion;
// Get promotion statistics
const getPromotionStats = async (req, res) => {
    try {
        const filters = {
            promotion_id: req.query.promotion_id ? parseInt(req.query.promotion_id) : undefined,
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            group_by: req.query.group_by || 'day'
        };
        const stats = await promotion_service_1.AdminPromotionService.getPromotionStats(filters);
        res.status(200).json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error("Error fetching promotion stats:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch promotion statistics"
        });
    }
};
exports.getPromotionStats = getPromotionStats;
// Get promotion overview statistics
const getPromotionOverviewStats = async (req, res) => {
    try {
        const stats = await promotion_service_1.AdminPromotionService.getPromotionOverviewStats();
        res.status(200).json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error("Error fetching promotion overview stats:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch promotion overview statistics"
        });
    }
};
exports.getPromotionOverviewStats = getPromotionOverviewStats;
// Get promotion claims
const getPromotionClaims = async (req, res) => {
    try {
        const promotionId = parseInt(req.params.id);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        if (isNaN(promotionId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid promotion ID"
            });
        }
        const result = await promotion_service_1.AdminPromotionService.getPromotionClaims(promotionId, page, limit);
        res.status(200).json({
            success: true,
            data: result.claims,
            pagination: result.pagination
        });
    }
    catch (error) {
        console.error("Error fetching promotion claims:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch promotion claims"
        });
    }
};
exports.getPromotionClaims = getPromotionClaims;
