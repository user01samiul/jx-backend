import { Request } from 'express';
import { logActivity } from '../../middlewares/activity-logger';

/**
 * Activity Logger Service
 * Centralized logging for all admin actions
 */

export class ActivityLoggerService {
  // User Management
  static async logUserCreated(req: Request, userId: number, username: string, role: string) {
    await logActivity(req, 'user_created', {
      user_id: userId,
      username,
      role,
      module: 'Users',
    });
  }

  static async logUserUpdated(req: Request, userId: number, field: string, oldValue: any, newValue: any) {
    await logActivity(req, 'user_updated', {
      user_id: userId,
      field,
      old_value: oldValue,
      new_value: newValue,
      module: 'Users',
    });
  }

  static async logUserDeleted(req: Request, userId: number, username: string) {
    await logActivity(req, 'user_deleted', {
      user_id: userId,
      username,
      module: 'Users',
    });
  }

  static async logUserStatusChanged(req: Request, userId: number, oldStatus: string, newStatus: string) {
    await logActivity(req, 'user_status_changed', {
      user_id: userId,
      old_status: oldStatus,
      new_status: newStatus,
      module: 'Users',
    });
  }

  static async logUserBalanceAdjusted(req: Request, userId: number, amount: number, type: string, reason: string) {
    await logActivity(req, 'user_balance_adjusted', {
      user_id: userId,
      amount,
      type,
      reason,
      module: 'Users',
    });
  }

  // Game Management
  static async logGameCreated(req: Request, gameId: number, gameName: string, provider: string) {
    await logActivity(req, 'game_created', {
      game_id: gameId,
      game_name: gameName,
      provider,
      module: 'Games',
    });
  }

  static async logGameUpdated(req: Request, gameId: number, field: string, oldValue: any, newValue: any) {
    await logActivity(req, 'game_updated', {
      game_id: gameId,
      field,
      old_value: oldValue,
      new_value: newValue,
      module: 'Games',
    });
  }

  static async logGameStatusChanged(req: Request, gameId: number, oldStatus: string, newStatus: string) {
    await logActivity(req, 'game_status_changed', {
      game_id: gameId,
      old_status: oldStatus,
      new_status: newStatus,
      module: 'Games',
    });
  }

  static async logGameDeleted(req: Request, gameId: number, gameName: string) {
    await logActivity(req, 'game_deleted', {
      game_id: gameId,
      game_name: gameName,
      module: 'Games',
    });
  }

  // RTP & Settings
  static async logRTPSettingsUpdated(req: Request, setting: string, oldValue: any, newValue: any) {
    await logActivity(req, 'rtp_settings_updated', {
      setting,
      old_value: oldValue,
      new_value: newValue,
      module: 'RTP Control',
    });
  }

  static async logRTPAutoAdjustmentTriggered(req: Request, adjustments: any) {
    await logActivity(req, 'rtp_auto_adjustment_triggered', {
      adjustments,
      module: 'RTP Control',
    });
  }

  static async logSystemSettingsUpdated(req: Request, setting: string, oldValue: any, newValue: any) {
    await logActivity(req, 'system_settings_updated', {
      setting,
      old_value: oldValue,
      new_value: newValue,
      module: 'Settings',
    });
  }

  // Promotions
  static async logPromotionCreated(req: Request, promotionId: number, name: string, type: string) {
    await logActivity(req, 'promotion_created', {
      promotion_id: promotionId,
      name,
      type,
      module: 'Promotions',
    });
  }

  static async logPromotionUpdated(req: Request, promotionId: number, field: string, oldValue: any, newValue: any) {
    await logActivity(req, 'promotion_updated', {
      promotion_id: promotionId,
      field,
      old_value: oldValue,
      new_value: newValue,
      module: 'Promotions',
    });
  }

  static async logPromotionStatusChanged(req: Request, promotionId: number, oldStatus: string, newStatus: string) {
    await logActivity(req, 'promotion_status_changed', {
      promotion_id: promotionId,
      old_status: oldStatus,
      new_status: newStatus,
      module: 'Promotions',
    });
  }

  static async logPromotionDeleted(req: Request, promotionId: number, name: string) {
    await logActivity(req, 'promotion_deleted', {
      promotion_id: promotionId,
      name,
      module: 'Promotions',
    });
  }

  // KYC
  static async logKYCApproved(req: Request, userId: number, documentType: string) {
    await logActivity(req, 'kyc_approved', {
      user_id: userId,
      document_type: documentType,
      module: 'KYC',
    });
  }

  static async logKYCRejected(req: Request, userId: number, documentType: string, reason: string) {
    await logActivity(req, 'kyc_rejected', {
      user_id: userId,
      document_type: documentType,
      reason,
      module: 'KYC',
    });
  }

  // Transactions
  static async logTransactionApproved(req: Request, transactionId: number, amount: number, type: string) {
    await logActivity(req, 'transaction_approved', {
      transaction_id: transactionId,
      amount,
      type,
      module: 'Transactions',
    });
  }

  static async logTransactionRejected(req: Request, transactionId: number, amount: number, type: string, reason: string) {
    await logActivity(req, 'transaction_rejected', {
      transaction_id: transactionId,
      amount,
      type,
      reason,
      module: 'Transactions',
    });
  }

  // Affiliates
  static async logAffiliateCreated(req: Request, affiliateId: number, username: string) {
    await logActivity(req, 'affiliate_created', {
      affiliate_id: affiliateId,
      username,
      module: 'Affiliates',
    });
  }

  static async logAffiliatePayoutProcessed(req: Request, payoutId: number, affiliateId: number, amount: number) {
    await logActivity(req, 'affiliate_payout_processed', {
      payout_id: payoutId,
      affiliate_id: affiliateId,
      amount,
      module: 'Affiliates',
    });
  }

  // Banners
  static async logBannerCreated(req: Request, bannerId: number, title: string) {
    await logActivity(req, 'banner_created', {
      banner_id: bannerId,
      title,
      module: 'Banners',
    });
  }

  static async logBannerUpdated(req: Request, bannerId: number, field: string, oldValue: any, newValue: any) {
    await logActivity(req, 'banner_updated', {
      banner_id: bannerId,
      field,
      old_value: oldValue,
      new_value: newValue,
      module: 'Banners',
    });
  }

  static async logBannerDeleted(req: Request, bannerId: number, title: string) {
    await logActivity(req, 'banner_deleted', {
      banner_id: bannerId,
      title,
      module: 'Banners',
    });
  }

  // Login
  static async logAdminLogin(req: Request, username: string, role: string) {
    await logActivity(req, 'admin_login', {
      username,
      role,
      module: 'Authentication',
    });
  }

  static async logAdminLogout(req: Request, username: string) {
    await logActivity(req, 'admin_logout', {
      username,
      module: 'Authentication',
    });
  }

  // Generic
  static async logGenericAction(req: Request, action: string, details: any, module: string) {
    await logActivity(req, action, {
      ...details,
      module,
    });
  }
}

export default ActivityLoggerService;
