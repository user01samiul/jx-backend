"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminKYCService = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
class AdminKYCService {
    // Get pending KYC requests
    static async getPendingKYC(filters) {
        const { page, limit, search, status, document_type, user_id, start_date, end_date, compliance_level, risk_score_min, risk_score_max } = filters;
        const offset = (page - 1) * limit;
        let whereConditions = ['1=1'];
        let values = [];
        let valueIndex = 1;
        if (search) {
            whereConditions.push(`(u.username ILIKE $${valueIndex} OR u.email ILIKE $${valueIndex} OR up.first_name ILIKE $${valueIndex} OR up.last_name ILIKE $${valueIndex})`);
            values.push(`%${search}%`);
            valueIndex++;
        }
        if (status) {
            whereConditions.push(`k.status = $${valueIndex}`);
            values.push(status);
            valueIndex++;
        }
        if (document_type) {
            whereConditions.push(`kd.document_type = $${valueIndex}`);
            values.push(document_type);
            valueIndex++;
        }
        if (user_id) {
            whereConditions.push(`k.user_id = $${valueIndex}`);
            values.push(user_id);
            valueIndex++;
        }
        if (start_date) {
            whereConditions.push(`k.created_at >= $${valueIndex}`);
            values.push(start_date);
            valueIndex++;
        }
        if (end_date) {
            whereConditions.push(`k.created_at <= $${valueIndex}`);
            values.push(end_date);
            valueIndex++;
        }
        if (compliance_level) {
            whereConditions.push(`k.compliance_level = $${valueIndex}`);
            values.push(compliance_level);
            valueIndex++;
        }
        if (risk_score_min !== undefined) {
            whereConditions.push(`k.risk_score >= $${valueIndex}`);
            values.push(risk_score_min);
            valueIndex++;
        }
        if (risk_score_max !== undefined) {
            whereConditions.push(`k.risk_score <= $${valueIndex}`);
            values.push(risk_score_max);
            valueIndex++;
        }
        const whereClause = whereConditions.join(' AND ');
        // Count query
        const countQuery = `
      SELECT COUNT(DISTINCT k.id) as total
      FROM kyc_verifications k
      JOIN users u ON k.user_id = u.id
      LEFT JOIN kyc_documents kd ON k.user_id = kd.user_id
      WHERE ${whereClause}
    `;
        const countResult = await postgres_1.default.query(countQuery, values);
        const total = parseInt(countResult.rows[0].total);
        // Data query
        const dataQuery = `
      SELECT
        k.*,
        u.username,
        u.email,
        up.first_name,
        up.last_name,
        up.phone_number,
        up.country,
        up.date_of_birth,
        COUNT(kd.id) as document_count,
        COUNT(CASE WHEN kd.status = 'approved' THEN 1 END) as approved_documents,
        COUNT(CASE WHEN kd.status = 'pending' THEN 1 END) as pending_documents,
        COUNT(CASE WHEN kd.status = 'rejected' THEN 1 END) as rejected_documents
      FROM kyc_verifications k
      JOIN users u ON k.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN kyc_documents kd ON k.user_id = kd.user_id
      WHERE ${whereClause}
      GROUP BY k.id, u.id, up.first_name, up.last_name, up.phone_number, up.country, up.date_of_birth
      ORDER BY k.created_at DESC
      LIMIT $${valueIndex} OFFSET $${valueIndex + 1}
    `;
        values.push(limit, offset);
        const dataResult = await postgres_1.default.query(dataQuery, values);
        return {
            kyc_requests: dataResult.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    // Get KYC by user ID
    static async getKYCByUserId(userId) {
        const query = `
      SELECT
        k.*,
        u.username,
        u.email,
        up.first_name,
        up.last_name,
        up.phone_number,
        up.country,
        up.date_of_birth,
        u.created_at as user_created_at,
        u.status_id as user_status
      FROM kyc_verifications k
      JOIN users u ON k.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE k.user_id = $1
    `;
        const result = await postgres_1.default.query(query, [userId]);
        return result.rows[0] || null;
    }
    // Approve KYC
    static async approveKYC(userId, data) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            const query = `
        UPDATE kyc_verifications 
        SET 
          status = $1,
          reason = $2,
          admin_notes = $3,
          verification_date = COALESCE($4, NOW()),
          expiry_date = $5,
          risk_score = $6,
          compliance_level = $7,
          updated_at = NOW()
        WHERE user_id = $8
        RETURNING *
      `;
            const values = [
                data.status,
                data.reason,
                data.admin_notes,
                data.verification_date,
                data.expiry_date,
                data.risk_score,
                data.compliance_level,
                userId
            ];
            const result = await client.query(query, values);
            // Update user status if KYC is approved
            if (data.status === 'approved') {
                await client.query('UPDATE users SET kyc_verified = true, kyc_verified_at = NOW() WHERE id = $1', [userId]);
            }
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
    // Reject KYC
    static async rejectKYC(userId, data) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            const query = `
        UPDATE kyc_verifications 
        SET 
          status = $1,
          reason = $2,
          admin_notes = $3,
          verification_date = COALESCE($4, NOW()),
          updated_at = NOW()
        WHERE user_id = $5
        RETURNING *
      `;
            const values = [
                data.status,
                data.reason,
                data.admin_notes,
                data.verification_date,
                userId
            ];
            const result = await client.query(query, values);
            // Update user status if KYC is rejected
            if (data.status === 'rejected') {
                await client.query('UPDATE users SET kyc_verified = false, kyc_verified_at = NULL WHERE id = $1', [userId]);
            }
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
    // Get KYC documents
    static async getKYCDocuments(userId, filters) {
        let whereConditions = ['1=1'];
        let values = [];
        let valueIndex = 1;
        if (userId) {
            whereConditions.push(`kd.user_id = $${valueIndex}`);
            values.push(userId);
            valueIndex++;
        }
        if (filters) {
            const { document_type, status, start_date, end_date } = filters;
            if (document_type) {
                whereConditions.push(`kd.document_type = $${valueIndex}`);
                values.push(document_type);
                valueIndex++;
            }
            if (status) {
                whereConditions.push(`kd.status = $${valueIndex}`);
                values.push(status);
                valueIndex++;
            }
            if (start_date) {
                whereConditions.push(`kd.created_at >= $${valueIndex}`);
                values.push(start_date);
                valueIndex++;
            }
            if (end_date) {
                whereConditions.push(`kd.created_at <= $${valueIndex}`);
                values.push(end_date);
                valueIndex++;
            }
        }
        const whereClause = whereConditions.join(' AND ');
        const query = `
      SELECT
        kd.*,
        u.username,
        u.email,
        up.first_name,
        up.last_name
      FROM kyc_documents kd
      JOIN users u ON kd.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE ${whereClause}
      ORDER BY kd.created_at DESC
    `;
        const result = await postgres_1.default.query(query, values);
        return result.rows;
    }
    // Verify KYC document
    static async verifyKYCDocument(data) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            const query = `
        UPDATE kyc_documents 
        SET 
          status = $1,
          reason = $2,
          admin_notes = $3,
          verification_method = $4,
          verified_by = $5,
          verification_date = COALESCE($6, NOW()),
          updated_at = NOW()
        WHERE id = $7
        RETURNING *
      `;
            const values = [
                data.status,
                data.reason,
                data.admin_notes,
                data.verification_method,
                data.verified_by,
                data.verification_date,
                data.document_id
            ];
            const result = await client.query(query, values);
            // Check if all documents for this user are approved
            if (data.status === 'approved') {
                const allDocumentsQuery = `
          SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved
          FROM kyc_documents 
          WHERE user_id = (SELECT user_id FROM kyc_documents WHERE id = $1)
        `;
                const docResult = await client.query(allDocumentsQuery, [data.document_id]);
                const { total, approved } = docResult.rows[0];
                // If all documents are approved, update KYC verification status
                if (parseInt(total) === parseInt(approved)) {
                    await client.query(`UPDATE kyc_verifications 
             SET status = 'approved', verification_date = NOW(), updated_at = NOW()
             WHERE user_id = (SELECT user_id FROM kyc_documents WHERE id = $1)`, [data.document_id]);
                }
            }
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
    // Create risk assessment
    static async createRiskAssessment(data) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            const query = `
        INSERT INTO kyc_risk_assessments (
          user_id, risk_factors, risk_score, risk_level, 
          assessment_notes, recommended_actions, assessment_date, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, NOW()), NOW())
        RETURNING *
      `;
            const values = [
                data.user_id,
                data.risk_factors,
                data.risk_score,
                data.risk_level,
                data.assessment_notes,
                data.recommended_actions,
                data.assessment_date
            ];
            const result = await client.query(query, values);
            // Update KYC verification with risk score
            await client.query(`UPDATE kyc_verifications 
         SET risk_score = $1, updated_at = NOW()
         WHERE user_id = $2`, [data.risk_score, data.user_id]);
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
    // Get KYC reports
    static async getKYCReports(filters) {
        const { start_date, end_date, report_type, include_details } = filters;
        let groupByClause = '';
        let dateFormat = '';
        switch (report_type) {
            case 'daily':
                groupByClause = 'DATE(k.created_at)';
                dateFormat = 'YYYY-MM-DD';
                break;
            case 'weekly':
                groupByClause = 'DATE_TRUNC(\'week\', k.created_at)';
                dateFormat = 'YYYY-"W"WW';
                break;
            case 'monthly':
                groupByClause = 'DATE_TRUNC(\'month\', k.created_at)';
                dateFormat = 'YYYY-MM';
                break;
            case 'quarterly':
                groupByClause = 'DATE_TRUNC(\'quarter\', k.created_at)';
                dateFormat = 'YYYY-Q';
                break;
            case 'annual':
                groupByClause = 'DATE_TRUNC(\'year\', k.created_at)';
                dateFormat = 'YYYY';
                break;
        }
        const query = `
      SELECT 
        ${groupByClause} as period,
        COUNT(k.id) as total_requests,
        COUNT(CASE WHEN k.status = 'pending' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN k.status = 'approved' THEN 1 END) as approved_requests,
        COUNT(CASE WHEN k.status = 'rejected' THEN 1 END) as rejected_requests,
        COUNT(CASE WHEN k.status = 'under_review' THEN 1 END) as under_review_requests,
        AVG(k.risk_score) as avg_risk_score,
        COUNT(CASE WHEN k.compliance_level = 'low' THEN 1 END) as low_compliance,
        COUNT(CASE WHEN k.compliance_level = 'medium' THEN 1 END) as medium_compliance,
        COUNT(CASE WHEN k.compliance_level = 'high' THEN 1 END) as high_compliance,
        AVG(EXTRACT(EPOCH FROM (k.verification_date - k.created_at))/86400) as avg_processing_days
      FROM kyc_verifications k
      WHERE k.created_at >= $1 AND k.created_at <= $2
      GROUP BY ${groupByClause}
      ORDER BY period DESC
    `;
        const result = await postgres_1.default.query(query, [start_date, end_date]);
        if (include_details) {
            // Get detailed breakdown
            const detailsQuery = `
        SELECT
          k.status,
          k.compliance_level,
          k.risk_score,
          up.country,
          COUNT(*) as count
        FROM kyc_verifications k
        JOIN users u ON k.user_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE k.created_at >= $1 AND k.created_at <= $2
        GROUP BY k.status, k.compliance_level, k.risk_score, up.country
        ORDER BY count DESC
      `;
            const detailsResult = await postgres_1.default.query(detailsQuery, [start_date, end_date]);
            return {
                summary: result.rows,
                details: detailsResult.rows
            };
        }
        return {
            summary: result.rows
        };
    }
    // Get KYC audit logs
    static async getKYCAuditLogs(userId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        let whereConditions = ['1=1'];
        let values = [];
        let valueIndex = 1;
        if (userId) {
            whereConditions.push(`kal.user_id = $${valueIndex}`);
            values.push(userId);
            valueIndex++;
        }
        const whereClause = whereConditions.join(' AND ');
        // Count query
        const countQuery = `
      SELECT COUNT(*) as total
      FROM kyc_audit_logs kal
      WHERE ${whereClause}
    `;
        const countResult = await postgres_1.default.query(countQuery, values);
        const total = parseInt(countResult.rows[0].total);
        // Data query
        const dataQuery = `
      SELECT 
        kal.*,
        u.username,
        u.email,
        a.username as admin_username
      FROM kyc_audit_logs kal
      JOIN users u ON kal.user_id = u.id
      LEFT JOIN users a ON kal.admin_id = a.id
      WHERE ${whereClause}
      ORDER BY kal.created_at DESC
      LIMIT $${valueIndex} OFFSET $${valueIndex + 1}
    `;
        values.push(limit, offset);
        const dataResult = await postgres_1.default.query(dataQuery, values);
        return {
            audit_logs: dataResult.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
}
exports.AdminKYCService = AdminKYCService;
