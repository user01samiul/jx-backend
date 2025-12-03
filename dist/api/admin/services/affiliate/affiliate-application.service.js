"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AffiliateApplicationService = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
const apiError_1 = require("../../utils/apiError");
class AffiliateApplicationService {
    /**
     * Submit a new affiliate application
     */
    static async submitApplication(data) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Check if user already has a pending application
            const existingCheck = await client.query(`SELECT id FROM affiliate_applications
         WHERE user_id = $1 AND application_status = 'pending'`, [data.userId]);
            if (existingCheck.rows.length > 0) {
                throw new apiError_1.ApiError('You already have a pending application', 400);
            }
            // Check if user is already an affiliate
            const affiliateCheck = await client.query('SELECT id FROM affiliate_profiles WHERE user_id = $1', [data.userId]);
            if (affiliateCheck.rows.length > 0) {
                throw new apiError_1.ApiError('You are already an affiliate', 400);
            }
            // Validate upline referral code if provided
            let uplineUserId = null;
            if (data.uplineReferralCode) {
                const uplineResult = await client.query('SELECT user_id FROM affiliate_profiles WHERE referral_code = $1 AND is_active = true', [data.uplineReferralCode]);
                if (uplineResult.rows.length === 0) {
                    throw new apiError_1.ApiError('Invalid upline referral code', 400);
                }
                uplineUserId = uplineResult.rows[0].user_id;
            }
            // Create application
            const result = await client.query(`INSERT INTO affiliate_applications (
          user_id, display_name, website_url, social_media_links,
          traffic_sources, expected_monthly_referrals, marketing_experience,
          additional_info, preferred_referral_code, upline_referral_code,
          application_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
        RETURNING *`, [
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
            ]);
            await client.query('COMMIT');
            return result.rows[0];
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
     * Get all applications with filters and pagination (ADMIN)
     */
    static async getAllApplications(filters) {
        const { status, page = 1, limit = 20, search, sortBy = 'created_at', sortOrder = 'DESC' } = filters;
        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];
        let paramIndex = 1;
        if (status) {
            conditions.push(`aa.application_status = $${paramIndex++}`);
            params.push(status);
        }
        if (search) {
            conditions.push(`(
        aa.display_name ILIKE $${paramIndex} OR
        u.username ILIKE $${paramIndex} OR
        u.email ILIKE $${paramIndex}
      )`);
            params.push(`%${search}%`);
            paramIndex++;
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        // Get total count
        const countResult = await postgres_1.default.query(`SELECT COUNT(*) as total
       FROM affiliate_applications aa
       JOIN users u ON aa.user_id = u.id
       ${whereClause}`, params);
        const total = parseInt(countResult.rows[0].total);
        // Get applications with user details
        const allowedSortColumns = ['created_at', 'display_name', 'application_status', 'expected_monthly_referrals'];
        const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
        const result = await postgres_1.default.query(`SELECT
        aa.*,
        u.username,
        u.email,
        up.first_name,
        up.last_name,
        up.country,
        reviewer.username as reviewed_by_username,
        upline_aff.referral_code as upline_code,
        upline_aff.display_name as upline_name
       FROM affiliate_applications aa
       JOIN users u ON aa.user_id = u.id
       LEFT JOIN user_profiles up ON u.id = up.user_id
       LEFT JOIN users reviewer ON aa.reviewed_by = reviewer.id
       LEFT JOIN affiliate_profiles upline_aff ON upline_aff.referral_code = aa.upline_referral_code
       ${whereClause}
       ORDER BY aa.${sortColumn} ${sortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...params, limit, offset]);
        return {
            applications: result.rows,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }
    /**
     * Get application by ID (ADMIN)
     */
    static async getApplicationById(applicationId) {
        const result = await postgres_1.default.query(`SELECT
        aa.*,
        u.username,
        u.email,
        up.first_name,
        up.last_name,
        up.phone_number,
        up.country,
        up.city,
        reviewer.username as reviewed_by_username,
        upline_aff.referral_code as upline_code,
        upline_aff.display_name as upline_name,
        upline_aff.user_id as upline_user_id
       FROM affiliate_applications aa
       JOIN users u ON aa.user_id = u.id
       LEFT JOIN user_profiles up ON u.id = up.user_id
       LEFT JOIN users reviewer ON aa.reviewed_by = reviewer.id
       LEFT JOIN affiliate_profiles upline_aff ON upline_aff.referral_code = aa.upline_referral_code
       WHERE aa.id = $1`, [applicationId]);
        if (result.rows.length === 0) {
            throw new apiError_1.ApiError('Application not found', 404);
        }
        return result.rows[0];
    }
    /**
     * Get user's application status
     */
    static async getUserApplicationStatus(userId) {
        const result = await postgres_1.default.query(`SELECT * FROM affiliate_applications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`, [userId]);
        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0];
    }
    /**
     * Approve affiliate application (ADMIN)
     */
    static async approveApplication(applicationId, approvedBy, approvalData) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get application details
            const appResult = await client.query(`SELECT * FROM affiliate_applications WHERE id = $1 AND application_status = 'pending'`, [applicationId]);
            if (appResult.rows.length === 0) {
                throw new apiError_1.ApiError('Application not found or already processed', 404);
            }
            const application = appResult.rows[0];
            // Check if user already has an affiliate profile
            const existingProfile = await client.query('SELECT id FROM affiliate_profiles WHERE user_id = $1', [application.user_id]);
            if (existingProfile.rows.length > 0) {
                throw new apiError_1.ApiError('User already has an affiliate profile', 400);
            }
            // Generate unique referral code
            const referralCode = application.preferred_referral_code || await this.generateReferralCode(client);
            // Verify referral code is unique
            const codeCheck = await client.query('SELECT id FROM affiliate_profiles WHERE referral_code = $1', [referralCode]);
            if (codeCheck.rows.length > 0) {
                throw new apiError_1.ApiError('Referral code already exists. Please try a different one.', 400);
            }
            // Determine upline and MLM level
            let uplineId = null;
            let level = 1;
            if (application.upline_referral_code) {
                const uplineResult = await client.query('SELECT user_id, level FROM affiliate_profiles WHERE referral_code = $1 AND is_active = true', [application.upline_referral_code]);
                if (uplineResult.rows.length > 0) {
                    uplineId = uplineResult.rows[0].user_id;
                    level = uplineResult.rows[0].level + 1;
                }
            }
            // Create affiliate profile
            const profileResult = await client.query(`INSERT INTO affiliate_profiles (
          user_id, referral_code, display_name, website_url, social_media_links,
          commission_rate, is_active, level, upline_id,
          application_id, approved_at, approved_by
        ) VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, $9, NOW(), $10)
        RETURNING *`, [
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
            ]);
            // Update upline's downline count if exists
            if (uplineId) {
                await client.query('UPDATE affiliate_profiles SET downline_count = downline_count + 1 WHERE user_id = $1', [uplineId]);
            }
            // Assign "Affiliate" role to user
            const roleResult = await client.query('SELECT id FROM roles WHERE name = $1', ['Affiliate']);
            if (roleResult.rows.length > 0) {
                await client.query(`INSERT INTO user_roles (user_id, role_id)
           VALUES ($1, $2)
           ON CONFLICT (user_id, role_id) DO NOTHING`, [application.user_id, roleResult.rows[0].id]);
            }
            // Update application status
            await client.query(`UPDATE affiliate_applications
         SET application_status = 'approved',
             reviewed_by = $1,
             reviewed_at = NOW(),
             admin_notes = $2
         WHERE id = $3`, [approvedBy, approvalData.adminNotes, applicationId]);
            await client.query('COMMIT');
            return {
                application: appResult.rows[0],
                profile: profileResult.rows[0]
            };
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
     * Reject affiliate application (ADMIN)
     */
    static async rejectApplication(applicationId, rejectedBy, rejectData) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get application
            const appResult = await client.query(`SELECT * FROM affiliate_applications WHERE id = $1 AND application_status = 'pending'`, [applicationId]);
            if (appResult.rows.length === 0) {
                throw new apiError_1.ApiError('Application not found or already processed', 404);
            }
            // Update application status
            const result = await client.query(`UPDATE affiliate_applications
         SET application_status = 'rejected',
             reviewed_by = $1,
             reviewed_at = NOW(),
             rejection_reason = $2,
             admin_notes = $3
         WHERE id = $4
         RETURNING *`, [rejectedBy, rejectData.rejectionReason, rejectData.adminNotes, applicationId]);
            await client.query('COMMIT');
            return result.rows[0];
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
    static async generateReferralCode(client) {
        for (let i = 0; i < 10; i++) {
            const code = this.generateRandomCode();
            const check = await client.query('SELECT id FROM affiliate_profiles WHERE referral_code = $1', [code]);
            if (check.rows.length === 0) {
                return code;
            }
        }
        throw new apiError_1.ApiError('Failed to generate unique referral code', 500);
    }
    /**
     * Generate random alphanumeric code
     */
    static generateRandomCode(length = 8) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing characters
        let code = '';
        for (let i = 0; i < length; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
    /**
     * Get application statistics (ADMIN)
     */
    static async getApplicationStatistics() {
        const result = await postgres_1.default.query(`
      SELECT
        COUNT(*) FILTER (WHERE application_status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE application_status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE application_status = 'rejected') as rejected_count,
        COUNT(*) FILTER (WHERE application_status = 'pending' AND created_at >= CURRENT_DATE - INTERVAL '7 days') as pending_last_7_days,
        COUNT(*) FILTER (WHERE application_status = 'approved' AND reviewed_at >= CURRENT_DATE - INTERVAL '7 days') as approved_last_7_days,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as total_last_30_days
      FROM affiliate_applications
    `);
        return result.rows[0];
    }
}
exports.AffiliateApplicationService = AffiliateApplicationService;
