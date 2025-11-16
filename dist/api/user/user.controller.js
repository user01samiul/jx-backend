"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserGameBets = exports.transferUserCategoryBalance = exports.getUserCategoryBalances = exports.skip2FA = exports.disable2FA = exports.enable2FA = exports.get2FAStatus = exports.changeUserPassword = exports.updateUserProfile = exports.getUserBalance = exports.getUserActivitySummary = exports.getUserBettingHistory = exports.getUserTransactionHistory = exports.getUserRecentActivity = exports.getUserFavoriteGames = exports.getUserProfile = void 0;
const user_service_1 = require("../../services/user/user.service");
const getUserProfile = async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const user = await (0, user_service_1.getUserWithBalanceService)(userId);
        res.status(200).json({ success: true, data: user });
    }
    catch (err) {
        next(err);
    }
};
exports.getUserProfile = getUserProfile;
const getUserFavoriteGames = async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const favoriteGames = await (0, user_service_1.getUserFavoriteGamesService)(userId);
        res.status(200).json({ success: true, data: favoriteGames });
    }
    catch (err) {
        next(err);
    }
};
exports.getUserFavoriteGames = getUserFavoriteGames;
/**
 * Returns recent user activity. Each activity record now includes username and email fields.
 */
const getUserRecentActivity = async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const limit = parseInt(req.query.limit) || 20;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const result = await (0, user_service_1.getUserRecentActivityService)(userId, limit);
        res.status(200).json({
            success: true,
            data: result.activities,
            total_count: result.total_count
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getUserRecentActivity = getUserRecentActivity;
const getUserTransactionHistory = async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const limit = parseInt(req.query.limit) || 50;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const transactions = await (0, user_service_1.getUserTransactionHistoryService)(userId, limit);
        res.status(200).json({ success: true, data: transactions });
    }
    catch (err) {
        next(err);
    }
};
exports.getUserTransactionHistory = getUserTransactionHistory;
const getUserBettingHistory = async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const limit = parseInt(req.query.limit) || 50;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const bets = await (0, user_service_1.getUserBettingHistoryService)(userId, limit);
        res.status(200).json({ success: true, data: bets });
    }
    catch (err) {
        next(err);
    }
};
exports.getUserBettingHistory = getUserBettingHistory;
// Get comprehensive user activity summary
const getUserActivitySummary = async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const summary = await (0, user_service_1.getUserActivitySummaryService)(userId);
        res.status(200).json({ success: true, data: summary });
    }
    catch (err) {
        next(err);
    }
};
exports.getUserActivitySummary = getUserActivitySummary;
// Keep the old function for backward compatibility
const getUserBalance = async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const user = await (0, user_service_1.getUserWithBalanceService)(userId);
        res.status(200).json({ success: true, data: user });
    }
    catch (err) {
        next(err);
    }
};
exports.getUserBalance = getUserBalance;
// =====================================================
// PROFILE MANAGEMENT CONTROLLERS
// =====================================================
const updateUserProfile = async (req, res, next) => {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const profileData = (_b = req.validated) === null || _b === void 0 ? void 0 : _b.body;
        const updatedProfile = await (0, user_service_1.updateUserProfileService)(userId, profileData);
        res.status(200).json({ success: true, data: updatedProfile });
    }
    catch (err) {
        next(err);
    }
};
exports.updateUserProfile = updateUserProfile;
const changeUserPassword = async (req, res, next) => {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const passwordData = (_b = req.validated) === null || _b === void 0 ? void 0 : _b.body;
        await (0, user_service_1.changePasswordService)(userId, passwordData);
        res.status(200).json({ success: true, message: "Password changed successfully" });
    }
    catch (err) {
        next(err);
    }
};
exports.changeUserPassword = changeUserPassword;
// =====================================================
// 2FA MANAGEMENT CONTROLLERS
// =====================================================
const get2FAStatus = async (req, res, next) => {
    var _a;
    try {
        let userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        // Allow unauthenticated access via username or email query param
        if (!userId) {
            const { username, email } = req.query;
            let user;
            if (username) {
                user = await (0, user_service_1.getUserByUsernameService)(String(username));
            }
            else if (email) {
                user = await (0, user_service_1.getUserByEmailService)(String(email));
            }
            else {
                res.status(400).json({ success: false, message: "Missing username or email" });
                return;
            }
            if (!user) {
                res.status(404).json({ success: false, message: "User not found" });
                return;
            }
            userId = user.id;
        }
        const status = await (0, user_service_1.get2FAStatusService)(userId);
        res.status(200).json({ success: true, data: status });
    }
    catch (err) {
        next(err);
    }
};
exports.get2FAStatus = get2FAStatus;
const enable2FA = async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const result = await (0, user_service_1.enable2FAService)(userId);
        res.status(200).json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
};
exports.enable2FA = enable2FA;
const disable2FA = async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const result = await (0, user_service_1.disable2FAService)(userId);
        res.status(200).json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
};
exports.disable2FA = disable2FA;
const skip2FA = async (req, res, next) => {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const authData = (_b = req.validated) === null || _b === void 0 ? void 0 : _b.body;
        const result = await (0, user_service_1.skip2FAService)(userId, authData);
        res.status(200).json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
};
exports.skip2FA = skip2FA;
const getUserCategoryBalances = async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const balances = await (0, user_service_1.getUserCategoryBalancesService)(userId);
        res.json({ success: true, data: balances });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getUserCategoryBalances = getUserCategoryBalances;
const transferUserCategoryBalance = async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const { category, amount, direction } = req.body;
        if (!category || !amount || !direction) {
            return res.status(400).json({ success: false, message: "category, amount, and direction are required" });
        }
        const result = await (0, user_service_1.transferUserCategoryBalanceService)(userId, category, amount, direction);
        res.json({ success: true, data: result });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
exports.transferUserCategoryBalance = transferUserCategoryBalance;
const getUserGameBets = async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const data = await (0, user_service_1.getUserGameBetsService)(userId);
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getUserGameBets = getUserGameBets;
