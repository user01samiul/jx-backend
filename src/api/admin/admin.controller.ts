import { Request, Response, NextFunction } from "express";
import {
  createGameService,
  updateGameService,
  deleteGameService,
  getGamesForAdminService,
  getUsersForAdminService,
  updateUserStatusService,
  updateUserBalanceService,
  approveTransactionService,
  getDashboardStatsService,
  getSystemSettingsService,
  updateSystemSettingsService,
  getTransactionsForAdminService,
  getRevenueAnalyticsService,
  getUserAnalyticsService
} from "../../services/admin/admin.service";
import {
  // Payment Gateway Services
  createPaymentGatewayService,
  updatePaymentGatewayService,
  getPaymentGatewaysService,
  getPaymentGatewayByIdService,
  deletePaymentGatewayService,
  getActivePaymentGatewaysService,
  testPaymentGatewayConnectionService,
  getPaymentGatewayStatsService
} from "../../services/admin/payment-gateway.service";
import {
  CreateGameInputType,
  UpdateGameInputType,
  UserFiltersInputType,
  UpdateUserStatusInputType,
  UpdateUserBalanceInputType,
  ApproveTransactionInputType,
  // Payment Gateway Types
  CreatePaymentGatewayInputType,
  UpdatePaymentGatewayInputType,
  PaymentGatewayFiltersInputType
} from "./admin.schema";
import { AdminGameImportService } from '../../services/admin/admin.game-import.service';
import { AdminCreateUserInputType } from './admin.schema';
import { ActivityLoggerService } from '../../services/activity/activity-logger.service';

const adminGameImportService = new AdminGameImportService();

// =====================================================
// GAME MANAGEMENT CONTROLLERS
// =====================================================

export const createGame = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gameData = req.validated?.body as CreateGameInputType;
    const game = await createGameService(gameData);

    // Log activity
    await ActivityLoggerService.logGameCreated(
      req,
      game.id,
      game.name,
      game.provider || 'Unknown'
    );

    res.status(201).json({ success: true, data: game });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateGame = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gameId = parseInt(req.params.id);
    if (isNaN(gameId)) {
      res.status(400).json({ success: false, message: "Invalid game ID" });
      return;
    }

    const gameData = req.validated?.body as UpdateGameInputType;
    const game = await updateGameService(gameId, gameData);

    // Log activity for each updated field
    for (const [field, value] of Object.entries(gameData)) {
      await ActivityLoggerService.logGameUpdated(req, gameId, field, null, value);
    }

    res.status(200).json({ success: true, data: game });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteGame = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gameId = parseInt(req.params.id);
    if (isNaN(gameId)) {
      res.status(400).json({ success: false, message: "Invalid game ID" });
      return;
    }

    const game = await deleteGameService(gameId);

    // Log activity
    await ActivityLoggerService.logGameDeleted(
      req,
      gameId,
      game.name || `Game ${gameId}`
    );

    res.status(200).json({ success: true, data: game });
  } catch (err) {
    next(err);
  }
};

export const getGamesForAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = req.query as any;
    const games = await getGamesForAdminService(filters);
    res.status(200).json({ success: true, data: games });
  } catch (err) {
    next(err);
  }
};

// =====================================================
// USER MANAGEMENT CONTROLLERS
// =====================================================

export const getUsersForAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters: UserFiltersInputType = req.query as any;
    const users = await getUsersForAdminService(filters);
    res.status(200).json({ success: true, data: users });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUserStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      res.status(400).json({ success: false, message: "Invalid user ID" });
      return;
    }

    const statusData = req.validated?.body as UpdateUserStatusInputType;
    const user = await updateUserStatusService(userId, statusData);

    // Log activity
    await ActivityLoggerService.logUserStatusChanged(
      req,
      userId,
      statusData.status || 'unknown',
      user.status || statusData.status
    );

    res.status(200).json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUserBalance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      res.status(400).json({ success: false, message: "Invalid user ID" });
      return;
    }

    const balanceData = req.validated?.body as UpdateUserBalanceInputType;
    const result = await updateUserBalanceService(userId, balanceData);

    // Log activity
    await ActivityLoggerService.logUserBalanceAdjusted(
      req,
      userId,
      balanceData.amount,
      balanceData.type || 'adjustment',
      balanceData.reason || 'Manual adjustment'
    );

    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// DASHBOARD CONTROLLERS
// =====================================================

export const getDashboardStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await getDashboardStatsService();
    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

// =====================================================
// PROVIDER MANAGEMENT CONTROLLERS
// =====================================================

export const getProviders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const providers = await adminGameImportService.getAllProviderConfigs();
    res.status(200).json({ success: true, data: providers });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createProvider = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
    res.status(201).json({ success: true, data: provider });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProvider = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: 'Invalid provider ID' });
      return;
    }
    // Find provider by id to get provider_name
    const all = await adminGameImportService.getAllProviderConfigs();
    const provider = all.find(p => p.id === id);
    if (!provider) {
      res.status(404).json({ success: false, message: 'Provider not found' });
      return;
    }
    const updated = await adminGameImportService.updateProviderConfig(provider.provider_name, req.body);
    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const activateProvider = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
    // Find provider by id to get provider_name
    const all = await adminGameImportService.getAllProviderConfigs();
    const provider = all.find(p => p.id === id);
    if (!provider) {
      res.status(404).json({ success: false, message: 'Provider not found' });
      return;
    }
    const updated = await adminGameImportService.updateProviderConfig(provider.provider_name, { is_active });
    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// TRANSACTION MANAGEMENT CONTROLLERS
// =====================================================

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const filters = req.query as any;
    const transactions = await getTransactionsForAdminService(filters);
    res.status(200).json({ success: true, data: transactions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const transactionId = parseInt(req.params.id);
    if (isNaN(transactionId)) {
      res.status(400).json({ success: false, message: "Invalid transaction ID" });
      return;
    }

    const { status, reason } = req.body;
    const approvalData: ApproveTransactionInputType = {
      transaction_id: transactionId,
      status,
      reason
    };
    const transaction = await approveTransactionService(approvalData);

    // Log activity based on status
    if (status === 'approved') {
      await ActivityLoggerService.logTransactionApproved(
        req,
        transactionId,
        transaction.amount || 0,
        transaction.type || 'unknown'
      );
    } else if (status === 'rejected') {
      await ActivityLoggerService.logTransactionRejected(
        req,
        transactionId,
        transaction.amount || 0,
        transaction.type || 'unknown',
        reason || 'No reason provided'
      );
    }

    res.status(200).json({ success: true, data: transaction });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// SETTINGS CONTROLLERS
// =====================================================

export const getSystemSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await getSystemSettingsService();
    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
};

export const updateSystemSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settingsData = req.validated?.body as any;
    const settings = await updateSystemSettingsService(settingsData);

    // Log activity for each updated setting
    for (const [key, value] of Object.entries(settingsData)) {
      await ActivityLoggerService.logSystemSettingsUpdated(
        req,
        key,
        null,
        value
      );
    }

    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
};

// =====================================================
// ANALYTICS CONTROLLERS
// =====================================================

export const getRevenueAnalytics = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      res.status(400).json({ success: false, message: "Start date and end date are required" });
      return;
    }
    
    const analytics = await getRevenueAnalyticsService(start_date as string, end_date as string);
    res.status(200).json({ success: true, data: analytics });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserAnalytics = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      res.status(400).json({ success: false, message: "Start date and end date are required" });
      return;
    }
    
    const analytics = await getUserAnalyticsService(start_date as string, end_date as string);
    res.status(200).json({ success: true, data: analytics });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// PAYMENT GATEWAY CONTROLLERS
// =====================================================

export const createPaymentGateway = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gatewayData = req.validated?.body as CreatePaymentGatewayInputType;
    const gateway = await createPaymentGatewayService(gatewayData);
    res.status(201).json({ success: true, data: gateway });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePaymentGateway = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gatewayId = parseInt(req.params.id);
    if (isNaN(gatewayId)) {
      res.status(400).json({ success: false, message: "Invalid gateway ID" });
      return;
    }

    const gatewayData = req.validated?.body as UpdatePaymentGatewayInputType;
    const gateway = await updatePaymentGatewayService(gatewayId, gatewayData);
    res.status(200).json({ success: true, data: gateway });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPaymentGateways = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters: PaymentGatewayFiltersInputType = req.query as any;
    const gateways = await getPaymentGatewaysService(filters);
    res.status(200).json({ success: true, data: gateways });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPaymentGatewayById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gatewayId = parseInt(req.params.id);
    if (isNaN(gatewayId)) {
      res.status(400).json({ success: false, message: "Invalid gateway ID" });
      return;
    }

    const gateway = await getPaymentGatewayByIdService(gatewayId);
    if (!gateway) {
      res.status(404).json({ success: false, message: "Payment gateway not found" });
      return;
    }

    res.status(200).json({ success: true, data: gateway });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePaymentGateway = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gatewayId = parseInt(req.params.id);
    if (isNaN(gatewayId)) {
      res.status(400).json({ success: false, message: "Invalid gateway ID" });
      return;
    }

    const gateway = await deletePaymentGatewayService(gatewayId);
    if (!gateway) {
      res.status(404).json({ success: false, message: "Payment gateway not found" });
      return;
    }

    res.status(200).json({ success: true, data: gateway });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getActivePaymentGateways = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { type, currency } = req.query as any;
    if (!type || !currency) {
      res.status(400).json({ success: false, message: "Type and currency are required" });
      return;
    }

    const gateways = await getActivePaymentGatewaysService(type, currency);
    res.status(200).json({ success: true, data: gateways });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const testPaymentGatewayConnection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gatewayId = parseInt(req.params.id);
    if (isNaN(gatewayId)) {
      res.status(400).json({ success: false, message: "Invalid gateway ID" });
      return;
    }

    const result = await testPaymentGatewayConnectionService(gatewayId);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPaymentGatewayStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gatewayId = parseInt(req.params.id);
    if (isNaN(gatewayId)) {
      res.status(400).json({ success: false, message: "Invalid gateway ID" });
      return;
    }

    const { start_date, end_date } = req.query as any;
    const stats = await getPaymentGatewayStatsService(gatewayId, start_date, end_date);
    res.status(200).json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// RTP MANAGEMENT CONTROLLERS
// =====================================================

export const getRTPSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
  } catch (error: any) {
    console.error('[GET_RTP_SETTINGS] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateRTPSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rtpData = req.body; // Get full body, not just validated
    console.log('[UPDATE_RTP_SETTINGS] Received data:', JSON.stringify(rtpData, null, 2));

    const { updateRTPSettingsInDatabase } = require("../../services/admin/rtp.service");
    const settings = await updateRTPSettingsInDatabase(rtpData);

    // Log activity for RTP settings update
    await ActivityLoggerService.logRTPSettingsUpdated(
      req,
      'rtp_settings',
      null,
      rtpData
    );

    console.log('[UPDATE_RTP_SETTINGS] Settings updated successfully');

    res.status(200).json({ success: true, data: settings });
  } catch (error: any) {
    console.error('[UPDATE_RTP_SETTINGS] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getRTPAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { start_date, end_date, game_id, provider, category } = req.query as any;
    const { getRTPAnalyticsService } = require("../../services/admin/rtp.service");
    
    const analytics = await getRTPAnalyticsService({
      start_date,
      end_date,
      game_id,
      provider,
      category
    });
    
    res.status(200).json({ success: true, data: analytics });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const bulkUpdateRTP = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { game_ids, rtp_percentage, category, provider } = req.validated?.body as any;
    const { bulkUpdateRTPService } = require("../../services/admin/rtp.service");
    
    const result = await bulkUpdateRTPService({
      game_ids,
      rtp_percentage,
      category,
      provider
    });
    
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getRTPReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { start_date, end_date, format = 'json' } = req.query as any;
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
    } else {
      res.status(200).json({ success: true, data: report });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}; 

// =====================================================
// PROFIT CONTROL CONTROLLERS
// =====================================================

export const getProfitAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { start_date, end_date, game_id, provider } = req.query as any;
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const triggerAutoAdjustment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProfitPerformance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { ProfitControlService } = require("../../services/profit/profit-control.service");
    
    const performance = await ProfitControlService.calculateProfitPerformance();
    
    res.status(200).json({ 
      success: true, 
      data: performance 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}; 

// =====================================================
// CRON MANAGEMENT CONTROLLERS
// =====================================================

export const getCronStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { CronManagerService } = require("../../services/cron/cron-manager.service");
    const status = CronManagerService.getCronStatus();
    
    res.status(200).json({ 
      success: true, 
      data: status 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const startCronJobs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { CronManagerService } = require("../../services/cron/cron-manager.service");
    CronManagerService.startAllCronJobs();
    
    res.status(200).json({ 
      success: true, 
      message: "Background cron jobs started successfully" 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const stopCronJobs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { CronManagerService } = require("../../services/cron/cron-manager.service");
    CronManagerService.stopAllCronJobs();
    
    res.status(200).json({ 
      success: true, 
      message: "Background cron jobs stopped successfully" 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const triggerManualAutoAdjustment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { CronManagerService } = require("../../services/cron/cron-manager.service");
    const result = await CronManagerService.triggerAutoAdjustment();
    
    res.status(200).json({ 
      success: true, 
      message: "Manual auto-adjustment triggered successfully",
      data: result 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const triggerManualDailySummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { CronManagerService } = require("../../services/cron/cron-manager.service");
    const result = await CronManagerService.triggerDailySummary();
    
    res.status(200).json({ 
      success: true, 
      message: "Manual daily summary triggered successfully",
      data: result 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}; 

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userData = req.validated?.body as AdminCreateUserInputType;

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
    await ActivityLoggerService.logUserCreated(
      req,
      response.user_id,
      userData.username,
      userData.type
    );

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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}; 