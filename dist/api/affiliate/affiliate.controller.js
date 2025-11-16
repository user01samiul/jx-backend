"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAffiliateCommissionSummary = exports.updateAffiliateCommissionRate = exports.getAllAffiliateProfiles = exports.getAffiliateDashboard = exports.generateAffiliateLink = exports.getAffiliateTeam = exports.getAffiliateCommissions = exports.getAffiliateReferrals = exports.getAffiliateStats = exports.createAffiliateProfile = exports.getAffiliateProfile = void 0;
const affiliate_service_1 = require("../../services/affiliate/affiliate.service");
const enhanced_affiliate_service_1 = require("../../services/affiliate/enhanced-affiliate.service");
/**
 * Get affiliate profile for current user
 */
const getAffiliateProfile = async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const profile = await affiliate_service_1.AffiliateService.getAffiliateProfile(userId);
        if (!profile) {
            res.status(404).json({ success: false, message: "Affiliate profile not found" });
            return;
        }
        res.status(200).json({
            success: true,
            data: profile
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getAffiliateProfile = getAffiliateProfile;
/**
 * Create affiliate profile for current user
 */
const createAffiliateProfile = async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const { display_name, bio, website_url, social_media } = req.body;
        const profile = await affiliate_service_1.AffiliateService.createAffiliateProfile(userId, {
            display_name,
            bio,
            website_url,
            social_media
        });
        res.status(201).json({
            success: true,
            message: "Affiliate profile created successfully",
            data: profile
        });
    }
    catch (err) {
        next(err);
    }
};
exports.createAffiliateProfile = createAffiliateProfile;
/**
 * Get affiliate statistics
 */
const getAffiliateStats = async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const stats = await enhanced_affiliate_service_1.EnhancedAffiliateService.getAffiliateStats(userId);
        res.status(200).json({
            success: true,
            data: stats
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getAffiliateStats = getAffiliateStats;
/**
 * Get affiliate referrals
 */
const getAffiliateReferrals = async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const { page = 1, limit = 10, level } = req.query;
        const referrals = await enhanced_affiliate_service_1.EnhancedAffiliateService.getAffiliateReferrals(userId, Number(page), Number(limit), level);
        res.status(200).json({
            success: true,
            data: referrals
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getAffiliateReferrals = getAffiliateReferrals;
/**
 * Get affiliate commissions
 */
const getAffiliateCommissions = async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const { page = 1, limit = 10, status, start_date, end_date } = req.query;
        const commissions = await enhanced_affiliate_service_1.EnhancedAffiliateService.getAffiliateCommissions(userId, Number(page), Number(limit), status, start_date, end_date);
        res.status(200).json({
            success: true,
            data: commissions
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getAffiliateCommissions = getAffiliateCommissions;
/**
 * Get affiliate team structure
 */
const getAffiliateTeam = async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const { level = 1 } = req.query;
        const team = await enhanced_affiliate_service_1.EnhancedAffiliateService.getAffiliateTeam(userId, Number(level));
        res.status(200).json({
            success: true,
            data: team
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getAffiliateTeam = getAffiliateTeam;
/**
 * Generate affiliate link
 */
const generateAffiliateLink = async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const { campaign_name, target_url } = req.body;
        const link = await enhanced_affiliate_service_1.EnhancedAffiliateService.generateAffiliateLink(userId, campaign_name, target_url);
        res.status(200).json({
            success: true,
            data: link
        });
    }
    catch (err) {
        next(err);
    }
};
exports.generateAffiliateLink = generateAffiliateLink;
/**
 * Get affiliate dashboard data
 */
const getAffiliateDashboard = async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const dashboard = await enhanced_affiliate_service_1.EnhancedAffiliateService.getAffiliateDashboard(userId);
        res.status(200).json({
            success: true,
            data: dashboard
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getAffiliateDashboard = getAffiliateDashboard;
/**
 * Admin: Get all affiliate profiles
 */
const getAllAffiliateProfiles = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, status, search } = req.query;
        const profiles = await enhanced_affiliate_service_1.EnhancedAffiliateService.getAllAffiliateProfiles(Number(page), Number(limit), status, search);
        res.status(200).json({
            success: true,
            data: profiles
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getAllAffiliateProfiles = getAllAffiliateProfiles;
/**
 * Admin: Update affiliate commission rate
 */
const updateAffiliateCommissionRate = async (req, res, next) => {
    try {
        const { affiliate_id, commission_rate } = req.body;
        if (!affiliate_id || !commission_rate) {
            res.status(400).json({ success: false, message: "Affiliate ID and commission rate are required" });
            return;
        }
        const result = await enhanced_affiliate_service_1.EnhancedAffiliateService.updateAffiliateCommissionRate(affiliate_id, commission_rate);
        res.status(200).json({
            success: true,
            message: "Commission rate updated successfully",
            data: result
        });
    }
    catch (err) {
        next(err);
    }
};
exports.updateAffiliateCommissionRate = updateAffiliateCommissionRate;
/**
 * Admin: Get affiliate commission summary
 */
const getAffiliateCommissionSummary = async (req, res, next) => {
    try {
        const { start_date, end_date, affiliate_id } = req.query;
        const summary = await enhanced_affiliate_service_1.EnhancedAffiliateService.getAffiliateCommissionSummary(start_date, end_date, affiliate_id ? Number(affiliate_id) : undefined);
        res.status(200).json({
            success: true,
            data: summary
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getAffiliateCommissionSummary = getAffiliateCommissionSummary;
