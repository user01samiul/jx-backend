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
exports.AffiliateApplicationService = void 0;
var postgres_1 = __importDefault(require("../../db/postgres"));
var apiError_1 = require("../../utils/apiError");
var AffiliateApplicationService = /** @class */ (function () {
    function AffiliateApplicationService() {
    }
    /**
     * Submit a new affiliate application
     */
    AffiliateApplicationService.submitApplication = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var client, existingCheck, affiliateCheck, uplineUserId, uplineResult, result, error_1;
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
                        return [4 /*yield*/, client.query("SELECT id FROM affiliate_applications\n         WHERE user_id = $1 AND application_status = 'pending'", [data.userId])];
                    case 4:
                        existingCheck = _a.sent();
                        if (existingCheck.rows.length > 0) {
                            throw new apiError_1.ApiError('You already have a pending application', 400);
                        }
                        return [4 /*yield*/, client.query('SELECT id FROM affiliate_profiles WHERE user_id = $1', [data.userId])];
                    case 5:
                        affiliateCheck = _a.sent();
                        if (affiliateCheck.rows.length > 0) {
                            throw new apiError_1.ApiError('You are already an affiliate', 400);
                        }
                        uplineUserId = null;
                        if (!data.uplineReferralCode) return [3 /*break*/, 7];
                        return [4 /*yield*/, client.query('SELECT user_id FROM affiliate_profiles WHERE referral_code = $1 AND is_active = true', [data.uplineReferralCode])];
                    case 6:
                        uplineResult = _a.sent();
                        if (uplineResult.rows.length === 0) {
                            throw new apiError_1.ApiError('Invalid upline referral code', 400);
                        }
                        uplineUserId = uplineResult.rows[0].user_id;
                        _a.label = 7;
                    case 7: return [4 /*yield*/, client.query("INSERT INTO affiliate_applications (\n          user_id, display_name, website_url, social_media_links,\n          traffic_sources, expected_monthly_referrals, marketing_experience,\n          additional_info, preferred_referral_code, upline_referral_code,\n          application_status\n        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')\n        RETURNING *", [
                            data.userId,
                            data.displayName,
                            data.websiteUrl,
                            data.socialMediaLinks ? JSON.stringify(data.socialMediaLinks) : null,
                            data.trafficSources,
                            data.expectedMonthlyReferrals,
                            data.marketingExperience,
                            data.additionalInfo,
                            data.preferredReferralCode,
                            data.uplineReferralCode
                        ])];
                    case 8:
                        result = _a.sent();
                        return [4 /*yield*/, client.query('COMMIT')];
                    case 9:
                        _a.sent();
                        return [2 /*return*/, result.rows[0]];
                    case 10:
                        error_1 = _a.sent();
                        return [4 /*yield*/, client.query('ROLLBACK')];
                    case 11:
                        _a.sent();
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
     * Get all applications with filters and pagination (ADMIN)
     */
    AffiliateApplicationService.getAllApplications = function (filters) {
        return __awaiter(this, void 0, void 0, function () {
            var status, _a, page, _b, limit, search, _c, sortBy, _d, sortOrder, offset, conditions, params, paramIndex, whereClause, countResult, total, allowedSortColumns, sortColumn, result;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        status = filters.status, _a = filters.page, page = _a === void 0 ? 1 : _a, _b = filters.limit, limit = _b === void 0 ? 20 : _b, search = filters.search, _c = filters.sortBy, sortBy = _c === void 0 ? 'created_at' : _c, _d = filters.sortOrder, sortOrder = _d === void 0 ? 'DESC' : _d;
                        offset = (page - 1) * limit;
                        conditions = [];
                        params = [];
                        paramIndex = 1;
                        if (status) {
                            conditions.push("aa.application_status = $".concat(paramIndex++));
                            params.push(status);
                        }
                        if (search) {
                            conditions.push("(\n        aa.display_name ILIKE $".concat(paramIndex, " OR\n        u.username ILIKE $").concat(paramIndex, " OR\n        u.email ILIKE $").concat(paramIndex, "\n      )"));
                            params.push("%".concat(search, "%"));
                            paramIndex++;
                        }
                        whereClause = conditions.length > 0 ? "WHERE ".concat(conditions.join(' AND ')) : '';
                        return [4 /*yield*/, postgres_1.default.query("SELECT COUNT(*) as total\n       FROM affiliate_applications aa\n       JOIN users u ON aa.user_id = u.id\n       ".concat(whereClause), params)];
                    case 1:
                        countResult = _e.sent();
                        total = parseInt(countResult.rows[0].total);
                        allowedSortColumns = ['created_at', 'display_name', 'application_status', 'expected_monthly_referrals'];
                        sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
                        return [4 /*yield*/, postgres_1.default.query("SELECT\n        aa.*,\n        u.username,\n        u.email,\n        up.first_name,\n        up.last_name,\n        up.country,\n        reviewer.username as reviewed_by_username,\n        upline_aff.referral_code as upline_code,\n        upline_aff.display_name as upline_name\n       FROM affiliate_applications aa\n       JOIN users u ON aa.user_id = u.id\n       LEFT JOIN user_profiles up ON u.id = up.user_id\n       LEFT JOIN users reviewer ON aa.reviewed_by = reviewer.id\n       LEFT JOIN affiliate_profiles upline_aff ON upline_aff.referral_code = aa.upline_referral_code\n       ".concat(whereClause, "\n       ORDER BY aa.").concat(sortColumn, " ").concat(sortOrder, "\n       LIMIT $").concat(paramIndex, " OFFSET $").concat(paramIndex + 1), __spreadArray(__spreadArray([], params, true), [limit, offset], false))];
                    case 2:
                        result = _e.sent();
                        return [2 /*return*/, {
                                applications: result.rows,
                                total: total,
                                page: page,
                                totalPages: Math.ceil(total / limit)
                            }];
                }
            });
        });
    };
    /**
     * Get application by ID (ADMIN)
     */
    AffiliateApplicationService.getApplicationById = function (applicationId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, postgres_1.default.query("SELECT\n        aa.*,\n        u.username,\n        u.email,\n        up.first_name,\n        up.last_name,\n        up.phone_number,\n        up.country,\n        up.city,\n        reviewer.username as reviewed_by_username,\n        upline_aff.referral_code as upline_code,\n        upline_aff.display_name as upline_name,\n        upline_aff.user_id as upline_user_id\n       FROM affiliate_applications aa\n       JOIN users u ON aa.user_id = u.id\n       LEFT JOIN user_profiles up ON u.id = up.user_id\n       LEFT JOIN users reviewer ON aa.reviewed_by = reviewer.id\n       LEFT JOIN affiliate_profiles upline_aff ON upline_aff.referral_code = aa.upline_referral_code\n       WHERE aa.id = $1", [applicationId])];
                    case 1:
                        result = _a.sent();
                        if (result.rows.length === 0) {
                            throw new apiError_1.ApiError('Application not found', 404);
                        }
                        return [2 /*return*/, result.rows[0]];
                }
            });
        });
    };
    /**
     * Get user's application status
     */
    AffiliateApplicationService.getUserApplicationStatus = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, postgres_1.default.query("SELECT * FROM affiliate_applications\n       WHERE user_id = $1\n       ORDER BY created_at DESC\n       LIMIT 1", [userId])];
                    case 1:
                        result = _a.sent();
                        if (result.rows.length === 0) {
                            return [2 /*return*/, null];
                        }
                        return [2 /*return*/, result.rows[0]];
                }
            });
        });
    };
    /**
     * Approve affiliate application (ADMIN)
     */
    AffiliateApplicationService.approveApplication = function (applicationId, approvedBy, approvalData) {
        return __awaiter(this, void 0, void 0, function () {
            var client, appResult, application, existingProfile, referralCode, _a, codeCheck, uplineId, level, uplineResult, profileResult, roleResult, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, postgres_1.default.connect()];
                    case 1:
                        client = _b.sent();
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 19, 21, 22]);
                        return [4 /*yield*/, client.query('BEGIN')];
                    case 3:
                        _b.sent();
                        return [4 /*yield*/, client.query("SELECT * FROM affiliate_applications WHERE id = $1 AND application_status = 'pending'", [applicationId])];
                    case 4:
                        appResult = _b.sent();
                        if (appResult.rows.length === 0) {
                            throw new apiError_1.ApiError('Application not found or already processed', 404);
                        }
                        application = appResult.rows[0];
                        return [4 /*yield*/, client.query('SELECT id FROM affiliate_profiles WHERE user_id = $1', [application.user_id])];
                    case 5:
                        existingProfile = _b.sent();
                        if (existingProfile.rows.length > 0) {
                            throw new apiError_1.ApiError('User already has an affiliate profile', 400);
                        }
                        _a = application.preferred_referral_code;
                        if (_a) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.generateReferralCode(client)];
                    case 6:
                        _a = (_b.sent());
                        _b.label = 7;
                    case 7:
                        referralCode = _a;
                        return [4 /*yield*/, client.query('SELECT id FROM affiliate_profiles WHERE referral_code = $1', [referralCode])];
                    case 8:
                        codeCheck = _b.sent();
                        if (codeCheck.rows.length > 0) {
                            throw new apiError_1.ApiError('Referral code already exists. Please try a different one.', 400);
                        }
                        uplineId = null;
                        level = 1;
                        if (!application.upline_referral_code) return [3 /*break*/, 10];
                        return [4 /*yield*/, client.query('SELECT user_id, level FROM affiliate_profiles WHERE referral_code = $1 AND is_active = true', [application.upline_referral_code])];
                    case 9:
                        uplineResult = _b.sent();
                        if (uplineResult.rows.length > 0) {
                            uplineId = uplineResult.rows[0].user_id;
                            level = uplineResult.rows[0].level + 1;
                        }
                        _b.label = 10;
                    case 10: return [4 /*yield*/, client.query("INSERT INTO affiliate_profiles (\n          user_id, referral_code, display_name, website_url, social_media_links,\n          commission_rate, is_active, level, upline_id,\n          application_id, approved_at, approved_by\n        ) VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, $9, NOW(), $10)\n        RETURNING *", [
                            application.user_id,
                            referralCode,
                            application.display_name,
                            application.website_url,
                            application.social_media_links,
                            approvalData.commissionRate || 5.0,
                            level,
                            uplineId,
                            applicationId,
                            approvedBy
                        ])];
                    case 11:
                        profileResult = _b.sent();
                        if (!uplineId) return [3 /*break*/, 13];
                        return [4 /*yield*/, client.query('UPDATE affiliate_profiles SET downline_count = downline_count + 1 WHERE user_id = $1', [uplineId])];
                    case 12:
                        _b.sent();
                        _b.label = 13;
                    case 13: return [4 /*yield*/, client.query('SELECT id FROM roles WHERE name = $1', ['Affiliate'])];
                    case 14:
                        roleResult = _b.sent();
                        if (!(roleResult.rows.length > 0)) return [3 /*break*/, 16];
                        return [4 /*yield*/, client.query("INSERT INTO user_roles (user_id, role_id)\n           VALUES ($1, $2)\n           ON CONFLICT (user_id, role_id) DO NOTHING", [application.user_id, roleResult.rows[0].id])];
                    case 15:
                        _b.sent();
                        _b.label = 16;
                    case 16: 
                    // Update application status
                    return [4 /*yield*/, client.query("UPDATE affiliate_applications\n         SET application_status = 'approved',\n             reviewed_by = $1,\n             reviewed_at = NOW(),\n             admin_notes = $2\n         WHERE id = $3", [approvedBy, approvalData.adminNotes, applicationId])];
                    case 17:
                        // Update application status
                        _b.sent();
                        return [4 /*yield*/, client.query('COMMIT')];
                    case 18:
                        _b.sent();
                        return [2 /*return*/, {
                                application: appResult.rows[0],
                                profile: profileResult.rows[0]
                            }];
                    case 19:
                        error_2 = _b.sent();
                        return [4 /*yield*/, client.query('ROLLBACK')];
                    case 20:
                        _b.sent();
                        throw error_2;
                    case 21:
                        client.release();
                        return [7 /*endfinally*/];
                    case 22: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Reject affiliate application (ADMIN)
     */
    AffiliateApplicationService.rejectApplication = function (applicationId, rejectedBy, rejectData) {
        return __awaiter(this, void 0, void 0, function () {
            var client, appResult, result, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, postgres_1.default.connect()];
                    case 1:
                        client = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 7, 9, 10]);
                        return [4 /*yield*/, client.query('BEGIN')];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, client.query("SELECT * FROM affiliate_applications WHERE id = $1 AND application_status = 'pending'", [applicationId])];
                    case 4:
                        appResult = _a.sent();
                        if (appResult.rows.length === 0) {
                            throw new apiError_1.ApiError('Application not found or already processed', 404);
                        }
                        return [4 /*yield*/, client.query("UPDATE affiliate_applications\n         SET application_status = 'rejected',\n             reviewed_by = $1,\n             reviewed_at = NOW(),\n             rejection_reason = $2,\n             admin_notes = $3\n         WHERE id = $4\n         RETURNING *", [rejectedBy, rejectData.rejectionReason, rejectData.adminNotes, applicationId])];
                    case 5:
                        result = _a.sent();
                        return [4 /*yield*/, client.query('COMMIT')];
                    case 6:
                        _a.sent();
                        return [2 /*return*/, result.rows[0]];
                    case 7:
                        error_3 = _a.sent();
                        return [4 /*yield*/, client.query('ROLLBACK')];
                    case 8:
                        _a.sent();
                        throw error_3;
                    case 9:
                        client.release();
                        return [7 /*endfinally*/];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Generate unique referral code
     */
    AffiliateApplicationService.generateReferralCode = function (client) {
        return __awaiter(this, void 0, void 0, function () {
            var i, code, check;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        i = 0;
                        _a.label = 1;
                    case 1:
                        if (!(i < 10)) return [3 /*break*/, 4];
                        code = this.generateRandomCode();
                        return [4 /*yield*/, client.query('SELECT id FROM affiliate_profiles WHERE referral_code = $1', [code])];
                    case 2:
                        check = _a.sent();
                        if (check.rows.length === 0) {
                            return [2 /*return*/, code];
                        }
                        _a.label = 3;
                    case 3:
                        i++;
                        return [3 /*break*/, 1];
                    case 4: throw new apiError_1.ApiError('Failed to generate unique referral code', 500);
                }
            });
        });
    };
    /**
     * Generate random alphanumeric code
     */
    AffiliateApplicationService.generateRandomCode = function (length) {
        if (length === void 0) { length = 8; }
        var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing characters
        var code = '';
        for (var i = 0; i < length; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    };
    /**
     * Get application statistics (ADMIN)
     */
    AffiliateApplicationService.getApplicationStatistics = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, postgres_1.default.query("\n      SELECT\n        COUNT(*) FILTER (WHERE application_status = 'pending') as pending_count,\n        COUNT(*) FILTER (WHERE application_status = 'approved') as approved_count,\n        COUNT(*) FILTER (WHERE application_status = 'rejected') as rejected_count,\n        COUNT(*) FILTER (WHERE application_status = 'pending' AND created_at >= CURRENT_DATE - INTERVAL '7 days') as pending_last_7_days,\n        COUNT(*) FILTER (WHERE application_status = 'approved' AND reviewed_at >= CURRENT_DATE - INTERVAL '7 days') as approved_last_7_days,\n        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as total_last_30_days\n      FROM affiliate_applications\n    ")];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0]];
                }
            });
        });
    };
    return AffiliateApplicationService;
}());
exports.AffiliateApplicationService = AffiliateApplicationService;
