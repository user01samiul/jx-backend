"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKYCAuditLogs = exports.getKYCReports = exports.createRiskAssessment = exports.verifyKYCDocument = exports.getKYCDocuments = exports.rejectKYC = exports.approveKYC = exports.getKYCByUserId = exports.getPendingKYC = void 0;
const kyc_service_1 = require("../../services/admin/kyc.service");
const activity_logger_service_1 = require("../../services/activity/activity-logger.service");
// Get pending KYC requests
const getPendingKYC = async (req, res) => {
    try {
        const filters = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            search: req.query.search,
            status: req.query.status,
            document_type: req.query.document_type,
            user_id: req.query.user_id ? parseInt(req.query.user_id) : undefined,
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            compliance_level: req.query.compliance_level,
            risk_score_min: req.query.risk_score_min ? parseInt(req.query.risk_score_min) : undefined,
            risk_score_max: req.query.risk_score_max ? parseInt(req.query.risk_score_max) : undefined
        };
        const result = await kyc_service_1.AdminKYCService.getPendingKYC(filters);
        res.status(200).json({
            success: true,
            data: result.kyc_requests,
            pagination: result.pagination
        });
    }
    catch (error) {
        console.error("Error fetching pending KYC:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch pending KYC requests"
        });
    }
};
exports.getPendingKYC = getPendingKYC;
// Get KYC by user ID
const getKYCByUserId = async (req, res) => {
    try {
        const userId = parseInt(req.params.user_id);
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }
        const kyc = await kyc_service_1.AdminKYCService.getKYCByUserId(userId);
        if (!kyc) {
            return res.status(404).json({
                success: false,
                message: "KYC verification not found for this user"
            });
        }
        res.status(200).json({
            success: true,
            data: kyc
        });
    }
    catch (error) {
        console.error("Error fetching KYC by user ID:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch KYC verification"
        });
    }
};
exports.getKYCByUserId = getKYCByUserId;
// Approve KYC
const approveKYC = async (req, res) => {
    try {
        const userId = parseInt(req.params.user_id);
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }
        const data = {
            user_id: userId,
            status: 'approved',
            reason: req.body.reason,
            admin_notes: req.body.admin_notes,
            verification_date: req.body.verification_date,
            expiry_date: req.body.expiry_date,
            risk_score: req.body.risk_score,
            compliance_level: req.body.compliance_level
        };
        const kyc = await kyc_service_1.AdminKYCService.approveKYC(userId, data);
        // Log activity
        await activity_logger_service_1.ActivityLoggerService.logKYCApproved(req, userId, 'identity_document');
        // Grant KYC Free Spins Campaign
        try {
            const { grantKYCCampaign } = require('../../services/campaign/kyc-freespins.service');
            const campaign = await grantKYCCampaign(userId);
            console.log(`[KYC Approval] Free spins campaign granted to user_id: ${userId}`, {
                campaign_id: campaign.id,
                spins_total: campaign.spins_total,
                expires_at: campaign.expires_at
            });
        }
        catch (campaignError) {
            // Don't fail KYC approval if campaign grant fails
            console.error(`[KYC Approval] Failed to grant free spins campaign to user_id: ${userId}:`, campaignError.message);
            // Continue with KYC approval - campaign can be granted manually if needed
        }
        res.status(200).json({
            success: true,
            message: "KYC approved successfully",
            data: kyc
        });
    }
    catch (error) {
        console.error("Error approving KYC:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to approve KYC"
        });
    }
};
exports.approveKYC = approveKYC;
// Reject KYC
const rejectKYC = async (req, res) => {
    try {
        const userId = parseInt(req.params.user_id);
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }
        const data = {
            user_id: userId,
            status: 'rejected',
            reason: req.body.reason,
            admin_notes: req.body.admin_notes,
            verification_date: req.body.verification_date
        };
        const kyc = await kyc_service_1.AdminKYCService.rejectKYC(userId, data);
        // Log activity
        await activity_logger_service_1.ActivityLoggerService.logKYCRejected(req, userId, 'identity_document', data.reason || 'KYC verification failed');
        res.status(200).json({
            success: true,
            message: "KYC rejected successfully",
            data: kyc
        });
    }
    catch (error) {
        console.error("Error rejecting KYC:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to reject KYC"
        });
    }
};
exports.rejectKYC = rejectKYC;
// Get KYC documents
const getKYCDocuments = async (req, res) => {
    try {
        const userId = req.query.user_id ? parseInt(req.query.user_id) : undefined;
        if (userId && isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }
        const filters = {
            document_type: req.query.document_type,
            status: req.query.status,
            start_date: req.query.start_date,
            end_date: req.query.end_date
        };
        const documents = await kyc_service_1.AdminKYCService.getKYCDocuments(userId, filters);
        res.status(200).json({
            success: true,
            data: documents
        });
    }
    catch (error) {
        console.error("Error fetching KYC documents:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch KYC documents"
        });
    }
};
exports.getKYCDocuments = getKYCDocuments;
// Verify KYC document
const verifyKYCDocument = async (req, res) => {
    try {
        const data = {
            document_id: parseInt(req.params.document_id),
            status: req.body.status,
            reason: req.body.reason,
            admin_notes: req.body.admin_notes,
            verification_method: req.body.verification_method,
            verified_by: req.body.verified_by,
            verification_date: req.body.verification_date
        };
        if (isNaN(data.document_id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid document ID"
            });
        }
        const document = await kyc_service_1.AdminKYCService.verifyKYCDocument(data);
        // Log activity using generic method
        await activity_logger_service_1.ActivityLoggerService.logGenericAction(req, 'kyc_document_verified', {
            document_id: data.document_id,
            status: data.status,
            reason: data.reason || `Document ${data.status}`
        }, 'KYC');
        res.status(200).json({
            success: true,
            message: `Document ${data.status} successfully`,
            data: document
        });
    }
    catch (error) {
        console.error("Error verifying KYC document:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to verify KYC document"
        });
    }
};
exports.verifyKYCDocument = verifyKYCDocument;
// Create risk assessment
const createRiskAssessment = async (req, res) => {
    try {
        const data = {
            user_id: parseInt(req.params.user_id),
            risk_factors: req.body.risk_factors,
            risk_score: req.body.risk_score,
            risk_level: req.body.risk_level,
            assessment_notes: req.body.assessment_notes,
            recommended_actions: req.body.recommended_actions,
            assessment_date: req.body.assessment_date
        };
        if (isNaN(data.user_id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }
        const assessment = await kyc_service_1.AdminKYCService.createRiskAssessment(data);
        res.status(201).json({
            success: true,
            message: "Risk assessment created successfully",
            data: assessment
        });
    }
    catch (error) {
        console.error("Error creating risk assessment:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to create risk assessment"
        });
    }
};
exports.createRiskAssessment = createRiskAssessment;
// Get KYC reports
const getKYCReports = async (req, res) => {
    try {
        const filters = {
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            report_type: req.query.report_type || 'monthly',
            include_details: req.query.include_details === 'true',
            format: req.query.format || 'json'
        };
        if (!filters.start_date || !filters.end_date) {
            return res.status(400).json({
                success: false,
                message: "Start date and end date are required"
            });
        }
        const reports = await kyc_service_1.AdminKYCService.getKYCReports(filters);
        res.status(200).json({
            success: true,
            data: reports
        });
    }
    catch (error) {
        console.error("Error fetching KYC reports:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch KYC reports"
        });
    }
};
exports.getKYCReports = getKYCReports;
// Get KYC audit logs
const getKYCAuditLogs = async (req, res) => {
    try {
        const userId = req.query.user_id ? parseInt(req.query.user_id) : undefined;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        if (userId && isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }
        const result = await kyc_service_1.AdminKYCService.getKYCAuditLogs(userId, page, limit);
        res.status(200).json({
            success: true,
            data: result.audit_logs,
            pagination: result.pagination
        });
    }
    catch (error) {
        console.error("Error fetching KYC audit logs:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch KYC audit logs"
        });
    }
};
exports.getKYCAuditLogs = getKYCAuditLogs;
