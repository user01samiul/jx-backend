import { Request, Response } from "express";
import { AdminKYCService } from "../../services/admin/kyc.service";
import {
  KYCVerificationInput,
  KYCFiltersInput,
  KYCDocumentVerificationInput,
  KYCRiskAssessmentInput,
  KYCComplianceReportInput
} from "./admin.kyc.schema";
import { ActivityLoggerService } from "../../services/activity/activity-logger.service";

// Get pending KYC requests
export const getPendingKYC = async (req: Request, res: Response) => {
  try {
    const filters: KYCFiltersInput = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      search: req.query.search as string,
      status: req.query.status as any,
      document_type: req.query.document_type as any,
      user_id: req.query.user_id ? parseInt(req.query.user_id as string) : undefined,
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string,
      compliance_level: req.query.compliance_level as any,
      risk_score_min: req.query.risk_score_min ? parseInt(req.query.risk_score_min as string) : undefined,
      risk_score_max: req.query.risk_score_max ? parseInt(req.query.risk_score_max as string) : undefined
    };
    
    const result = await AdminKYCService.getPendingKYC(filters);
    
    res.status(200).json({
      success: true,
      data: result.kyc_requests,
      pagination: result.pagination
    });
  } catch (error: any) {
    console.error("Error fetching pending KYC:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch pending KYC requests"
    });
  }
};

// Get KYC by user ID
export const getKYCByUserId = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.user_id);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }
    
    const kyc = await AdminKYCService.getKYCByUserId(userId);
    
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
  } catch (error: any) {
    console.error("Error fetching KYC by user ID:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch KYC verification"
    });
  }
};

// Approve KYC
export const approveKYC = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.user_id);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    const data: KYCVerificationInput = {
      user_id: userId,
      status: 'approved',
      reason: req.body.reason,
      admin_notes: req.body.admin_notes,
      verification_date: req.body.verification_date,
      expiry_date: req.body.expiry_date,
      risk_score: req.body.risk_score,
      compliance_level: req.body.compliance_level
    };

    const kyc = await AdminKYCService.approveKYC(userId, data);

    // Log activity
    await ActivityLoggerService.logKYCApproved(
      req,
      userId,
      'identity_document'
    );

    // Grant KYC Free Spins Campaign
    try {
      const { grantKYCCampaign } = require('../../services/campaign/kyc-freespins.service');
      const campaign = await grantKYCCampaign(userId);
      console.log(`[KYC Approval] Free spins campaign granted to user_id: ${userId}`, {
        campaign_id: campaign.id,
        spins_total: campaign.spins_total,
        expires_at: campaign.expires_at
      });
    } catch (campaignError: any) {
      // Don't fail KYC approval if campaign grant fails
      console.error(`[KYC Approval] Failed to grant free spins campaign to user_id: ${userId}:`, campaignError.message);
      // Continue with KYC approval - campaign can be granted manually if needed
    }

    res.status(200).json({
      success: true,
      message: "KYC approved successfully",
      data: kyc
    });
  } catch (error: any) {
    console.error("Error approving KYC:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to approve KYC"
    });
  }
};

// Reject KYC
export const rejectKYC = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.user_id);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    const data: KYCVerificationInput = {
      user_id: userId,
      status: 'rejected',
      reason: req.body.reason,
      admin_notes: req.body.admin_notes,
      verification_date: req.body.verification_date
    };

    const kyc = await AdminKYCService.rejectKYC(userId, data);

    // Log activity
    await ActivityLoggerService.logKYCRejected(
      req,
      userId,
      'identity_document',
      data.reason || 'KYC verification failed'
    );

    res.status(200).json({
      success: true,
      message: "KYC rejected successfully",
      data: kyc
    });
  } catch (error: any) {
    console.error("Error rejecting KYC:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to reject KYC"
    });
  }
};

// Get KYC documents
export const getKYCDocuments = async (req: Request, res: Response) => {
  try {
    const userId = req.query.user_id ? parseInt(req.query.user_id as string) : undefined;
    
    if (userId && isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }
    
    const filters: KYCFiltersInput = {
      document_type: req.query.document_type as any,
      status: req.query.status as any,
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string
    };
    
    const documents = await AdminKYCService.getKYCDocuments(userId, filters);
    
    res.status(200).json({
      success: true,
      data: documents
    });
  } catch (error: any) {
    console.error("Error fetching KYC documents:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch KYC documents"
    });
  }
};

// Verify KYC document
export const verifyKYCDocument = async (req: Request, res: Response) => {
  try {
    const data: KYCDocumentVerificationInput = {
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

    const document = await AdminKYCService.verifyKYCDocument(data);

    // Log activity using generic method
    await ActivityLoggerService.logGenericAction(
      req,
      'kyc_document_verified',
      {
        document_id: data.document_id,
        status: data.status,
        reason: data.reason || `Document ${data.status}`
      },
      'KYC'
    );

    res.status(200).json({
      success: true,
      message: `Document ${data.status} successfully`,
      data: document
    });
  } catch (error: any) {
    console.error("Error verifying KYC document:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to verify KYC document"
    });
  }
};

// Create risk assessment
export const createRiskAssessment = async (req: Request, res: Response) => {
  try {
    const data: KYCRiskAssessmentInput = {
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
    
    const assessment = await AdminKYCService.createRiskAssessment(data);
    
    res.status(201).json({
      success: true,
      message: "Risk assessment created successfully",
      data: assessment
    });
  } catch (error: any) {
    console.error("Error creating risk assessment:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create risk assessment"
    });
  }
};

// Get KYC reports
export const getKYCReports = async (req: Request, res: Response) => {
  try {
    const filters: KYCComplianceReportInput = {
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string,
      report_type: (req.query.report_type as any) || 'monthly',
      include_details: req.query.include_details === 'true',
      format: (req.query.format as any) || 'json'
    };
    
    if (!filters.start_date || !filters.end_date) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required"
      });
    }
    
    const reports = await AdminKYCService.getKYCReports(filters);
    
    res.status(200).json({
      success: true,
      data: reports
    });
  } catch (error: any) {
    console.error("Error fetching KYC reports:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch KYC reports"
    });
  }
};

// Get KYC audit logs
export const getKYCAuditLogs = async (req: Request, res: Response) => {
  try {
    const userId = req.query.user_id ? parseInt(req.query.user_id as string) : undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    if (userId && isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }
    
    const result = await AdminKYCService.getKYCAuditLogs(userId, page, limit);
    
    res.status(200).json({
      success: true,
      data: result.audit_logs,
      pagination: result.pagination
    });
  } catch (error: any) {
    console.error("Error fetching KYC audit logs:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch KYC audit logs"
    });
  }
}; 