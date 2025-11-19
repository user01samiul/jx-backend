"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentStatusChanges = exports.getGameStatusStats = exports.bulkUpdateGameStatus = exports.updateGameStatusByProvider = exports.updateGameStatusByCategory = exports.updateGameStatusById = exports.getGamesWithStatus = void 0;
const admin_game_management_service_1 = require("../../services/admin/admin.game-management.service");
// Get games with status filters
const getGamesWithStatus = async (req, res) => {
    try {
        const filters = {
            category: req.query.category,
            provider: req.query.provider,
            is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
            search: req.query.search,
            limit: req.query.limit ? parseInt(req.query.limit) : 50,
            offset: req.query.offset ? parseInt(req.query.offset) : 0
        };
        const games = await admin_game_management_service_1.AdminGameManagementService.getGamesWithStatus(filters);
        res.json({
            success: true,
            data: games,
            message: "Games retrieved successfully"
        });
    }
    catch (error) {
        console.error("Error getting games with status:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to get games"
        });
    }
};
exports.getGamesWithStatus = getGamesWithStatus;
// Update game status by ID
const updateGameStatusById = async (req, res) => {
    try {
        const data = req.body;
        const result = await admin_game_management_service_1.AdminGameManagementService.updateGameStatusById(data.game_id, data.is_active, data.reason);
        res.json({
            success: true,
            data: result,
            message: `Game ${data.is_active ? 'enabled' : 'disabled'} successfully`
        });
    }
    catch (error) {
        console.error("Error updating game status by ID:", error);
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || "Failed to update game status"
        });
    }
};
exports.updateGameStatusById = updateGameStatusById;
// Update game status by category
const updateGameStatusByCategory = async (req, res) => {
    try {
        const data = req.body;
        const result = await admin_game_management_service_1.AdminGameManagementService.updateGameStatusByCategory(data.category, data.is_active, data.reason);
        res.json({
            success: true,
            data: result,
            message: `${result.updated_count} games in category '${data.category}' ${data.is_active ? 'enabled' : 'disabled'} successfully`
        });
    }
    catch (error) {
        console.error("Error updating game status by category:", error);
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || "Failed to update game status by category"
        });
    }
};
exports.updateGameStatusByCategory = updateGameStatusByCategory;
// Update game status by provider
const updateGameStatusByProvider = async (req, res) => {
    try {
        const data = req.body;
        const result = await admin_game_management_service_1.AdminGameManagementService.updateGameStatusByProvider(data.provider, data.is_active, data.reason);
        res.json({
            success: true,
            data: result,
            message: `${result.updated_count} games from provider '${data.provider}' ${data.is_active ? 'enabled' : 'disabled'} successfully`
        });
    }
    catch (error) {
        console.error("Error updating game status by provider:", error);
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || "Failed to update game status by provider"
        });
    }
};
exports.updateGameStatusByProvider = updateGameStatusByProvider;
// Bulk update game status
const bulkUpdateGameStatus = async (req, res) => {
    try {
        const data = req.body;
        const result = await admin_game_management_service_1.AdminGameManagementService.bulkUpdateGameStatus(data.game_ids, data.is_active, data.reason);
        res.json({
            success: true,
            data: result,
            message: `${result.updated_count} games ${data.is_active ? 'enabled' : 'disabled'} successfully`
        });
    }
    catch (error) {
        console.error("Error bulk updating game status:", error);
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || "Failed to bulk update game status"
        });
    }
};
exports.bulkUpdateGameStatus = bulkUpdateGameStatus;
// Get game status statistics
const getGameStatusStats = async (req, res) => {
    try {
        const stats = await admin_game_management_service_1.AdminGameManagementService.getGameStatusStats();
        res.json({
            success: true,
            data: stats,
            message: "Game status statistics retrieved successfully"
        });
    }
    catch (error) {
        console.error("Error getting game status stats:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to get game status statistics"
        });
    }
};
exports.getGameStatusStats = getGameStatusStats;
// Get recent game status changes
const getRecentStatusChanges = async (req, res) => {
    try {
        const data = {
            limit: req.query.limit ? parseInt(req.query.limit) : 20
        };
        const changes = await admin_game_management_service_1.AdminGameManagementService.getRecentStatusChanges(data.limit);
        res.json({
            success: true,
            data: changes,
            message: "Recent status changes retrieved successfully"
        });
    }
    catch (error) {
        console.error("Error getting recent status changes:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to get recent status changes"
        });
    }
};
exports.getRecentStatusChanges = getRecentStatusChanges;
