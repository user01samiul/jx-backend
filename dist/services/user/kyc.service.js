"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKYCRequirementsService = exports.deleteKYCDocumentService = exports.uploadKYCDocumentService = exports.getKYCDocumentsService = exports.getKYCStatusService = void 0;
// src/services/user/kyc.service.ts
const postgres_1 = __importDefault(require("../../db/postgres"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const cdn_storage_util_1 = require("../../utils/cdn-storage.util");
/**
 * Get KYC status for a user
 */
const getKYCStatusService = async (userId) => {
    var _a, _b, _c;
    const client = await postgres_1.default.connect();
    try {
        // Get verification status
        const verificationQuery = `
      SELECT
        v.id,
        v.status,
        v.reason,
        v.risk_score,
        v.compliance_level,
        v.verification_date,
        v.expiry_date,
        v.created_at,
        v.updated_at
      FROM kyc_verifications v
      WHERE v.user_id = $1
      ORDER BY v.created_at DESC
      LIMIT 1
    `;
        const verificationResult = await client.query(verificationQuery, [userId]);
        // Get user profile for verification level (with fallback to users table)
        const profileQuery = `
      SELECT
        COALESCE(up.verification_level, 0) as verification_level,
        COALESCE(up.is_verified, u.kyc_verified, false) as is_verified
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = $1
    `;
        const profileResult = await client.query(profileQuery, [userId]);
        // Get document counts by status
        const documentsCountQuery = `
      SELECT
        status,
        COUNT(*) as count
      FROM kyc_documents
      WHERE user_id = $1
      GROUP BY status
    `;
        const documentsCountResult = await client.query(documentsCountQuery, [userId]);
        const documentCounts = documentsCountResult.rows.reduce((acc, row) => {
            acc[row.status] = parseInt(row.count);
            return acc;
        }, {});
        // Get approved document types (array of document types that are approved)
        const approvedDocsQuery = `
      SELECT DISTINCT document_type
      FROM kyc_documents
      WHERE user_id = $1 AND status = 'approved'
    `;
        const approvedDocsResult = await client.query(approvedDocsQuery, [userId]);
        const approvedDocumentTypes = approvedDocsResult.rows.map((row) => row.document_type);
        // Get pending document types
        const pendingDocsQuery = `
      SELECT DISTINCT document_type
      FROM kyc_documents
      WHERE user_id = $1 AND status = 'pending'
    `;
        const pendingDocsResult = await client.query(pendingDocsQuery, [userId]);
        const pendingDocumentTypes = pendingDocsResult.rows.map((row) => row.document_type);
        // Get rejected document types
        const rejectedDocsQuery = `
      SELECT DISTINCT document_type
      FROM kyc_documents
      WHERE user_id = $1 AND status = 'rejected'
    `;
        const rejectedDocsResult = await client.query(rejectedDocsQuery, [userId]);
        const rejectedDocumentTypes = rejectedDocsResult.rows.map((row) => row.document_type);
        // Get required documents list
        const verificationLevel = ((_a = profileResult.rows[0]) === null || _a === void 0 ? void 0 : _a.verification_level) || 0;
        const requiredDocuments = getRequiredDocumentsForLevel(verificationLevel);
        // Determine overall KYC status
        let overallStatus = 'not_submitted';
        if (verificationResult.rows[0]) {
            overallStatus = verificationResult.rows[0].status;
        }
        else if (documentCounts.pending > 0 || documentCounts.under_review > 0) {
            overallStatus = 'pending';
        }
        else if (documentCounts.rejected > 0 && documentCounts.approved === 0) {
            overallStatus = 'rejected';
        }
        // Determine if user can submit documents
        // User can submit if:
        // 1. No approved documents AND
        // 2. No pending/under_review documents AND
        // 3. KYC status is not approved
        const hasApprovedDocs = (documentCounts.approved || 0) > 0;
        const hasPendingDocs = (documentCounts.pending || 0) > 0 || (documentCounts.under_review || 0) > 0;
        const isKYCApproved = overallStatus === 'approved';
        const canSubmitDocuments = !hasApprovedDocs && !hasPendingDocs && !isKYCApproved;
        return {
            status: overallStatus,
            verification: verificationResult.rows[0] || null,
            verification_level: verificationLevel,
            is_verified: ((_b = profileResult.rows[0]) === null || _b === void 0 ? void 0 : _b.is_verified) || false,
            reason: ((_c = verificationResult.rows[0]) === null || _c === void 0 ? void 0 : _c.reason) || null,
            documents_required: requiredDocuments,
            documents_approved: approvedDocumentTypes,
            documents_pending: pendingDocumentTypes,
            documents_rejected: rejectedDocumentTypes,
            documents_count: {
                pending: documentCounts.pending || 0,
                approved: documentCounts.approved || 0,
                rejected: documentCounts.rejected || 0,
                under_review: documentCounts.under_review || 0
            },
            can_submit_documents: canSubmitDocuments
        };
    }
    finally {
        client.release();
    }
};
exports.getKYCStatusService = getKYCStatusService;
/**
 * Get all KYC documents for a user
 */
const getKYCDocumentsService = async (userId) => {
    const query = `
    SELECT
      id,
      document_type,
      file_name,
      file_url,
      file_size,
      mime_type,
      description,
      status,
      reason,
      admin_notes,
      verification_method,
      verified_by,
      verification_date,
      created_at,
      updated_at
    FROM kyc_documents
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;
    const result = await postgres_1.default.query(query, [userId]);
    return result.rows;
};
exports.getKYCDocumentsService = getKYCDocumentsService;
/**
 * Upload a new KYC document
 * Enforces single document submission: user can only have ONE active document at a time
 * Can only submit if: no documents exist OR status is rejected/not_submitted
 */
const uploadKYCDocumentService = async (userId, documentData) => {
    const client = await postgres_1.default.connect();
    try {
        await client.query('BEGIN');
        // Check if user can submit a document
        // User cannot submit if they have an approved document or a pending document
        const checkSubmissionQuery = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'under_review') as under_review_count
      FROM kyc_documents
      WHERE user_id = $1
    `;
        const checkResult = await client.query(checkSubmissionQuery, [userId]);
        const { approved_count, pending_count, under_review_count } = checkResult.rows[0];
        if (parseInt(approved_count) > 0) {
            throw new Error('Your KYC is already approved. You cannot submit additional documents.');
        }
        if (parseInt(pending_count) > 0 || parseInt(under_review_count) > 0) {
            throw new Error('You already have a document pending review. Please wait for admin to review your current submission.');
        }
        // Check KYC verification status - if approved, don't allow new submissions
        const kycStatusQuery = `
      SELECT status FROM kyc_verifications WHERE user_id = $1
    `;
        const kycStatusResult = await client.query(kycStatusQuery, [userId]);
        if (kycStatusResult.rows.length > 0 && kycStatusResult.rows[0].status === 'approved') {
            throw new Error('Your KYC verification is already approved.');
        }
        // Insert document record
        const insertQuery = `
      INSERT INTO kyc_documents (
        user_id,
        document_type,
        file_name,
        file_url,
        file_size,
        mime_type,
        description,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
        const result = await client.query(insertQuery, [
            userId,
            documentData.document_type,
            documentData.file_name,
            documentData.file_url,
            documentData.file_size,
            documentData.mime_type,
            documentData.description || null,
            'pending'
        ]);
        // Update or create KYC verification record
        const upsertVerificationQuery = `
      INSERT INTO kyc_verifications (user_id, status, risk_score, compliance_level)
      VALUES ($1, 'pending', 0, 'low')
      ON CONFLICT (user_id)
      DO UPDATE SET
        status = 'pending',
        reason = NULL,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
        await client.query(upsertVerificationQuery, [userId]);
        // Update user's KYC status to pending
        const updateUserQuery = `
      UPDATE users
      SET kyc_status = 'pending'
      WHERE id = $1
    `;
        await client.query(updateUserQuery, [userId]);
        // Log the action
        const logQuery = `
      INSERT INTO kyc_audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        new_values,
        ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;
        await client.query(logQuery, [
            userId,
            'document_uploaded',
            'document',
            result.rows[0].id,
            JSON.stringify(result.rows[0]),
            null
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
};
exports.uploadKYCDocumentService = uploadKYCDocumentService;
/**
 * Delete a KYC document
 */
const deleteKYCDocumentService = async (userId, documentId) => {
    const client = await postgres_1.default.connect();
    try {
        await client.query('BEGIN');
        // Get document details
        const getDocQuery = `
      SELECT * FROM kyc_documents
      WHERE id = $1 AND user_id = $2
    `;
        const docResult = await client.query(getDocQuery, [documentId, userId]);
        if (docResult.rows.length === 0) {
            throw new Error('Document not found or does not belong to user');
        }
        const document = docResult.rows[0];
        // Check if document is approved
        if (document.status === 'approved') {
            throw new Error('Cannot delete approved documents');
        }
        // Delete file from filesystem (only if it's a local file, not CDN)
        if (!(0, cdn_storage_util_1.isCDNUrl)(document.file_url)) {
            const filePath = path.join(process.cwd(), document.file_url);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Deleted local file: ${filePath}`);
            }
        }
        else {
            console.log(`File is on CDN, skipping local deletion: ${document.file_url}`);
            // Note: CDN files are not deleted to maintain audit trail
            // Admin can manage CDN storage separately if needed
        }
        // Delete database record
        const deleteQuery = `
      DELETE FROM kyc_documents
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
        const deleteResult = await client.query(deleteQuery, [documentId, userId]);
        // Log the action
        const logQuery = `
      INSERT INTO kyc_audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        old_values
      ) VALUES ($1, $2, $3, $4, $5)
    `;
        await client.query(logQuery, [
            userId,
            'document_deleted',
            'document',
            documentId,
            JSON.stringify(document)
        ]);
        await client.query('COMMIT');
        return deleteResult.rows[0];
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
};
exports.deleteKYCDocumentService = deleteKYCDocumentService;
/**
 * Get KYC requirements for a verification level
 */
const getKYCRequirementsService = (level) => {
    const requirements = [
        {
            level: 0,
            name: 'Unverified',
            description: 'No verification required',
            required_documents: [],
            withdrawal_limits: {
                daily: 0,
                weekly: 0,
                monthly: 0
            },
            deposit_limits: {
                daily: 1000,
                weekly: 5000,
                monthly: 20000
            },
            features: ['Limited deposits', 'No withdrawals']
        },
        {
            level: 1,
            name: 'Basic Verification',
            description: 'Basic identity verification with government-issued ID',
            required_documents: [
                {
                    type: 'national_id',
                    label: 'National ID',
                    description: 'Government-issued national ID card (front and back)'
                },
                {
                    type: 'passport',
                    label: 'Passport',
                    description: 'Valid passport (photo page)',
                    alternative_to: 'national_id'
                },
                {
                    type: 'drivers_license',
                    label: 'Driver\'s License',
                    description: 'Valid driver\'s license (front and back)',
                    alternative_to: 'national_id'
                },
                {
                    type: 'selfie',
                    label: 'Selfie with ID',
                    description: 'Clear selfie holding your ID document'
                }
            ],
            withdrawal_limits: {
                daily: 1000,
                weekly: 5000,
                monthly: 20000
            },
            deposit_limits: {
                daily: 5000,
                weekly: 25000,
                monthly: 100000
            },
            features: ['Basic deposits', 'Basic withdrawals', 'Email support']
        },
        {
            level: 2,
            name: 'Full Verification',
            description: 'Complete verification with proof of address and source of funds',
            required_documents: [
                {
                    type: 'national_id',
                    label: 'National ID',
                    description: 'Government-issued national ID card (front and back)'
                },
                {
                    type: 'selfie',
                    label: 'Selfie with ID',
                    description: 'Clear selfie holding your ID document'
                },
                {
                    type: 'proof_of_address',
                    label: 'Proof of Address',
                    description: 'Utility bill, bank statement, or government letter (less than 3 months old)'
                },
                {
                    type: 'utility_bill',
                    label: 'Utility Bill',
                    description: 'Recent utility bill (electricity, water, gas) in your name',
                    alternative_to: 'proof_of_address'
                },
                {
                    type: 'bank_statement',
                    label: 'Bank Statement',
                    description: 'Recent bank statement showing your name and address',
                    alternative_to: 'proof_of_address'
                }
            ],
            withdrawal_limits: {
                daily: 10000,
                weekly: 50000,
                monthly: 200000
            },
            deposit_limits: {
                daily: 50000,
                weekly: 250000,
                monthly: 1000000
            },
            features: [
                'Unlimited deposits',
                'High withdrawal limits',
                'Priority support',
                'VIP benefits',
                'Faster withdrawal processing'
            ]
        }
    ];
    const requirement = requirements.find(r => r.level === level);
    if (!requirement) {
        throw new Error(`Invalid verification level: ${level}`);
    }
    return requirement;
};
exports.getKYCRequirementsService = getKYCRequirementsService;
/**
 * Helper function to get required documents for a level
 */
const getRequiredDocumentsForLevel = (level) => {
    const requirements = (0, exports.getKYCRequirementsService)(level);
    return requirements.required_documents.map((doc) => doc.type);
};
