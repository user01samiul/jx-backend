"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AffiliateBalanceService = void 0;
var postgres_1 = __importDefault(require("../../db/postgres"));
var apiError_1 = require("../../utils/apiError");
var AffiliateBalanceService = /** @class */ (function () {
    function AffiliateBalanceService() {
    }
    /**
     * Get affiliate balance summary
     */
    AffiliateBalanceService.getBalanceSummary = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, postgres_1.default.query('SELECT * FROM get_affiliate_balance_summary($1)', [userId])];
                    case 1:
                        result = _a.sent();
                        if (result.rows.length === 0) {
                            throw new apiError_1.ApiError('Affiliate balance not found', 404);
                        }
                        return [2 /*return*/, result.rows[0]];
                }
            });
        });
    };
    /**
     * Get balance transaction history
     */
    AffiliateBalanceService.getBalanceHistory = function (userId, filters) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, page, _b, limit, transactionType, offset, conditions, params, paramIndex, whereClause, countResult, total, result;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = filters.page, page = _a === void 0 ? 1 : _a, _b = filters.limit, limit = _b === void 0 ? 50 : _b, transactionType = filters.transactionType;
                        offset = (page - 1) * limit;
                        conditions = ['user_id = $1'];
                        params = [userId];
                        paramIndex = 2;
                        if (transactionType) {
                            conditions.push("transaction_type = $".concat(paramIndex++));
                            params.push(transactionType);
                        }
                        whereClause = conditions.join(' AND ');
                        return [4 /*yield*/, postgres_1.default.query("SELECT COUNT(*) as total FROM affiliate_balance_transactions WHERE ".concat(whereClause), params)];
                    case 1:
                        countResult = _c.sent();
                        total = parseInt(countResult.rows[0].total);
                        return [4 /*yield*/, postgres_1.default.query("SELECT\n        abt.*,\n        ac.commission_type,\n        ac.base_amount as commission_base_amount,\n        ar.total_amount as redemption_total_amount\n       FROM affiliate_balance_transactions abt\n       LEFT JOIN affiliate_commissions ac ON abt.commission_id = ac.id\n       LEFT JOIN affiliate_redemptions ar ON abt.redemption_id = ar.id\n       WHERE ".concat(whereClause, "\n       ORDER BY abt.created_at DESC\n       LIMIT $").concat(paramIndex, " OFFSET $").concat(paramIndex + 1), __spreadArray(__spreadArray([], params, true), [limit, offset], false))];
                    case 2:
                        result = _c.sent();
                        return [2 /*return*/, {
                                transactions: result.rows,
                                total: total,
                                page: page,
                                totalPages: Math.ceil(total / limit)
                            }];
                }
            });
        });
    };
    /**
     * Request affiliate balance redemption (creates PENDING request for admin approval)
     */
    AffiliateBalanceService.processRedemption = function (userId, amount, notes) {
        return __awaiter(this, void 0, void 0, function () {
            var client, balanceResult, currentBalance, settingsResult, redemptionSettings, minRedemption, instantPercentage, lockDays, instantAmount, lockedAmount, unlockDate, redemptionResult, redemptionId, error_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, postgres_1.default.connect()];
                    case 1:
                        client = _b.sent();
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 10, 12, 13]);
                        return [4 /*yield*/, client.query('BEGIN')];
                    case 3:
                        _b.sent();
                        return [4 /*yield*/, client.query('SELECT affiliate_balance FROM user_balances WHERE user_id = $1 FOR UPDATE', [userId])];
                    case 4:
                        balanceResult = _b.sent();
                        if (balanceResult.rows.length === 0) {
                            throw new apiError_1.ApiError('User balance not found', 404);
                        }
                        currentBalance = parseFloat(balanceResult.rows[0].affiliate_balance);
                        return [4 /*yield*/, client.query("SELECT setting_value FROM affiliate_settings WHERE setting_key = 'redemption_settings'")];
                    case 5:
                        settingsResult = _b.sent();
                        redemptionSettings = ((_a = settingsResult.rows[0]) === null || _a === void 0 ? void 0 : _a.setting_value) || {
                            minimum_redemption: 10.00,
                            instant_percentage: 50,
                            lock_days: 7
                        };
                        minRedemption = parseFloat(redemptionSettings.minimum_redemption);
                        instantPercentage = parseInt(redemptionSettings.instant_percentage);
                        lockDays = parseInt(redemptionSettings.lock_days);
                        // Validate redemption amount
                        if (amount < minRedemption) {
                            throw new apiError_1.ApiError("Minimum redemption amount is ".concat(minRedemption), 400);
                        }
                        if (amount > currentBalance) {
                            throw new apiError_1.ApiError('Insufficient affiliate balance', 400);
                        }
                        instantAmount = (amount * instantPercentage) / 100;
                        lockedAmount = amount - instantAmount;
                        unlockDate = new Date();
                        unlockDate.setDate(unlockDate.getDate() + lockDays);
                        // Lock the amount in affiliate_balance_locked (but don't transfer yet)
                        return [4 /*yield*/, client.query("UPDATE user_balances\n         SET affiliate_balance = affiliate_balance - $1,\n             affiliate_balance_locked = affiliate_balance_locked + $1\n         WHERE user_id = $2", [amount, userId])];
                    case 6:
                        // Lock the amount in affiliate_balance_locked (but don't transfer yet)
                        _b.sent();
                        return [4 /*yield*/, client.query("INSERT INTO affiliate_redemptions (\n          user_id, total_amount, instant_amount, locked_amount,\n          instant_status, locked_status, unlock_date, notes\n        ) VALUES ($1, $2, $3, $4, 'pending', 'locked', $5, $6)\n        RETURNING id", [userId, amount, instantAmount, lockedAmount, unlockDate, notes])];
                    case 7:
                        redemptionResult = _b.sent();
                        redemptionId = redemptionResult.rows[0].id;
                        // Create affiliate balance transaction for pending redemption
                        return [4 /*yield*/, client.query("INSERT INTO affiliate_balance_transactions (\n          user_id, transaction_type, amount, balance_before, balance_after,\n          redemption_id, description\n        ) VALUES ($1, 'redemption_pending', $2, $3, $4, $5, $6)", [
                                userId,
                                amount,
                                currentBalance,
                                currentBalance - amount,
                                redemptionId,
                                "Redemption request: $".concat(amount, " (pending admin approval)")
                            ])];
                    case 8:
                        // Create affiliate balance transaction for pending redemption
                        _b.sent();
                        return [4 /*yield*/, client.query('COMMIT')];
                    case 9:
                        _b.sent();
                        return [2 /*return*/, {
                                redemption_id: redemptionId,
                                total_amount: amount,
                                instant_amount: instantAmount,
                                locked_amount: lockedAmount,
                                unlock_date: unlockDate,
                                instant_transaction_id: null
                            }];
                    case 10:
                        error_1 = _b.sent();
                        return [4 /*yield*/, client.query('ROLLBACK')];
                    case 11:
                        _b.sent();
                        throw error_1;
                    case 12:
                        client.release();
                        return [7 /*endfinally*/];
                    case 13: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Approve redemption (ADMIN) - transfers money to main wallet
     */
    AffiliateBalanceService.approveRedemption = function (redemptionId, adminId, adminNotes) {
        return __awaiter(this, void 0, void 0, function () {
            var client, redemptionResult, redemption, userId, totalAmount, instantAmount, lockedAmount, mainTxResult, instantTransactionId, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, postgres_1.default.connect()];
                    case 1:
                        client = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 10, 12, 13]);
                        return [4 /*yield*/, client.query('BEGIN')];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, client.query('SELECT * FROM affiliate_redemptions WHERE id = $1 FOR UPDATE', [redemptionId])];
                    case 4:
                        redemptionResult = _a.sent();
                        if (redemptionResult.rows.length === 0) {
                            throw new apiError_1.ApiError('Redemption not found', 404);
                        }
                        redemption = redemptionResult.rows[0];
                        // Check if already processed
                        if (redemption.instant_status !== 'pending') {
                            throw new apiError_1.ApiError("Redemption already ".concat(redemption.instant_status), 400);
                        }
                        userId = redemption.user_id;
                        totalAmount = parseFloat(redemption.total_amount);
                        instantAmount = parseFloat(redemption.instant_amount);
                        lockedAmount = parseFloat(redemption.locked_amount);
                        // Transfer FULL AMOUNT to main wallet (no longer splitting into instant/locked)
                        return [4 /*yield*/, client.query("UPDATE user_balances\n         SET affiliate_balance_locked = affiliate_balance_locked - $1,\n             balance = balance + $1,\n             affiliate_total_redeemed = affiliate_total_redeemed + $1\n         WHERE user_id = $2", [totalAmount, userId])];
                    case 5:
                        // Transfer FULL AMOUNT to main wallet (no longer splitting into instant/locked)
                        _a.sent();
                        return [4 /*yield*/, client.query("INSERT INTO transactions (\n          user_id, type, amount, currency, status, description,\n          metadata\n        ) VALUES ($1, 'bonus', $2, 'USD', 'completed',\n                 'Affiliate commission redeemed to main wallet',\n                 $3)\n        RETURNING id", [
                                userId,
                                totalAmount,
                                JSON.stringify({
                                    redemption_id: redemptionId,
                                    redemption_type: 'full_transfer',
                                    total_amount: totalAmount
                                })
                            ])];
                    case 6:
                        mainTxResult = _a.sent();
                        instantTransactionId = mainTxResult.rows[0].id;
                        // Update redemption status - mark as fully completed
                        return [4 /*yield*/, client.query("UPDATE affiliate_redemptions\n         SET instant_status = 'completed',\n             locked_status = 'completed',\n             instant_transaction_id = $1,\n             unlock_transaction_id = $1,\n             processed_by = $2,\n             processed_at = CURRENT_TIMESTAMP,\n             unlocked_at = CURRENT_TIMESTAMP,\n             admin_notes = $3\n         WHERE id = $4", [instantTransactionId, adminId, adminNotes, redemptionId])];
                    case 7:
                        // Update redemption status - mark as fully completed
                        _a.sent();
                        // Create affiliate balance transaction for approval
                        return [4 /*yield*/, client.query("INSERT INTO affiliate_balance_transactions (\n          user_id, transaction_type, amount, balance_before, balance_after,\n          redemption_id, description\n        ) VALUES ($1, 'redemption_approved', $2, 0, 0, $3, $4)", [
                                userId,
                                totalAmount,
                                redemptionId,
                                "Redemption approved: $".concat(totalAmount, " transferred to main wallet. You can now withdraw from your main balance.")
                            ])];
                    case 8:
                        // Create affiliate balance transaction for approval
                        _a.sent();
                        return [4 /*yield*/, client.query('COMMIT')];
                    case 9:
                        _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                redemption_id: redemptionId,
                                transaction_id: instantTransactionId,
                                total_amount: totalAmount,
                                transferred_to_wallet: totalAmount
                            }];
                    case 10:
                        error_2 = _a.sent();
                        return [4 /*yield*/, client.query('ROLLBACK')];
                    case 11:
                        _a.sent();
                        throw error_2;
                    case 12:
                        client.release();
                        return [7 /*endfinally*/];
                    case 13: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Reject redemption (ADMIN) - refunds locked amount back to affiliate balance
     */
    AffiliateBalanceService.rejectRedemption = function (redemptionId, adminId, reason, adminNotes) {
        return __awaiter(this, void 0, void 0, function () {
            var client, redemptionResult, redemption, userId, totalAmount, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, postgres_1.default.connect()];
                    case 1:
                        client = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 9, 11, 12]);
                        return [4 /*yield*/, client.query('BEGIN')];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, client.query('SELECT * FROM affiliate_redemptions WHERE id = $1 FOR UPDATE', [redemptionId])];
                    case 4:
                        redemptionResult = _a.sent();
                        if (redemptionResult.rows.length === 0) {
                            throw new apiError_1.ApiError('Redemption not found', 404);
                        }
                        redemption = redemptionResult.rows[0];
                        // Check if already processed
                        if (redemption.instant_status !== 'pending') {
                            throw new apiError_1.ApiError("Redemption already ".concat(redemption.instant_status), 400);
                        }
                        userId = redemption.user_id;
                        totalAmount = parseFloat(redemption.total_amount);
                        // Refund locked amount back to affiliate balance
                        return [4 /*yield*/, client.query("UPDATE user_balances\n         SET affiliate_balance = affiliate_balance + $1,\n             affiliate_balance_locked = affiliate_balance_locked - $1\n         WHERE user_id = $2", [totalAmount, userId])];
                    case 5:
                        // Refund locked amount back to affiliate balance
                        _a.sent();
                        // Update redemption status
                        return [4 /*yield*/, client.query("UPDATE affiliate_redemptions\n         SET instant_status = 'rejected',\n             locked_status = 'cancelled',\n             processed_by = $1,\n             processed_at = CURRENT_TIMESTAMP,\n             rejection_reason = $2,\n             admin_notes = $3,\n             cancelled_by = $1,\n             cancelled_at = CURRENT_TIMESTAMP,\n             cancellation_reason = $2\n         WHERE id = $4", [adminId, reason, adminNotes, redemptionId])];
                    case 6:
                        // Update redemption status
                        _a.sent();
                        // Create affiliate balance transaction for rejection
                        return [4 /*yield*/, client.query("INSERT INTO affiliate_balance_transactions (\n          user_id, transaction_type, amount, balance_before, balance_after,\n          redemption_id, description\n        ) VALUES ($1, 'redemption_rejected', $2, 0, 0, $3, $4)", [
                                userId,
                                totalAmount,
                                redemptionId,
                                "Redemption rejected: $".concat(totalAmount, " refunded to affiliate balance. Reason: ").concat(reason)
                            ])];
                    case 7:
                        // Create affiliate balance transaction for rejection
                        _a.sent();
                        return [4 /*yield*/, client.query('COMMIT')];
                    case 8:
                        _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                redemption_id: redemptionId,
                                refunded_amount: totalAmount
                            }];
                    case 9:
                        error_3 = _a.sent();
                        return [4 /*yield*/, client.query('ROLLBACK')];
                    case 10:
                        _a.sent();
                        throw error_3;
                    case 11:
                        client.release();
                        return [7 /*endfinally*/];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get redemption history for user
     */
    AffiliateBalanceService.getRedemptionHistory = function (userId, filters) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, page, _b, limit, offset, countResult, total, result;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = filters.page, page = _a === void 0 ? 1 : _a, _b = filters.limit, limit = _b === void 0 ? 20 : _b;
                        offset = (page - 1) * limit;
                        return [4 /*yield*/, postgres_1.default.query('SELECT COUNT(*) as total FROM affiliate_redemptions WHERE user_id = $1', [userId])];
                    case 1:
                        countResult = _c.sent();
                        total = parseInt(countResult.rows[0].total);
                        return [4 /*yield*/, postgres_1.default.query("SELECT * FROM affiliate_redemptions\n       WHERE user_id = $1\n       ORDER BY created_at DESC\n       LIMIT $2 OFFSET $3", [userId, limit, offset])];
                    case 2:
                        result = _c.sent();
                        return [2 /*return*/, {
                                redemptions: result.rows,
                                total: total,
                                page: page,
                                totalPages: Math.ceil(total / limit)
                            }];
                }
            });
        });
    };
    /**
     * Get pending unlocks for user
     */
    AffiliateBalanceService.getPendingUnlocks = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, postgres_1.default.query("SELECT\n        id as redemption_id,\n        locked_amount,\n        unlock_date,\n        EXTRACT(DAY FROM (unlock_date - CURRENT_TIMESTAMP))::INTEGER as days_until_unlock,\n        EXTRACT(HOUR FROM (unlock_date - CURRENT_TIMESTAMP))::INTEGER as hours_until_unlock\n       FROM affiliate_redemptions\n       WHERE user_id = $1\n         AND locked_status = 'locked'\n         AND unlock_date > CURRENT_TIMESTAMP\n       ORDER BY unlock_date ASC", [userId])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows];
                }
            });
        });
    };
    /**
     * Unlock redemptions that have reached unlock date (CRON JOB)
     */
    AffiliateBalanceService.unlockPendingRedemptions = function () {
        return __awaiter(this, void 0, void 0, function () {
            var client, unlockedCount, result, _i, _a, redemption, mainTxResult, error_4;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, postgres_1.default.connect()];
                    case 1:
                        client = _b.sent();
                        unlockedCount = 0;
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, , 16, 17]);
                        return [4 /*yield*/, client.query("SELECT * FROM affiliate_redemptions\n         WHERE locked_status = 'locked'\n           AND unlock_date <= CURRENT_TIMESTAMP\n         ORDER BY unlock_date ASC")];
                    case 3:
                        result = _b.sent();
                        _i = 0, _a = result.rows;
                        _b.label = 4;
                    case 4:
                        if (!(_i < _a.length)) return [3 /*break*/, 15];
                        redemption = _a[_i];
                        _b.label = 5;
                    case 5:
                        _b.trys.push([5, 12, , 14]);
                        return [4 /*yield*/, client.query('BEGIN')];
                    case 6:
                        _b.sent();
                        // Transfer from locked to main balance
                        return [4 /*yield*/, client.query("UPDATE user_balances\n             SET affiliate_balance_locked = affiliate_balance_locked - $1,\n                 balance = balance + $1\n             WHERE user_id = $2", [redemption.locked_amount, redemption.user_id])];
                    case 7:
                        // Transfer from locked to main balance
                        _b.sent();
                        return [4 /*yield*/, client.query("INSERT INTO transactions (\n              user_id, type, amount, currency, status, description,\n              metadata, balance_before, balance_after\n            ) VALUES ($1, 'bonus', $2, 'USD', 'completed',\n                     'Affiliate commission redemption (unlocked)',\n                     $3, $4, $5)\n            RETURNING id", [
                                redemption.user_id,
                                redemption.locked_amount,
                                JSON.stringify({ redemption_id: redemption.id, redemption_type: 'unlocked' }),
                                0,
                                0
                            ])];
                    case 8:
                        mainTxResult = _b.sent();
                        // Update redemption status
                        return [4 /*yield*/, client.query("UPDATE affiliate_redemptions\n             SET locked_status = 'unlocked',\n                 unlocked_at = CURRENT_TIMESTAMP,\n                 unlock_transaction_id = $1\n             WHERE id = $2", [mainTxResult.rows[0].id, redemption.id])];
                    case 9:
                        // Update redemption status
                        _b.sent();
                        // Create affiliate balance transaction
                        return [4 /*yield*/, client.query("INSERT INTO affiliate_balance_transactions (\n              user_id, transaction_type, amount, balance_before, balance_after,\n              redemption_id, description\n            ) VALUES ($1, 'redemption_unlocked', $2, $3, $4, $5, $6)", [
                                redemption.user_id,
                                redemption.locked_amount,
                                0, // Locked balance doesn't change
                                0,
                                redemption.id,
                                "Unlocked ".concat(redemption.locked_amount, " from redemption #").concat(redemption.id)
                            ])];
                    case 10:
                        // Create affiliate balance transaction
                        _b.sent();
                        return [4 /*yield*/, client.query('COMMIT')];
                    case 11:
                        _b.sent();
                        unlockedCount++;
                        return [3 /*break*/, 14];
                    case 12:
                        error_4 = _b.sent();
                        return [4 /*yield*/, client.query('ROLLBACK')];
                    case 13:
                        _b.sent();
                        console.error("Failed to unlock redemption ".concat(redemption.id, ":"), error_4);
                        return [3 /*break*/, 14];
                    case 14:
                        _i++;
                        return [3 /*break*/, 4];
                    case 15: return [2 /*return*/, unlockedCount];
                    case 16:
                        client.release();
                        return [7 /*endfinally*/];
                    case 17: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get all redemptions (ADMIN)
     */
    AffiliateBalanceService.getAllRedemptions = function (filters) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, page, _b, limit, status, userId, offset, conditions, params, paramIndex, whereClause, countResult, total, result;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = filters.page, page = _a === void 0 ? 1 : _a, _b = filters.limit, limit = _b === void 0 ? 50 : _b, status = filters.status, userId = filters.userId;
                        offset = (page - 1) * limit;
                        conditions = [];
                        params = [];
                        paramIndex = 1;
                        if (status) {
                            conditions.push("locked_status = $".concat(paramIndex++));
                            params.push(status);
                        }
                        if (userId) {
                            conditions.push("ar.user_id = $".concat(paramIndex++));
                            params.push(userId);
                        }
                        whereClause = conditions.length > 0 ? "WHERE ".concat(conditions.join(' AND ')) : '';
                        return [4 /*yield*/, postgres_1.default.query("SELECT COUNT(*) as total FROM affiliate_redemptions ar ".concat(whereClause), params)];
                    case 1:
                        countResult = _c.sent();
                        total = parseInt(countResult.rows[0].total);
                        return [4 /*yield*/, postgres_1.default.query("SELECT\n        ar.*,\n        u.username,\n        u.email,\n        ap.referral_code,\n        ap.display_name as affiliate_name\n       FROM affiliate_redemptions ar\n       JOIN users u ON ar.user_id = u.id\n       LEFT JOIN affiliate_profiles ap ON ap.user_id = ar.user_id\n       ".concat(whereClause, "\n       ORDER BY ar.created_at DESC\n       LIMIT $").concat(paramIndex, " OFFSET $").concat(paramIndex + 1), __spreadArray(__spreadArray([], params, true), [limit, offset], false))];
                    case 2:
                        result = _c.sent();
                        return [2 /*return*/, {
                                redemptions: result.rows,
                                total: total,
                                page: page,
                                totalPages: Math.ceil(total / limit)
                            }];
                }
            });
        });
    };
    /**
     * Adjust affiliate balance (ADMIN)
     */
    AffiliateBalanceService.adjustBalance = function (userId, amount, description, adminId) {
        return __awaiter(this, void 0, void 0, function () {
            var client, balanceResult, balanceBefore, balanceAfter, result, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, postgres_1.default.connect()];
                    case 1:
                        client = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 8, 10, 11]);
                        return [4 /*yield*/, client.query('BEGIN')];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, client.query('SELECT affiliate_balance FROM user_balances WHERE user_id = $1 FOR UPDATE', [userId])];
                    case 4:
                        balanceResult = _a.sent();
                        if (balanceResult.rows.length === 0) {
                            throw new apiError_1.ApiError('User balance not found', 404);
                        }
                        balanceBefore = parseFloat(balanceResult.rows[0].affiliate_balance);
                        balanceAfter = balanceBefore + amount;
                        if (balanceAfter < 0) {
                            throw new apiError_1.ApiError('Adjustment would result in negative balance', 400);
                        }
                        // Update balance
                        return [4 /*yield*/, client.query("UPDATE user_balances\n         SET affiliate_balance = affiliate_balance + $1,\n             affiliate_total_earned = CASE WHEN $1 > 0 THEN affiliate_total_earned + $1 ELSE affiliate_total_earned END\n         WHERE user_id = $2", [amount, userId])];
                    case 5:
                        // Update balance
                        _a.sent();
                        return [4 /*yield*/, client.query("INSERT INTO affiliate_balance_transactions (\n          user_id, transaction_type, amount, balance_before, balance_after,\n          description, created_by\n        ) VALUES ($1, 'adjustment', $2, $3, $4, $5, $6)\n        RETURNING *", [userId, amount, balanceBefore, balanceAfter, description, adminId])];
                    case 6:
                        result = _a.sent();
                        return [4 /*yield*/, client.query('COMMIT')];
                    case 7:
                        _a.sent();
                        return [2 /*return*/, result.rows[0]];
                    case 8:
                        error_5 = _a.sent();
                        return [4 /*yield*/, client.query('ROLLBACK')];
                    case 9:
                        _a.sent();
                        throw error_5;
                    case 10:
                        client.release();
                        return [7 /*endfinally*/];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    return AffiliateBalanceService;
}());
exports.AffiliateBalanceService = AffiliateBalanceService;
