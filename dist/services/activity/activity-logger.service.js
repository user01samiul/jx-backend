"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityLoggerService = void 0;
const activity_logger_1 = require("../../middlewares/activity-logger");
/**
 * Activity Logger Service
 * Centralized logging for all admin actions
 */
class ActivityLoggerService {
    // User Management
    static async logUserCreated(req, userId, username, role) {
        await (0, activity_logger_1.logActivity)(req, 'user_created', {
            user_id: userId,
            username,
            role,
            module: 'Users',
        });
    }
    static async logUserUpdated(req, userId, field, oldValue, newValue) {
        await (0, activity_logger_1.logActivity)(req, 'user_updated', {
            user_id: userId,
            field,
            old_value: oldValue,
            new_value: newValue,
            module: 'Users',
        });
    }
    static async logUserDeleted(req, userId, username) {
        await (0, activity_logger_1.logActivity)(req, 'user_deleted', {
            user_id: userId,
            username,
            module: 'Users',
        });
    }
    static async logUserStatusChanged(req, userId, oldStatus, newStatus) {
        await (0, activity_logger_1.logActivity)(req, 'user_status_changed', {
            user_id: userId,
            old_status: oldStatus,
            new_status: newStatus,
            module: 'Users',
        });
    }
    static async logUserBalanceAdjusted(req, userId, amount, type, reason) {
        await (0, activity_logger_1.logActivity)(req, 'user_balance_adjusted', {
            user_id: userId,
            amount,
            type,
            reason,
            module: 'Users',
        });
    }
    // Game Management
    static async logGameCreated(req, gameId, gameName, provider) {
        await (0, activity_logger_1.logActivity)(req, 'game_created', {
            game_id: gameId,
            game_name: gameName,
            provider,
            module: 'Games',
        });
    }
    static async logGameUpdated(req, gameId, field, oldValue, newValue) {
        await (0, activity_logger_1.logActivity)(req, 'game_updated', {
            game_id: gameId,
            field,
            old_value: oldValue,
            new_value: newValue,
            module: 'Games',
        });
    }
    static async logGameStatusChanged(req, gameId, oldStatus, newStatus) {
        await (0, activity_logger_1.logActivity)(req, 'game_status_changed', {
            game_id: gameId,
            old_status: oldStatus,
            new_status: newStatus,
            module: 'Games',
        });
    }
    static async logGameDeleted(req, gameId, gameName) {
        await (0, activity_logger_1.logActivity)(req, 'game_deleted', {
            game_id: gameId,
            game_name: gameName,
            module: 'Games',
        });
    }
    // RTP & Settings
    static async logRTPSettingsUpdated(req, setting, oldValue, newValue) {
        await (0, activity_logger_1.logActivity)(req, 'rtp_settings_updated', {
            setting,
            old_value: oldValue,
            new_value: newValue,
            module: 'RTP Control',
        });
    }
    static async logRTPAutoAdjustmentTriggered(req, adjustments) {
        await (0, activity_logger_1.logActivity)(req, 'rtp_auto_adjustment_triggered', {
            adjustments,
            module: 'RTP Control',
        });
    }
    static async logSystemSettingsUpdated(req, setting, oldValue, newValue) {
        await (0, activity_logger_1.logActivity)(req, 'system_settings_updated', {
            setting,
            old_value: oldValue,
            new_value: newValue,
            module: 'Settings',
        });
    }
    // Promotions
    static async logPromotionCreated(req, promotionId, name, type) {
        await (0, activity_logger_1.logActivity)(req, 'promotion_created', {
            promotion_id: promotionId,
            name,
            type,
            module: 'Promotions',
        });
    }
    static async logPromotionUpdated(req, promotionId, field, oldValue, newValue) {
        await (0, activity_logger_1.logActivity)(req, 'promotion_updated', {
            promotion_id: promotionId,
            field,
            old_value: oldValue,
            new_value: newValue,
            module: 'Promotions',
        });
    }
    static async logPromotionStatusChanged(req, promotionId, oldStatus, newStatus) {
        await (0, activity_logger_1.logActivity)(req, 'promotion_status_changed', {
            promotion_id: promotionId,
            old_status: oldStatus,
            new_status: newStatus,
            module: 'Promotions',
        });
    }
    static async logPromotionDeleted(req, promotionId, name) {
        await (0, activity_logger_1.logActivity)(req, 'promotion_deleted', {
            promotion_id: promotionId,
            name,
            module: 'Promotions',
        });
    }
    // KYC
    static async logKYCApproved(req, userId, documentType) {
        await (0, activity_logger_1.logActivity)(req, 'kyc_approved', {
            user_id: userId,
            document_type: documentType,
            module: 'KYC',
        });
    }
    static async logKYCRejected(req, userId, documentType, reason) {
        await (0, activity_logger_1.logActivity)(req, 'kyc_rejected', {
            user_id: userId,
            document_type: documentType,
            reason,
            module: 'KYC',
        });
    }
    // Transactions
    static async logTransactionApproved(req, transactionId, amount, type) {
        await (0, activity_logger_1.logActivity)(req, 'transaction_approved', {
            transaction_id: transactionId,
            amount,
            type,
            module: 'Transactions',
        });
    }
    static async logTransactionRejected(req, transactionId, amount, type, reason) {
        await (0, activity_logger_1.logActivity)(req, 'transaction_rejected', {
            transaction_id: transactionId,
            amount,
            type,
            reason,
            module: 'Transactions',
        });
    }
    // Affiliates
    static async logAffiliateCreated(req, affiliateId, username) {
        await (0, activity_logger_1.logActivity)(req, 'affiliate_created', {
            affiliate_id: affiliateId,
            username,
            module: 'Affiliates',
        });
    }
    static async logAffiliatePayoutProcessed(req, payoutId, affiliateId, amount) {
        await (0, activity_logger_1.logActivity)(req, 'affiliate_payout_processed', {
            payout_id: payoutId,
            affiliate_id: affiliateId,
            amount,
            module: 'Affiliates',
        });
    }
    // Banners
    static async logBannerCreated(req, bannerId, title) {
        await (0, activity_logger_1.logActivity)(req, 'banner_created', {
            banner_id: bannerId,
            title,
            module: 'Banners',
        });
    }
    static async logBannerUpdated(req, bannerId, field, oldValue, newValue) {
        await (0, activity_logger_1.logActivity)(req, 'banner_updated', {
            banner_id: bannerId,
            field,
            old_value: oldValue,
            new_value: newValue,
            module: 'Banners',
        });
    }
    static async logBannerDeleted(req, bannerId, title) {
        await (0, activity_logger_1.logActivity)(req, 'banner_deleted', {
            banner_id: bannerId,
            title,
            module: 'Banners',
        });
    }
    // Login
    static async logAdminLogin(req, username, role) {
        await (0, activity_logger_1.logActivity)(req, 'admin_login', {
            username,
            role,
            module: 'Authentication',
        });
    }
    static async logAdminLogout(req, username) {
        await (0, activity_logger_1.logActivity)(req, 'admin_logout', {
            username,
            module: 'Authentication',
        });
    }
    // Generic
    static async logGenericAction(req, action, details, module) {
        await (0, activity_logger_1.logActivity)(req, action, Object.assign(Object.assign({}, details), { module }));
    }
}
exports.ActivityLoggerService = ActivityLoggerService;
exports.default = ActivityLoggerService;
