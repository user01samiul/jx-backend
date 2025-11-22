"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = exports.triggerManualDailySummary = exports.triggerManualAutoAdjustment = exports.stopCronJobs = exports.startCronJobs = exports.getCronStatus = exports.getProfitPerformance = exports.triggerAutoAdjustment = exports.getProfitAnalytics = exports.getRTPReport = exports.bulkUpdateRTP = exports.getRTPAnalytics = exports.updateRTPSettings = exports.getRTPSettings = exports.getPaymentGatewayStats = exports.testPaymentGatewayConnection = exports.getActivePaymentGateways = exports.deletePaymentGateway = exports.getPaymentGatewayById = exports.getPaymentGateways = exports.updatePaymentGateway = exports.createPaymentGateway = exports.getUserAnalytics = exports.getRevenueAnalytics = exports.updateSystemSettings = exports.getSystemSettings = exports.approveTransaction = exports.getTransactions = exports.deleteProvider = exports.activateProvider = exports.updateProvider = exports.createProvider = exports.getProviders = exports.getDashboardStats = exports.updateUserBalance = exports.updateUserStatus = exports.getUsersForAdmin = exports.getGamesForAdmin = exports.deleteGame = exports.updateGame = exports.createGame = void 0;
const admin_service_1 = require("../../services/admin/admin.service");
const payment_gateway_service_1 = require("../../services/admin/payment-gateway.service");
const admin_game_import_service_1 = require("../../services/admin/admin.game-import.service");
const activity_logger_service_1 = require("../../services/activity/activity-logger.service");
const adminGameImportService = new admin_game_import_service_1.AdminGameImportService();
// =====================================================
// GAME MANAGEMENT CONTROLLERS
// =====================================================
const createGame = async (req, res, next) => {
    try {
        const gameData = req.validated?.body;
        const game = await (0, admin_service_1.createGameService)(gameData);
        // Log activity
        await activity_logger_service_1.ActivityLoggerService.logGameCreated(req, game.id, game.name, game.provider || 'Unknown');
        res.status(201).json({ success: true, data: game });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createGame = createGame;
const updateGame = async (req, res, next) => {
    try {
        const gameId = parseInt(req.params.id);
        if (isNaN(gameId)) {
            res.status(400).json({ success: false, message: "Invalid game ID" });
            return;
        }
        const gameData = req.validated?.body;
        const game = await (0, admin_service_1.updateGameService)(gameId, gameData);
        // Log activity for each updated field
        for (const [field, value] of Object.entries(gameData)) {
            await activity_logger_service_1.ActivityLoggerService.logGameUpdated(req, gameId, field, null, value);
        }
        res.status(200).json({ success: true, data: game });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateGame = updateGame;
const deleteGame = async (req, res, next) => {
    try {
        const gameId = parseInt(req.params.id);
        if (isNaN(gameId)) {
            res.status(400).json({ success: false, message: "Invalid game ID" });
            return;
        }
        const game = await (0, admin_service_1.deleteGameService)(gameId);
        // Log activity
        await activity_logger_service_1.ActivityLoggerService.logGameDeleted(req, gameId, game.name || `Game ${gameId}`);
        res.status(200).json({ success: true, data: game });
    }
    catch (err) {
        next(err);
    }
};
exports.deleteGame = deleteGame;
const getGamesForAdmin = async (req, res, next) => {
    try {
        const filters = req.query;
        const games = await (0, admin_service_1.getGamesForAdminService)(filters);
        res.status(200).json({ success: true, data: games });
    }
    catch (err) {
        next(err);
    }
};
exports.getGamesForAdmin = getGamesForAdmin;
// =====================================================
// USER MANAGEMENT CONTROLLERS
// =====================================================
const getUsersForAdmin = async (req, res, next) => {
    try {
        const filters = req.query;
        const users = await (0, admin_service_1.getUsersForAdminService)(filters);
        res.status(200).json({ success: true, data: users });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getUsersForAdmin = getUsersForAdmin;
const updateUserStatus = async (req, res, next) => {
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
            res.status(400).json({ success: false, message: "Invalid user ID" });
            return;
        }
        const statusData = req.validated?.body;
        const user = await (0, admin_service_1.updateUserStatusService)(userId, statusData);
        // Log activity
        await activity_logger_service_1.ActivityLoggerService.logUserStatusChanged(req, userId, statusData.status || 'unknown', user.status || statusData.status);
        res.status(200).json({ success: true, data: user });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateUserStatus = updateUserStatus;
const updateUserBalance = async (req, res, next) => {
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
            res.status(400).json({ success: false, message: "Invalid user ID" });
            return;
        }
        const balanceData = req.validated?.body;
        const result = await (0, admin_service_1.updateUserBalanceService)(userId, balanceData);
        // Log activity
        await activity_logger_service_1.ActivityLoggerService.logUserBalanceAdjusted(req, userId, balanceData.amount, balanceData.type || 'adjustment', balanceData.reason || 'Manual adjustment');
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateUserBalance = updateUserBalance;
// =====================================================
// DASHBOARD CONTROLLERS
// =====================================================
const getDashboardStats = async (req, res, next) => {
    try {
        const stats = await (0, admin_service_1.getDashboardStatsService)();
        res.status(200).json({ success: true, data: stats });
    }
    catch (err) {
        next(err);
    }
};
exports.getDashboardStats = getDashboardStats;
// =====================================================
// PROVIDER MANAGEMENT CONTROLLERS
// =====================================================
const getProviders = async (req, res, next) => {
    try {
        const providers = await adminGameImportService.getAllProviderConfigs();
        res.status(200).json({ success: true, data: providers });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getProviders = getProviders;
const createProvider = async (req, res, next) => {
    try {
        const { provider_name, api_key, api_secret, base_url, is_active = true, metadata } = req.body;
        const provider = await adminGameImportService.addProviderConfig({
            provider_name,
            api_key,
            api_secret,
            base_url,
            is_active,
            metadata
        });
        res.status(201).json({ success: true, data: provider, message: 'Provider created successfully' });
    }
    catch (error) {
        // Handle unique constraint violation (duplicate provider_name)
        if (error.code === '23505') {
            res.status(409).json({ success: false, message: 'Provider with this name already exists' });
            return;
        }
        console.error('[CREATE_PROVIDER] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createProvider = createProvider;
const updateProvider = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ success: false, message: 'Invalid provider ID' });
            return;
        }
        // Use efficient ID-based lookup
        const updated = await adminGameImportService.updateProviderConfigById(id, req.body);
        if (!updated) {
            res.status(404).json({ success: false, message: 'Provider not found' });
            return;
        }
        res.status(200).json({ success: true, data: updated, message: 'Provider updated successfully' });
    }
    catch (error) {
        // Handle unique constraint violation (duplicate provider_name)
        if (error.code === '23505') {
            res.status(409).json({ success: false, message: 'Provider with this name already exists' });
            return;
        }
        console.error('[UPDATE_PROVIDER] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateProvider = updateProvider;
const activateProvider = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ success: false, message: 'Invalid provider ID' });
            return;
        }
        const { is_active } = req.body;
        if (typeof is_active !== 'boolean') {
            res.status(400).json({ success: false, message: 'is_active must be boolean' });
            return;
        }
        // Use efficient ID-based lookup
        const updated = await adminGameImportService.updateProviderConfigById(id, { is_active });
        if (!updated) {
            res.status(404).json({ success: false, message: 'Provider not found' });
            return;
        }
        const statusMessage = is_active ? 'activated' : 'deactivated';
        res.status(200).json({
            success: true,
            data: updated,
            message: `Provider ${statusMessage} successfully`
        });
    }
    catch (error) {
        console.error('[ACTIVATE_PROVIDER] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.activateProvider = activateProvider;
const deleteProvider = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ success: false, message: 'Invalid provider ID' });
            return;
        }
        // Delete provider with cascade handling
        const result = await adminGameImportService.deleteProviderConfigById(id);
        if (!result.success) {
            // Return appropriate status code based on error
            const statusCode = result.message.includes('not found') ? 404 : 400;
            res.status(statusCode).json({
                success: false,
                message: result.message
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: result.message,
            affected_games: result.affected_games
        });
    }
    catch (error) {
        console.error('[DELETE_PROVIDER] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteProvider = deleteProvider;
// =====================================================
// TRANSACTION MANAGEMENT CONTROLLERS
// =====================================================
const getTransactions = async (req, res) => {
    try {
        const filters = req.query;
        const transactions = await (0, admin_service_1.getTransactionsForAdminService)(filters);
        res.status(200).json({ success: true, data: transactions });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getTransactions = getTransactions;
const approveTransaction = async (req, res, next) => {
    try {
        const transactionId = parseInt(req.params.id);
        if (isNaN(transactionId)) {
            res.status(400).json({ success: false, message: "Invalid transaction ID" });
            return;
        }
        const { status, reason } = req.body;
        const approvalData = {
            transaction_id: transactionId,
            status,
            reason
        };
        const transaction = await (0, admin_service_1.approveTransactionService)(approvalData);
        // Log activity based on status
        if (status === 'approved') {
            await activity_logger_service_1.ActivityLoggerService.logTransactionApproved(req, transactionId, transaction.amount || 0, transaction.type || 'unknown');
        }
        else if (status === 'rejected') {
            await activity_logger_service_1.ActivityLoggerService.logTransactionRejected(req, transactionId, transaction.amount || 0, transaction.type || 'unknown', reason || 'No reason provided');
        }
        res.status(200).json({ success: true, data: transaction });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.approveTransaction = approveTransaction;
// =====================================================
// SETTINGS CONTROLLERS
// =====================================================
const getSystemSettings = async (req, res, next) => {
    try {
        const settings = await (0, admin_service_1.getSystemSettingsService)();
        res.status(200).json({ success: true, data: settings });
    }
    catch (err) {
        next(err);
    }
};
exports.getSystemSettings = getSystemSettings;
const updateSystemSettings = async (req, res, next) => {
    try {
        const settingsData = req.validated?.body;
        const settings = await (0, admin_service_1.updateSystemSettingsService)(settingsData);
        // Log activity for each updated setting
        for (const [key, value] of Object.entries(settingsData)) {
            await activity_logger_service_1.ActivityLoggerService.logSystemSettingsUpdated(req, key, null, value);
        }
        res.status(200).json({ success: true, data: settings });
    }
    catch (err) {
        next(err);
    }
};
exports.updateSystemSettings = updateSystemSettings;
// =====================================================
// ANALYTICS CONTROLLERS
// =====================================================
const getRevenueAnalytics = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        if (!start_date || !end_date) {
            res.status(400).json({ success: false, message: "Start date and end date are required" });
            return;
        }
        const analytics = await (0, admin_service_1.getRevenueAnalyticsService)(start_date, end_date);
        res.status(200).json({ success: true, data: analytics });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getRevenueAnalytics = getRevenueAnalytics;
const getUserAnalytics = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        if (!start_date || !end_date) {
            res.status(400).json({ success: false, message: "Start date and end date are required" });
            return;
        }
        const analytics = await (0, admin_service_1.getUserAnalyticsService)(start_date, end_date);
        res.status(200).json({ success: true, data: analytics });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getUserAnalytics = getUserAnalytics;
// =====================================================
// PAYMENT GATEWAY CONTROLLERS
// =====================================================
const createPaymentGateway = async (req, res, next) => {
    try {
        const gatewayData = req.validated?.body;
        const gateway = await (0, payment_gateway_service_1.createPaymentGatewayService)(gatewayData);
        res.status(201).json({ success: true, data: gateway });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createPaymentGateway = createPaymentGateway;
const updatePaymentGateway = async (req, res, next) => {
    try {
        const gatewayId = parseInt(req.params.id);
        if (isNaN(gatewayId)) {
            res.status(400).json({ success: false, message: "Invalid gateway ID" });
            return;
        }
        const gatewayData = req.validated?.body;
        const gateway = await (0, payment_gateway_service_1.updatePaymentGatewayService)(gatewayId, gatewayData);
        res.status(200).json({ success: true, data: gateway });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updatePaymentGateway = updatePaymentGateway;
const getPaymentGateways = async (req, res, next) => {
    try {
        const filters = req.query;
        const gateways = await (0, payment_gateway_service_1.getPaymentGatewaysService)(filters);
        res.status(200).json({ success: true, data: gateways });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getPaymentGateways = getPaymentGateways;
const getPaymentGatewayById = async (req, res, next) => {
    try {
        const gatewayId = parseInt(req.params.id);
        if (isNaN(gatewayId)) {
            res.status(400).json({ success: false, message: "Invalid gateway ID" });
            return;
        }
        const gateway = await (0, payment_gateway_service_1.getPaymentGatewayByIdService)(gatewayId);
        if (!gateway) {
            res.status(404).json({ success: false, message: "Payment gateway not found" });
            return;
        }
        res.status(200).json({ success: true, data: gateway });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getPaymentGatewayById = getPaymentGatewayById;
const deletePaymentGateway = async (req, res, next) => {
    try {
        const gatewayId = parseInt(req.params.id);
        if (isNaN(gatewayId)) {
            res.status(400).json({ success: false, message: "Invalid gateway ID" });
            return;
        }
        const gateway = await (0, payment_gateway_service_1.deletePaymentGatewayService)(gatewayId);
        if (!gateway) {
            res.status(404).json({ success: false, message: "Payment gateway not found" });
            return;
        }
        res.status(200).json({ success: true, data: gateway });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deletePaymentGateway = deletePaymentGateway;
const getActivePaymentGateways = async (req, res, next) => {
    try {
        const { type, currency } = req.query;
        if (!type || !currency) {
            res.status(400).json({ success: false, message: "Type and currency are required" });
            return;
        }
        const gateways = await (0, payment_gateway_service_1.getActivePaymentGatewaysService)(type, currency);
        res.status(200).json({ success: true, data: gateways });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getActivePaymentGateways = getActivePaymentGateways;
const testPaymentGatewayConnection = async (req, res, next) => {
    try {
        const gatewayId = parseInt(req.params.id);
        if (isNaN(gatewayId)) {
            res.status(400).json({ success: false, message: "Invalid gateway ID" });
            return;
        }
        const result = await (0, payment_gateway_service_1.testPaymentGatewayConnectionService)(gatewayId);
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.testPaymentGatewayConnection = testPaymentGatewayConnection;
const getPaymentGatewayStats = async (req, res, next) => {
    try {
        const gatewayId = parseInt(req.params.id);
        if (isNaN(gatewayId)) {
            res.status(400).json({ success: false, message: "Invalid gateway ID" });
            return;
        }
        const { start_date, end_date } = req.query;
        const stats = await (0, payment_gateway_service_1.getPaymentGatewayStatsService)(gatewayId, start_date, end_date);
        res.status(200).json({ success: true, data: stats });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getPaymentGatewayStats = getPaymentGatewayStats;
// =====================================================
// RTP MANAGEMENT CONTROLLERS
// =====================================================
const getRTPSettings = async (req, res, next) => {
    try {
        // Get RTP settings from rtp_settings table (REAL DATA)
        const { getRTPSettingsFromDatabase, getRTPAnalyticsService } = require("../../services/admin/rtp.service");
        const settings = await getRTPSettingsFromDatabase();
        // Get RTP statistics
        const analytics = await getRTPAnalyticsService();
        console.log('[GET_RTP_SETTINGS] Returning real settings from database:', settings);
        res.status(200).json({
            success: true,
            data: {
                settings: settings,
                analytics: analytics
            }
        });
    }
    catch (error) {
        console.error('[GET_RTP_SETTINGS] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getRTPSettings = getRTPSettings;
const updateRTPSettings = async (req, res, next) => {
    try {
        const rtpData = req.body; // Get full body, not just validated
        console.log('[UPDATE_RTP_SETTINGS] Received data:', JSON.stringify(rtpData, null, 2));
        const { updateRTPSettingsInDatabase } = require("../../services/admin/rtp.service");
        const settings = await updateRTPSettingsInDatabase(rtpData);
        // Log activity for RTP settings update
        await activity_logger_service_1.ActivityLoggerService.logRTPSettingsUpdated(req, 'rtp_settings', null, rtpData);
        console.log('[UPDATE_RTP_SETTINGS] Settings updated successfully');
        res.status(200).json({ success: true, data: settings });
    }
    catch (error) {
        console.error('[UPDATE_RTP_SETTINGS] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateRTPSettings = updateRTPSettings;
const getRTPAnalytics = async (req, res, next) => {
    try {
        const { start_date, end_date, game_id, provider, category } = req.query;
        const { getRTPAnalyticsService } = require("../../services/admin/rtp.service");
        const analytics = await getRTPAnalyticsService({
            start_date,
            end_date,
            game_id,
            provider,
            category
        });
        res.status(200).json({ success: true, data: analytics });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getRTPAnalytics = getRTPAnalytics;
const bulkUpdateRTP = async (req, res, next) => {
    try {
        const { game_ids, rtp_percentage, category, provider } = req.validated?.body;
        const { bulkUpdateRTPService } = require("../../services/admin/rtp.service");
        const result = await bulkUpdateRTPService({
            game_ids,
            rtp_percentage,
            category,
            provider
        });
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.bulkUpdateRTP = bulkUpdateRTP;
const getRTPReport = async (req, res, next) => {
    try {
        const { start_date, end_date, format = 'json' } = req.query;
        const { generateRTPReportService } = require("../../services/admin/rtp.service");
        const report = await generateRTPReportService({
            start_date,
            end_date,
            format
        });
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="rtp-report.csv"');
            res.status(200).send(report);
        }
        else {
            res.status(200).json({ success: true, data: report });
        }
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getRTPReport = getRTPReport;
// =====================================================
// PROFIT CONTROL CONTROLLERS
// =====================================================
const getProfitAnalytics = async (req, res, next) => {
    try {
        const { start_date, end_date, game_id, provider } = req.query;
        const { ProfitControlService } = require("../../services/profit/profit-control.service");
        const analytics = await ProfitControlService.getProfitAnalytics({
            start_date,
            end_date,
            game_id,
            provider
        });
        res.status(200).json({
            success: true,
            data: analytics
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getProfitAnalytics = getProfitAnalytics;
const triggerAutoAdjustment = async (req, res, next) => {
    try {
        const { ProfitControlService } = require("../../services/profit/profit-control.service");
        // Trigger auto-adjustment
        const adjustment = await ProfitControlService.autoAdjustEffectiveRtp();
        // Get current profit performance
        const performance = await ProfitControlService.calculateProfitPerformance();
        res.status(200).json({
            success: true,
            data: {
                adjustment,
                performance
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.triggerAutoAdjustment = triggerAutoAdjustment;
const getProfitPerformance = async (req, res, next) => {
    try {
        const { ProfitControlService } = require("../../services/profit/profit-control.service");
        const performance = await ProfitControlService.calculateProfitPerformance();
        res.status(200).json({
            success: true,
            data: performance
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getProfitPerformance = getProfitPerformance;
// =====================================================
// CRON MANAGEMENT CONTROLLERS
// =====================================================
const getCronStatus = async (req, res, next) => {
    try {
        const { CronManagerService } = require("../../services/cron/cron-manager.service");
        const status = CronManagerService.getCronStatus();
        res.status(200).json({
            success: true,
            data: status
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getCronStatus = getCronStatus;
const startCronJobs = async (req, res, next) => {
    try {
        const { CronManagerService } = require("../../services/cron/cron-manager.service");
        CronManagerService.startAllCronJobs();
        res.status(200).json({
            success: true,
            message: "Background cron jobs started successfully"
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.startCronJobs = startCronJobs;
const stopCronJobs = async (req, res, next) => {
    try {
        const { CronManagerService } = require("../../services/cron/cron-manager.service");
        CronManagerService.stopAllCronJobs();
        res.status(200).json({
            success: true,
            message: "Background cron jobs stopped successfully"
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.stopCronJobs = stopCronJobs;
const triggerManualAutoAdjustment = async (req, res, next) => {
    try {
        const { CronManagerService } = require("../../services/cron/cron-manager.service");
        const result = await CronManagerService.triggerAutoAdjustment();
        res.status(200).json({
            success: true,
            message: "Manual auto-adjustment triggered successfully",
            data: result
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.triggerManualAutoAdjustment = triggerManualAutoAdjustment;
const triggerManualDailySummary = async (req, res, next) => {
    try {
        const { CronManagerService } = require("../../services/cron/cron-manager.service");
        const result = await CronManagerService.triggerDailySummary();
        res.status(200).json({
            success: true,
            message: "Manual daily summary triggered successfully",
            data: result
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.triggerManualDailySummary = triggerManualDailySummary;
const createUser = async (req, res, next) => {
    try {
        const userData = req.validated?.body;
        // Import the register service and modify it for admin use
        const { registerService } = require('../../services/auth/auth.service');
        // Create a modified version of the registration data without captcha
        const registrationData = {
            username: userData.username,
            email: userData.email,
            password: userData.password,
            type: userData.type,
            captcha_id: 'admin_bypass',
            captcha_text: 'admin_bypass'
        };
        const response = await registerService(registrationData);
        // Log activity
        await activity_logger_service_1.ActivityLoggerService.logUserCreated(req, response.user_id, userData.username, userData.type);
        res.status(201).json({
            success: true,
            message: 'User created successfully by admin',
            data: {
                user_id: response.user_id,
                username: userData.username,
                email: userData.email,
                type: userData.type,
                qr_code: response.qr_code,
                auth_secret: response.auth_secret
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createUser = createUser;
