"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KYCComplianceReportSchema = exports.KYCRiskAssessmentBodySchema = exports.KYCRiskAssessmentSchema = exports.KYCDocumentVerificationSchema = exports.KYCFiltersSchema = exports.KYCUserIdParamSchema = exports.KYCRejectSchema = exports.KYCApproveSchema = exports.KYCVerificationSchema = exports.UpdateKYCDocumentSchema = exports.CreateKYCDocumentSchema = exports.KYC_STATUS_TYPES = exports.KYC_DOCUMENT_TYPES = void 0;
const zod_1 = require("zod");
// KYC Document Types
exports.KYC_DOCUMENT_TYPES = [
    "passport",
    "national_id",
    "drivers_license",
    "utility_bill",
    "bank_statement",
    "selfie",
    "proof_of_address",
    "proof_of_income",
    "tax_document",
    "other"
];
// KYC Status Types
exports.KYC_STATUS_TYPES = [
    "pending",
    "approved",
    "rejected",
    "under_review",
    "expired",
    "cancelled"
];
// Create KYC Document Schema
exports.CreateKYCDocumentSchema = zod_1.z.object({
    user_id: zod_1.z.number().int().positive(),
    document_type: zod_1.z.enum(exports.KYC_DOCUMENT_TYPES),
    file_url: zod_1.z.string().url(),
    file_name: zod_1.z.string().min(1, "File name is required"),
    file_size: zod_1.z.number().positive(),
    mime_type: zod_1.z.string().min(1, "MIME type is required"),
    description: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
// Update KYC Document Schema
exports.UpdateKYCDocumentSchema = exports.CreateKYCDocumentSchema.partial().extend({
    id: zod_1.z.number().int().positive()
});
// KYC Verification Schema
exports.KYCVerificationSchema = zod_1.z.object({
    user_id: zod_1.z.number().int().positive(),
    status: zod_1.z.enum(exports.KYC_STATUS_TYPES),
    reason: zod_1.z.string().optional(),
    admin_notes: zod_1.z.string().optional(),
    verification_date: zod_1.z.string().datetime().optional(),
    expiry_date: zod_1.z.string().datetime().optional(),
    risk_score: zod_1.z.number().min(0).max(100).optional(),
    compliance_level: zod_1.z.enum(["low", "medium", "high"]).optional()
});
// KYC Approve Schema (user_id comes from URL params)
exports.KYCApproveSchema = zod_1.z.object({
    admin_notes: zod_1.z.string().optional(),
    expiry_date: zod_1.z.string().datetime().optional(),
    risk_score: zod_1.z.number().min(0).max(100).optional(),
    compliance_level: zod_1.z.enum(["low", "medium", "high"]).optional()
});
// KYC Reject Schema (user_id comes from URL params)
exports.KYCRejectSchema = zod_1.z.object({
    reason: zod_1.z.string().min(1, "Rejection reason is required"),
    admin_notes: zod_1.z.string().optional()
});
// KYC User ID Param Schema
exports.KYCUserIdParamSchema = zod_1.z.object({
    user_id: zod_1.z.coerce.number().int().positive()
});
// KYC Filters Schema
exports.KYCFiltersSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    search: zod_1.z.string().optional(),
    status: zod_1.z.enum(exports.KYC_STATUS_TYPES).optional(),
    document_type: zod_1.z.enum(exports.KYC_DOCUMENT_TYPES).optional(),
    user_id: zod_1.z.coerce.number().int().positive().optional(),
    start_date: zod_1.z.string().datetime().optional(),
    end_date: zod_1.z.string().datetime().optional(),
    compliance_level: zod_1.z.enum(["low", "medium", "high"]).optional(),
    risk_score_min: zod_1.z.coerce.number().min(0).max(100).optional(),
    risk_score_max: zod_1.z.coerce.number().min(0).max(100).optional()
});
// KYC Document Verification Schema
exports.KYCDocumentVerificationSchema = zod_1.z.object({
    document_id: zod_1.z.number().int().positive(),
    status: zod_1.z.enum(exports.KYC_STATUS_TYPES),
    reason: zod_1.z.string().optional(),
    admin_notes: zod_1.z.string().optional(),
    verification_method: zod_1.z.enum(["manual", "automated", "third_party"]).optional(),
    verified_by: zod_1.z.string().optional(),
    verification_date: zod_1.z.string().datetime().optional()
});
// KYC Risk Assessment Schema (when user_id is in body)
exports.KYCRiskAssessmentSchema = zod_1.z.object({
    user_id: zod_1.z.number().int().positive(),
    risk_factors: zod_1.z.array(zod_1.z.string()).optional(),
    risk_score: zod_1.z.number().min(0).max(100),
    risk_level: zod_1.z.enum(["low", "medium", "high", "critical"]),
    assessment_notes: zod_1.z.string().optional(),
    recommended_actions: zod_1.z.array(zod_1.z.string()).optional(),
    assessment_date: zod_1.z.string().datetime().optional()
});
// KYC Risk Assessment Body Schema (when user_id is in URL params)
exports.KYCRiskAssessmentBodySchema = zod_1.z.object({
    risk_factors: zod_1.z.array(zod_1.z.string()).optional(),
    risk_score: zod_1.z.number().min(0).max(100),
    risk_level: zod_1.z.enum(["low", "medium", "high", "critical"]),
    assessment_notes: zod_1.z.string().optional(),
    recommended_actions: zod_1.z.array(zod_1.z.string()).optional(),
    assessment_date: zod_1.z.string().datetime().optional()
});
// KYC Compliance Report Schema
exports.KYCComplianceReportSchema = zod_1.z.object({
    start_date: zod_1.z.string().datetime(),
    end_date: zod_1.z.string().datetime(),
    report_type: zod_1.z.enum(["daily", "weekly", "monthly", "quarterly", "annual"]),
    include_details: zod_1.z.boolean().default(false),
    format: zod_1.z.enum(["json", "csv", "pdf"]).default("json")
});
