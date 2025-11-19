"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AffiliateService = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
class AffiliateService {
    /**
     * Create affiliate profile
     */
    static async createAffiliateProfile(userId, profileData) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Check if profile already exists
            const existingResult = await client.query('SELECT id FROM affiliate_profiles WHERE user_id = $1', [userId]);
            if (existingResult.rows.length > 0) {
                throw new Error('Affiliate profile already exists for this user');
            }
            // Generate unique referral code
            const referralCode = this.generateReferralCode();
            // Create affiliate profile
            const profileResult = await client.query(`INSERT INTO affiliate_profiles (
          user_id, referral_code, display_name, bio, website_url, 
          social_media, commission_rate, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        RETURNING *`, [
                userId,
                referralCode,
                profileData.display_name,
                profileData.bio || null,
                profileData.website_url || null,
                profileData.social_media ? JSON.stringify(profileData.social_media) : null,
                5.0 // Default commission rate
            ]);
            await client.query('COMMIT');
            return profileResult.rows[0];
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Generate unique referral code
     */
    static generateReferralCode() {
        const prefix = 'AFF';
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `${prefix}${timestamp}${random}`.toUpperCase();
    }
    /**
     * Get affiliate profile by user ID
     */
    static async getAffiliateProfile(userId) {
        const result = await postgres_1.default.query('SELECT * FROM affiliate_profiles WHERE user_id = $1', [userId]);
        return result.rows[0] || null;
    }
    /**
     * Update affiliate profile
     */
    static async updateAffiliateProfile(userId, profileData) {
        const fields = [];
        const values = [];
        let paramCount = 1;
        Object.entries(profileData).forEach(([key, value]) => {
            if (value !== undefined && key !== 'id' && key !== 'user_id' && key !== 'referral_code') {
                if (key === 'social_media_links' || key === 'payment_methods') {
                    fields.push(`${key} = $${paramCount}`);
                    values.push(JSON.stringify(value));
                }
                else {
                    fields.push(`${key} = $${paramCount}`);
                    values.push(value);
                }
                paramCount++;
            }
        });
        if (fields.length === 0) {
            throw new Error("No fields to update");
        }
        values.push(userId);
        const result = await postgres_1.default.query(`UPDATE affiliate_profiles 
       SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $${paramCount}
       RETURNING *`, values);
        if (result.rows.length === 0) {
            throw new Error("Affiliate profile not found");
        }
        return result.rows[0];
    }
    /**
     * Get affiliate dashboard data
     */
    static async getAffiliateDashboard(userId) {
        const client = await postgres_1.default.connect();
        try {
            // Get basic stats
            const statsResult = await client.query(`SELECT 
          COUNT(*) as total_referrals,
          COUNT(CASE WHEN ar.status = 'active' THEN 1 END) as active_referrals,
          COALESCE(SUM(ar.total_commission_earned), 0) as total_commission_earned,
          COALESCE(SUM(ac.commission_amount), 0) as pending_commission,
          COALESCE(SUM(ap.total_amount), 0) as total_payouts_received
        FROM affiliate_relationships ar
        LEFT JOIN affiliate_commissions ac ON ar.affiliate_id = ac.affiliate_id 
          AND ar.referred_user_id = ac.referred_user_id 
          AND ac.status = 'pending'
        LEFT JOIN affiliate_payouts ap ON ar.affiliate_id = ap.affiliate_id 
          AND ap.status = 'completed'
        WHERE ar.affiliate_id = $1`, [userId]);
            const stats = statsResult.rows[0];
            const availableForPayout = Math.max(0, stats.pending_commission - stats.total_payouts_received);
            // Get recent referrals
            const referralsResult = await client.query(`SELECT 
          ar.id, u.username, u.email, ar.created_at as registration_date,
          ar.first_deposit_amount, ar.first_deposit_date, ar.total_commission_earned, ar.status
        FROM affiliate_relationships ar
        JOIN users u ON ar.referred_user_id = u.id
        WHERE ar.affiliate_id = $1
        ORDER BY ar.created_at DESC
        LIMIT 10`, [userId]);
            return {
                total_referrals: parseInt(stats.total_referrals),
                active_referrals: parseInt(stats.active_referrals),
                total_commission_earned: parseFloat(stats.total_commission_earned),
                pending_commission: parseFloat(stats.pending_commission),
                total_payouts_received: parseFloat(stats.total_payouts_received),
                available_for_payout: availableForPayout,
                monthly_stats: {
                    new_referrals: 0,
                    commission_earned: 0,
                    conversions: 0
                },
                recent_referrals: referralsResult.rows,
                recent_commissions: [],
                recent_payouts: []
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Get affiliate commissions with filtering
     */
    static async getAffiliateCommissions(userId, filters = {}) {
        const { status, commission_type, start_date, end_date, page = 1, limit = 20 } = filters;
        const offset = (page - 1) * limit;
        let whereConditions = ['ac.affiliate_id = $1'];
        let params = [userId];
        let paramCount = 1;
        if (status) {
            paramCount++;
            whereConditions.push(`ac.status = $${paramCount}`);
            params.push(status);
        }
        if (commission_type) {
            paramCount++;
            whereConditions.push(`ac.commission_type = $${paramCount}`);
            params.push(commission_type);
        }
        if (start_date) {
            paramCount++;
            whereConditions.push(`ac.created_at >= $${paramCount}`);
            params.push(start_date);
        }
        if (end_date) {
            paramCount++;
            whereConditions.push(`ac.created_at <= $${paramCount}`);
            params.push(end_date);
        }
        const whereClause = whereConditions.join(' AND ');
        // Get total count
        const countResult = await postgres_1.default.query(`SELECT COUNT(*) as total FROM affiliate_commissions ac WHERE ${whereClause}`, params);
        // Get commissions
        const commissionsResult = await postgres_1.default.query(`SELECT ac.*, u.username as referred_user_username
       FROM affiliate_commissions ac
       JOIN users u ON ac.referred_user_id = u.id
       WHERE ${whereClause}
       ORDER BY ac.created_at DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`, [...params, limit, offset]);
        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / limit);
        return {
            commissions: commissionsResult.rows,
            total,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };
    }
    /**
     * Get affiliate payouts
     */
    static async getAffiliatePayouts(userId, filters = {}) {
        const { status, start_date, end_date, page = 1, limit = 20 } = filters;
        const offset = (page - 1) * limit;
        let whereConditions = ['ap.affiliate_id = $1'];
        let params = [userId];
        let paramCount = 1;
        if (status) {
            paramCount++;
            whereConditions.push(`ap.status = $${paramCount}`);
            params.push(status);
        }
        if (start_date) {
            paramCount++;
            whereConditions.push(`ap.created_at >= $${paramCount}`);
            params.push(start_date);
        }
        if (end_date) {
            paramCount++;
            whereConditions.push(`ap.created_at <= $${paramCount}`);
            params.push(end_date);
        }
        const whereClause = whereConditions.join(' AND ');
        // Get total count
        const countResult = await postgres_1.default.query(`SELECT COUNT(*) as total FROM affiliate_payouts ap WHERE ${whereClause}`, params);
        // Get payouts
        const payoutsResult = await postgres_1.default.query(`SELECT * FROM affiliate_payouts ap
       WHERE ${whereClause}
       ORDER BY ap.created_at DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`, [...params, limit, offset]);
        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / limit);
        return {
            payouts: payoutsResult.rows,
            total,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };
    }
    /**
     * Request payout for affiliate
     */
    static async requestPayout(userId, amount, paymentMethod) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Check if user has enough pending commission
            const pendingResult = await client.query(`SELECT COALESCE(SUM(commission_amount), 0) as pending_amount
         FROM affiliate_commissions
         WHERE affiliate_id = $1 AND status = 'pending'`, [userId]);
            const pendingAmount = parseFloat(pendingResult.rows[0].pending_amount);
            if (pendingAmount < amount) {
                throw new Error(`Insufficient pending commission. Available: $${pendingAmount}`);
            }
            // Get pending commission IDs
            const commissionIdsResult = await client.query(`SELECT id FROM affiliate_commissions
         WHERE affiliate_id = $1 AND status = 'pending'
         ORDER BY created_at ASC`, [userId]);
            const commissionIds = commissionIdsResult.rows.map(row => row.id);
            // Create payout record
            const payoutResult = await client.query(`INSERT INTO affiliate_payouts (
          affiliate_id, total_amount, commission_ids, payment_method
        ) VALUES ($1, $2, $3, $4) RETURNING *`, [userId, amount, commissionIds, paymentMethod]);
            // Update commission status to approved
            await client.query(`UPDATE affiliate_commissions
         SET status = 'approved'
         WHERE id = ANY($1)`, [commissionIds]);
            await client.query('COMMIT');
            return payoutResult.rows[0];
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Track affiliate click/visit
     */
    static async trackAffiliateClick(referralCode, visitorIp, userAgent, landingPage, sessionId) {
        const client = await postgres_1.default.connect();
        try {
            // Get affiliate ID from referral code
            const affiliateResult = await client.query('SELECT user_id FROM affiliate_profiles WHERE referral_code = $1 AND is_active = true', [referralCode]);
            if (affiliateResult.rows.length === 0) {
                throw new Error('Invalid or inactive referral code');
            }
            const affiliateId = affiliateResult.rows[0].user_id;
            // Record the click
            await client.query(`INSERT INTO affiliate_tracking (
          affiliate_id, referral_code, visitor_ip, user_agent, landing_page, session_id
        ) VALUES ($1, $2, $3, $4, $5, $6)`, [affiliateId, referralCode, visitorIp, userAgent, landingPage, sessionId]);
        }
        finally {
            client.release();
        }
    }
    /**
     * Record conversion for affiliate
     */
    static async recordConversion(referralCode, conversionType, convertedUserId, conversionAmount) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Find affiliate by referral code
            const affiliateResult = await client.query('SELECT user_id FROM affiliate_profiles WHERE referral_code = $1 AND is_active = true', [referralCode]);
            if (affiliateResult.rows.length === 0) {
                console.error(`[AFFILIATE] No active affiliate found for referral code: ${referralCode}`);
                return;
            }
            const affiliateId = affiliateResult.rows[0].user_id;
            // Check if relationship already exists
            const existingResult = await client.query('SELECT id FROM affiliate_relationships WHERE affiliate_id = $1 AND referred_user_id = $2', [affiliateId, convertedUserId]);
            if (existingResult.rows.length > 0) {
                console.log(`[AFFILIATE] Relationship already exists for affiliate ${affiliateId} and user ${convertedUserId}`);
                return;
            }
            // Create affiliate relationship
            await client.query(`INSERT INTO affiliate_relationships (
          affiliate_id, referred_user_id, referral_code, conversion_type, conversion_amount
        ) VALUES ($1, $2, $3, $4, $5)`, [
                affiliateId,
                convertedUserId,
                referralCode,
                conversionType,
                conversionAmount || 0
            ]);
            // Update affiliate profile
            await client.query(`UPDATE affiliate_profiles 
         SET total_referrals = total_referrals + 1
         WHERE user_id = $1`, [affiliateId]);
            // Create MLM relationships for higher levels
            await this.createMLMRelationships(affiliateId, convertedUserId, 1);
            // If this is a deposit conversion, calculate commission
            if (conversionType === 'deposit' && conversionAmount && conversionAmount > 0) {
                await this.calculateCommission(affiliateId, convertedUserId, 0, // No transaction ID for registration
                conversionAmount, 'deposit');
            }
            console.log(`[AFFILIATE] Conversion recorded: ${conversionType} for user ${convertedUserId} via affiliate ${affiliateId}`);
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('[AFFILIATE] Error recording conversion:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Create MLM relationships for upline affiliates
     */
    static async createMLMRelationships(baseAffiliateId, referredUserId, level) {
        const client = await postgres_1.default.connect();
        try {
            // Find upline affiliates (up to 3 levels)
            let currentAffiliateId = baseAffiliateId;
            for (let uplineLevel = 1; uplineLevel <= 3; uplineLevel++) {
                // Get upline affiliate
                const uplineResult = await client.query('SELECT upline_id FROM affiliate_profiles WHERE user_id = $1', [currentAffiliateId]);
                if (uplineResult.rows.length === 0 || !uplineResult.rows[0].upline_id) {
                    break; // No more upline
                }
                const uplineId = uplineResult.rows[0].upline_id;
                const relationshipLevel = level + uplineLevel;
                // Check if relationship already exists
                const existingResult = await client.query('SELECT id FROM affiliate_relationships WHERE affiliate_id = $1 AND referred_user_id = $2', [uplineId, referredUserId]);
                if (existingResult.rows.length === 0) {
                    // Create indirect relationship
                    await client.query(`INSERT INTO affiliate_relationships (
              affiliate_id, referred_user_id, level, is_indirect
            ) VALUES ($1, $2, $3, true)`, [uplineId, referredUserId, relationshipLevel]);
                    // Update upline downline count
                    await client.query(`UPDATE affiliate_profiles 
             SET downline_count = downline_count + 1
             WHERE user_id = $1`, [uplineId]);
                    console.log(`[AFFILIATE] MLM relationship created: Level ${relationshipLevel} for affiliate ${uplineId} and user ${referredUserId}`);
                }
                currentAffiliateId = uplineId;
            }
        }
        finally {
            client.release();
        }
    }
    /**
     * Calculate commission for affiliate
     */
    static async calculateCommission(affiliateId, referredUserId, transactionId, amount, commissionType) {
        const client = await postgres_1.default.connect();
        try {
            // Get affiliate profile
            const affiliateResult = await client.query('SELECT commission_rate FROM affiliate_profiles WHERE user_id = $1 AND is_active = true', [affiliateId]);
            if (affiliateResult.rows.length === 0) {
                console.error(`[AFFILIATE] Affiliate ${affiliateId} not found or inactive`);
                return 0;
            }
            const commissionRate = affiliateResult.rows[0].commission_rate || 5.0;
            // Calculate commission based on type
            let commissionAmount = 0;
            switch (commissionType) {
                case 'deposit':
                    commissionAmount = (amount * 10.0) / 100; // 10% of deposit
                    break;
                case 'bet_revenue':
                    commissionAmount = (amount * 3.0) / 100; // 3% of bet amount
                    break;
                case 'win_revenue':
                    commissionAmount = (amount * 2.0) / 100; // 2% of win amount
                    break;
                case 'loss_revenue':
                    commissionAmount = (amount * 5.0) / 100; // 5% of loss amount
                    break;
                default:
                    commissionAmount = (amount * commissionRate) / 100; // Use affiliate's rate
            }
            // Create commission record
            const commissionResult = await client.query(`INSERT INTO affiliate_commissions (
          affiliate_id, referred_user_id, transaction_id, commission_amount,
          commission_rate, base_amount, commission_type, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`, [
                affiliateId,
                referredUserId,
                transactionId,
                commissionAmount,
                commissionRate,
                amount,
                commissionType,
                'pending'
            ]);
            // Update affiliate profile
            await client.query(`UPDATE affiliate_profiles 
         SET total_commission_earned = total_commission_earned + $1
         WHERE user_id = $2`, [commissionAmount, affiliateId]);
            console.log(`[AFFILIATE] Commission calculated: $${commissionAmount} for affiliate ${affiliateId}, type: ${commissionType}`);
            return commissionAmount;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get marketing materials for affiliate
     */
    static async getMarketingMaterials() {
        const result = await postgres_1.default.query('SELECT * FROM affiliate_marketing_materials WHERE is_active = true ORDER BY created_at DESC');
        return result.rows;
    }
    /**
     * Get affiliate statistics for admin
     */
    static async getAdminAffiliateStats() {
        const result = await postgres_1.default.query(`
      SELECT 
        COUNT(DISTINCT ap.user_id) as total_affiliates,
        COUNT(DISTINCT CASE WHEN ap.is_active = true THEN ap.user_id END) as active_affiliates,
        COUNT(DISTINCT ar.referred_user_id) as total_referrals,
        COALESCE(SUM(ac.commission_amount), 0) as total_commission_paid,
        COALESCE(SUM(CASE WHEN ac.status = 'pending' THEN ac.commission_amount ELSE 0 END), 0) as pending_commission,
        COALESCE(SUM(ap.total_amount), 0) as total_payouts
      FROM affiliate_profiles ap
      LEFT JOIN affiliate_relationships ar ON ap.user_id = ar.affiliate_id
      LEFT JOIN affiliate_commissions ac ON ap.user_id = ac.affiliate_id
      LEFT JOIN affiliate_payouts ap ON ap.affiliate_id = ap.affiliate_id
    `);
        return result.rows[0];
    }
}
exports.AffiliateService = AffiliateService;
