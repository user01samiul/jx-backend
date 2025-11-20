/**
 * EXAMPLE: How to integrate Activity Logging in Admin Controllers
 * 
 * Add these imports at the top of admin.controller.ts:
 * import ActivityLoggerService from '../../services/activity/activity-logger.service';
 *
 * Then modify each controller to log after successful operations:
 */

import { Request, Response, NextFunction } from "express";
import ActivityLoggerService from '../../services/activity/activity-logger.service';

// ===========================================
// EXAMPLE 1: Game Management with Logging
// ===========================================

export const createGameWithLogging = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gameData = req.validated?.body;
    const game = await createGameService(gameData);

    // LOG ACTIVITY after successful creation
    await ActivityLoggerService.logGameCreated(
      req,
      game.id,
      game.name,
      game.provider
    );

    res.status(201).json({ success: true, data: game });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateGameWithLogging = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gameId = parseInt(req.params.id);
    const gameData = req.validated?.body;

    // Get old data for comparison
    const oldGame = await getGameByIdService(gameId);
    const game = await updateGameService(gameId, gameData);

    // LOG ACTIVITY for each changed field
    Object.keys(gameData).forEach(async (field) => {
      if (oldGame[field] !== gameData[field]) {
        await ActivityLoggerService.logGameUpdated(
          req,
          gameId,
          field,
          oldGame[field],
          gameData[field]
        );
      }
    });

    res.status(200).json({ success: true, data: game });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteGameWithLogging = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gameId = parseInt(req.params.id);
    const game = await getGameByIdService(gameId);
    await deleteGameService(gameId);

    // LOG ACTIVITY after deletion
    await ActivityLoggerService.logGameDeleted(req, gameId, game.name);

    res.status(200).json({ success: true, message: 'Game deleted' });
  } catch (err) {
    next(err);
  }
};

// ===========================================
// EXAMPLE 2: User Management with Logging
// ===========================================

export const updateUserStatusWithLogging = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = parseInt(req.params.id);
    const { status_id } = req.validated?.body;

    // Get old status
    const oldUser = await getUserByIdService(userId);
    const updatedUser = await updateUserStatusService(userId, status_id);

    // LOG ACTIVITY
    await ActivityLoggerService.logUserStatusChanged(
      req,
      userId,
      oldUser.status,
      updatedUser.status
    );

    res.status(200).json({ success: true, data: updatedUser });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUserBalanceWithLogging = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = parseInt(req.params.id);
    const { amount, type, reason } = req.validated?.body;

    const result = await updateUserBalanceService(userId, amount, type);

    // LOG ACTIVITY
    await ActivityLoggerService.logUserBalanceAdjusted(
      req,
      userId,
      amount,
      type,
      reason || 'Admin adjustment'
    );

    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===========================================
// EXAMPLE 3: Settings with Logging
// ===========================================

export const updateSystemSettingsWithLogging = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const settingData = req.validated?.body;

    // Get old settings
    const oldSettings = await getSystemSettingsService();
    const newSettings = await updateSystemSettingsService(settingData);

    // LOG ACTIVITY for each changed setting
    Object.keys(settingData).forEach(async (key) => {
      if (oldSettings[key] !== settingData[key]) {
        await ActivityLoggerService.logSystemSettingsUpdated(
          req,
          key,
          oldSettings[key],
          settingData[key]
        );
      }
    });

    res.status(200).json({ success: true, data: newSettings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===========================================
// EXAMPLE 4: RTP Control with Logging
// ===========================================

export const triggerRTPAutoAdjustmentWithLogging = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const adjustments = await triggerAutoAdjustmentService();

    // LOG ACTIVITY
    await ActivityLoggerService.logRTPAutoAdjustmentTriggered(req, adjustments);

    res.status(200).json({ success: true, data: adjustments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===========================================
// EXAMPLE 5: Transaction Management
// ===========================================

export const approveTransactionWithLogging = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const transactionId = parseInt(req.params.id);
    const transaction = await getTransactionByIdService(transactionId);
    const result = await approveTransactionService(transactionId);

    // LOG ACTIVITY
    await ActivityLoggerService.logTransactionApproved(
      req,
      transactionId,
      transaction.amount,
      transaction.type
    );

    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * TO IMPLEMENT IN YOUR CODE:
 *
 * 1. Add import at top of each controller file:
 *    import ActivityLoggerService from '../../services/activity/activity-logger.service';
 *
 * 2. Add logging call after each successful operation:
 *    await ActivityLoggerService.log[ActionName](req, ...params);
 *
 * 3. Always log AFTER the operation succeeds, not before
 *
 * 4. For bulk operations, you can use:
 *    await ActivityLoggerService.logGenericAction(req, 'bulk_update_games', { count: 10 }, 'Games');
 */
