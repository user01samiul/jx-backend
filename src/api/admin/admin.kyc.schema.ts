import { z } from "zod";

// KYC Document Types
export const KYC_DOCUMENT_TYPES = [
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
] as const;

// KYC Status Types
export const KYC_STATUS_TYPES = [
  "pending",
  "approved",
  "rejected",
  "under_review",
  "expired",
  "cancelled"
] as const;

// Create KYC Document Schema
export const CreateKYCDocumentSchema = z.object({
  user_id: z.number().int().positive(),
  document_type: z.enum(KYC_DOCUMENT_TYPES),
  file_url: z.string().url(),
  file_name: z.string().min(1, "File name is required"),
  file_size: z.number().positive(),
  mime_type: z.string().min(1, "MIME type is required"),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

// Update KYC Document Schema
export const UpdateKYCDocumentSchema = CreateKYCDocumentSchema.partial().extend({
  id: z.number().int().positive()
});

// KYC Verification Schema
export const KYCVerificationSchema = z.object({
  user_id: z.number().int().positive(),
  status: z.enum(KYC_STATUS_TYPES),
  reason: z.string().optional(),
  admin_notes: z.string().optional(),
  verification_date: z.string().datetime().optional(),
  expiry_date: z.string().datetime().optional(),
  risk_score: z.number().min(0).max(100).optional(),
  compliance_level: z.enum(["low", "medium", "high"]).optional()
});

// KYC Approve Schema (user_id comes from URL params)
export const KYCApproveSchema = z.object({
  admin_notes: z.string().optional(),
  expiry_date: z.string().datetime().optional(),
  risk_score: z.number().min(0).max(100).optional(),
  compliance_level: z.enum(["low", "medium", "high"]).optional()
});

// KYC Reject Schema (user_id comes from URL params)
export const KYCRejectSchema = z.object({
  reason: z.string().min(1, "Rejection reason is required"),
  admin_notes: z.string().optional()
});

// KYC User ID Param Schema
export const KYCUserIdParamSchema = z.object({
  user_id: z.coerce.number().int().positive()
});

// KYC Filters Schema
export const KYCFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(KYC_STATUS_TYPES).optional(),
  document_type: z.enum(KYC_DOCUMENT_TYPES).optional(),
  user_id: z.coerce.number().int().positive().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  compliance_level: z.enum(["low", "medium", "high"]).optional(),
  risk_score_min: z.coerce.number().min(0).max(100).optional(),
  risk_score_max: z.coerce.number().min(0).max(100).optional()
});

// KYC Document Verification Schema
export const KYCDocumentVerificationSchema = z.object({
  document_id: z.number().int().positive(),
  status: z.enum(KYC_STATUS_TYPES),
  reason: z.string().optional(),
  admin_notes: z.string().optional(),
  verification_method: z.enum(["manual", "automated", "third_party"]).optional(),
  verified_by: z.string().optional(),
  verification_date: z.string().datetime().optional()
});

// KYC Risk Assessment Schema (when user_id is in body)
export const KYCRiskAssessmentSchema = z.object({
  user_id: z.number().int().positive(),
  risk_factors: z.array(z.string()).optional(),
  risk_score: z.number().min(0).max(100),
  risk_level: z.enum(["low", "medium", "high", "critical"]),
  assessment_notes: z.string().optional(),
  recommended_actions: z.array(z.string()).optional(),
  assessment_date: z.string().datetime().optional()
});

// KYC Risk Assessment Body Schema (when user_id is in URL params)
export const KYCRiskAssessmentBodySchema = z.object({
  risk_factors: z.array(z.string()).optional(),
  risk_score: z.number().min(0).max(100),
  risk_level: z.enum(["low", "medium", "high", "critical"]),
  assessment_notes: z.string().optional(),
  recommended_actions: z.array(z.string()).optional(),
  assessment_date: z.string().datetime().optional()
});

// KYC Compliance Report Schema
export const KYCComplianceReportSchema = z.object({
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  report_type: z.enum(["daily", "weekly", "monthly", "quarterly", "annual"]),
  include_details: z.boolean().default(false),
  format: z.enum(["json", "csv", "pdf"]).default("json")
});

// Export types
export type CreateKYCDocumentInput = z.infer<typeof CreateKYCDocumentSchema>;
export type UpdateKYCDocumentInput = z.infer<typeof UpdateKYCDocumentSchema>;
export type KYCVerificationInput = z.infer<typeof KYCVerificationSchema>;
export type KYCApproveInput = z.infer<typeof KYCApproveSchema>;
export type KYCRejectInput = z.infer<typeof KYCRejectSchema>;
export type KYCUserIdParamInput = z.infer<typeof KYCUserIdParamSchema>;
export type KYCFiltersInput = z.infer<typeof KYCFiltersSchema>;
export type KYCDocumentVerificationInput = z.infer<typeof KYCDocumentVerificationSchema>;
export type KYCRiskAssessmentInput = z.infer<typeof KYCRiskAssessmentSchema>;
export type KYCComplianceReportInput = z.infer<typeof KYCComplianceReportSchema>; 