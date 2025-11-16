"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordReferralConversion = exports.trackReferral = exports.managerGetTeamAffiliates = exports.getManagerDashboard = exports.adminGetAffiliateDetails = exports.adminUpdateAffiliate = exports.adminGetAllAffiliates = exports.getAdminAffiliateDashboard = exports.calculateMLMCommissions = exports.calculateBetRevenueCommission = exports.getMLMStructure = exports.getEnhancedAffiliateDashboard = exports.createEnhancedAffiliateProfile = void 0;
const enhanced_affiliate_service_1 = require("../../services/affiliate/enhanced-affiliate.service");
const postgres_1 = __importDefault(require("../../db/postgres"));
// =====================================================
// ENHANCED AFFILIATE PROFILE CONTROLLERS
// =====================================================
const createEnhancedAffiliateProfile = async (req, res) => {
    var _a;
    try {
        const userId = req.user.id;
        const { profileData, uplineReferralCode } = (_a = req.validated) === null || _a === void 0 ? void 0 : _a.body;
        const profile = await enhanced_affiliate_service_1.EnhancedAffiliateService.createEnhancedAffiliateProfile(userId, profileData, uplineReferralCode);
        res.status(201).json({
            success: true,
            message: "Enhanced affiliate profile created successfully",
            data: profile
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.createEnhancedAffiliateProfile = createEnhancedAffiliateProfile;
const getEnhancedAffiliateDashboard = async (req, res) => {
    try {
        const userId = req.user.id;
        const dashboard = await enhanced_affiliate_service_1.EnhancedAffiliateService.getEnhancedAffiliateDashboard(userId);
        res.json({
            success: true,
            data: dashboard
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.getEnhancedAffiliateDashboard = getEnhancedAffiliateDashboard;
const getMLMStructure = async (req, res) => {
    try {
        const userId = req.user.id;
        const mlmStructure = await enhanced_affiliate_service_1.EnhancedAffiliateService.getMLMStructure(userId);
        res.json({
            success: true,
            data: mlmStructure
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.getMLMStructure = getMLMStructure;
// =====================================================
// COMMISSION CALCULATION CONTROLLERS
// =====================================================
const calculateBetRevenueCommission = async (req, res) => {
    var _a;
    try {
        const userId = req.user.id;
        const { referredUserId, periodStart, periodEnd } = (_a = req.validated) === null || _a === void 0 ? void 0 : _a.body;
        const commission = await enhanced_affiliate_service_1.EnhancedAffiliateService.calculateBetRevenueCommission(userId, referredUserId, new Date(periodStart), new Date(periodEnd));
        res.json({
            success: true,
            message: "Bet revenue commission calculated successfully",
            data: commission
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.calculateBetRevenueCommission = calculateBetRevenueCommission;
const calculateMLMCommissions = async (req, res) => {
    var _a;
    try {
        const userId = req.user.id;
        const { referredUserId, transactionId, amount, commissionType } = (_a = req.validated) === null || _a === void 0 ? void 0 : _a.body;
        const commissions = await enhanced_affiliate_service_1.EnhancedAffiliateService.calculateMLMCommissions(userId, referredUserId, transactionId, amount, commissionType);
        res.json({
            success: true,
            message: "MLM commissions calculated successfully",
            data: commissions
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.calculateMLMCommissions = calculateMLMCommissions;
// =====================================================
// ADMIN AFFILIATE MANAGEMENT CONTROLLERS
// =====================================================
const getAdminAffiliateDashboard = async (req, res) => {
    try {
        const dashboard = await enhanced_affiliate_service_1.EnhancedAffiliateService.getAdminAffiliateDashboard();
        res.json({
            success: true,
            data: dashboard
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.getAdminAffiliateDashboard = getAdminAffiliateDashboard;
const adminGetAllAffiliates = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, team_id, manager_id } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const client = await postgres_1.default.connect();
        try {
            let whereClause = "WHERE 1=1";
            const params = [];
            let paramCount = 0;
            if (status) {
                paramCount++;
                whereClause += ` AND ap.is_active = $${paramCount}`;
                params.push(status === 'active');
            }
            if (team_id) {
                paramCount++;
                whereClause += ` AND ap.team_id = $${paramCount}`;
                params.push(parseInt(team_id));
            }
            if (manager_id) {
                paramCount++;
                whereClause += ` AND ap.manager_id = $${paramCount}`;
                params.push(parseInt(manager_id));
            }
            // Get affiliates with pagination
            const affiliatesResult = await client.query(`SELECT 
          ap.*,
          u.username,
          u.email,
          u.status_id,
          at.name as team_name,
          um.username as manager_name
        FROM affiliate_profiles ap
        JOIN users u ON ap.user_id = u.id
        LEFT JOIN affiliate_teams at ON ap.team_id = at.id
        LEFT JOIN users um ON ap.manager_id = um.id
        ${whereClause}
        ORDER BY ap.total_commission_earned DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`, [...params, parseInt(limit), offset]);
            // Get total count
            const countResult = await client.query(`SELECT COUNT(*) as total
         FROM affiliate_profiles ap
         JOIN users u ON ap.user_id = u.id
         ${whereClause}`, params);
            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / parseInt(limit));
            res.json({
                success: true,
                data: {
                    affiliates: affiliatesResult.rows,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages
                    }
                }
            });
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.adminGetAllAffiliates = adminGetAllAffiliates;
const adminUpdateAffiliate = async (req, res) => {
    var _a;
    try {
        const { affiliateId } = req.params;
        const updateData = (_a = req.validated) === null || _a === void 0 ? void 0 : _a.body;
        const client = await postgres_1.default.connect();
        try {
            const result = await client.query(`UPDATE affiliate_profiles 
         SET 
           display_name = COALESCE($1, display_name),
           commission_rate = COALESCE($2, commission_rate),
           minimum_payout = COALESCE($3, minimum_payout),
           is_active = COALESCE($4, is_active),
           manager_id = COALESCE($5, manager_id),
           team_id = COALESCE($6, team_id),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $7
         RETURNING *`, [
                updateData.display_name,
                updateData.commission_rate,
                updateData.minimum_payout,
                updateData.is_active,
                updateData.manager_id,
                updateData.team_id,
                affiliateId
            ]);
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Affiliate not found"
                });
            }
            res.json({
                success: true,
                message: "Affiliate updated successfully",
                data: result.rows[0]
            });
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.adminUpdateAffiliate = adminUpdateAffiliate;
const adminGetAffiliateDetails = async (req, res) => {
    try {
        const { affiliateId } = req.params;
        const client = await postgres_1.default.connect();
        try {
            // Get affiliate profile with user details
            const profileResult = await client.query(`SELECT 
          ap.*,
          u.username,
          u.email,
          u.status_id,
          at.name as team_name,
          um.username as manager_name
        FROM affiliate_profiles ap
        JOIN users u ON ap.user_id = u.id
        LEFT JOIN affiliate_teams at ON ap.team_id = at.id
        LEFT JOIN users um ON ap.manager_id = um.id
        WHERE ap.id = $1`, [affiliateId]);
            if (profileResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Affiliate not found"
                });
            }
            const profile = profileResult.rows[0];
            // Get MLM structure
            const mlmStructure = await enhanced_affiliate_service_1.EnhancedAffiliateService.getMLMStructure(profile.user_id);
            // Get recent commissions
            const commissionsResult = await client.query(`SELECT 
          ac.*,
          u.username as referred_user
        FROM affiliate_commissions ac
        JOIN users u ON ac.referred_user_id = u.id
        WHERE ac.affiliate_id = $1
        ORDER BY ac.created_at DESC
        LIMIT 20`, [profile.user_id]);
            // Get recent referrals
            const referralsResult = await client.query(`SELECT 
          ar.*,
          u.username,
          u.email
        FROM affiliate_relationships ar
        JOIN users u ON ar.referred_user_id = u.id
        WHERE ar.affiliate_id = $1
        ORDER BY ar.created_at DESC
        LIMIT 20`, [profile.user_id]);
            res.json({
                success: true,
                data: {
                    profile,
                    mlm_structure: mlmStructure,
                    recent_commissions: commissionsResult.rows,
                    recent_referrals: referralsResult.rows
                }
            });
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.adminGetAffiliateDetails = adminGetAffiliateDetails;
// =====================================================
// MANAGER CONTROLLERS
// =====================================================
const getManagerDashboard = async (req, res) => {
    try {
        const managerId = req.user.id;
        const dashboard = await enhanced_affiliate_service_1.EnhancedAffiliateService.getManagerDashboard(managerId);
        res.json({
            success: true,
            data: dashboard
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.getManagerDashboard = getManagerDashboard;
const managerGetTeamAffiliates = async (req, res) => {
    try {
        const managerId = req.user.id;
        const { teamId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const client = await postgres_1.default.connect();
        try {
            // Verify manager has access to this team
            const teamCheck = await client.query('SELECT id FROM affiliate_teams WHERE id = $1 AND manager_id = $2', [teamId, managerId]);
            if (teamCheck.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied to this team"
                });
            }
            // Get team affiliates
            const affiliatesResult = await client.query(`SELECT 
          ap.*,
          u.username,
          u.email,
          u.status_id
        FROM affiliate_profiles ap
        JOIN users u ON ap.user_id = u.id
        WHERE ap.team_id = $1
        ORDER BY ap.total_commission_earned DESC
        LIMIT $2 OFFSET $3`, [teamId, parseInt(limit), offset]);
            // Get total count
            const countResult = await client.query('SELECT COUNT(*) as total FROM affiliate_profiles WHERE team_id = $1', [teamId]);
            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / parseInt(limit));
            res.json({
                success: true,
                data: {
                    affiliates: affiliatesResult.rows,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages
                    }
                }
            });
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.managerGetTeamAffiliates = managerGetTeamAffiliates;
// =====================================================
// REFERRAL TRACKING CONTROLLERS
// =====================================================
const trackReferral = async (req, res) => {
    var _a;
    try {
        const { referralCode, visitorIp, userAgent, landingPage, sessionId } = (_a = req.validated) === null || _a === void 0 ? void 0 : _a.body;
        // Find affiliate by referral code
        const client = await postgres_1.default.connect();
        try {
            const affiliateResult = await client.query('SELECT user_id FROM affiliate_profiles WHERE referral_code = $1 AND is_active = true', [referralCode]);
            if (affiliateResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Invalid referral code"
                });
            }
            const affiliateId = affiliateResult.rows[0].user_id;
            // Track the click
            await client.query(`INSERT INTO affiliate_tracking (
          affiliate_id, referral_code, visitor_ip, user_agent, 
          landing_page, session_id
        ) VALUES ($1, $2, $3, $4, $5, $6)`, [affiliateId, referralCode, visitorIp, userAgent, landingPage, sessionId]);
            res.json({
                success: true,
                message: "Referral tracked successfully"
            });
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.trackReferral = trackReferral;
const recordReferralConversion = async (req, res) => {
    var _a;
    try {
        const { referralCode, conversionType, convertedUserId, conversionAmount } = (_a = req.validated) === null || _a === void 0 ? void 0 : _a.body;
        const client = await postgres_1.default.connect();
        try {
            // Find affiliate by referral code
            const affiliateResult = await client.query('SELECT user_id FROM affiliate_profiles WHERE referral_code = $1 AND is_active = true', [referralCode]);
            if (affiliateResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Invalid referral code"
                });
            }
            const affiliateId = affiliateResult.rows[0].user_id;
            // Record conversion
            await client.query(`INSERT INTO affiliate_tracking (
          affiliate_id, referral_code, conversion_type, 
          converted_user_id, conversion_amount
        ) VALUES ($1, $2, $3, $4, $5)`, [affiliateId, referralCode, conversionType, convertedUserId, conversionAmount]);
            // Create affiliate relationship if it doesn't exist
            await client.query(`INSERT INTO affiliate_relationships (
          affiliate_id, referred_user_id, referral_code
        ) VALUES ($1, $2, $3)
        ON CONFLICT (affiliate_id, referred_user_id) DO NOTHING`, [affiliateId, convertedUserId, referralCode]);
            // Update affiliate profile referral count
            await client.query('UPDATE affiliate_profiles SET total_referrals = total_referrals + 1 WHERE user_id = $1', [affiliateId]);
            res.json({
                success: true,
                message: "Referral conversion recorded successfully"
            });
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.recordReferralConversion = recordReferralConversion;
