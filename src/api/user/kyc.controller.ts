// src/api/user/kyc.controller.ts
import { Request, Response, NextFunction } from "express";
import {
  getKYCStatusService,
  getKYCDocumentsService,
  uploadKYCDocumentService,
  deleteKYCDocumentService,
  getKYCRequirementsService
} from "../../services/user/kyc.service";

/**
 * Get current user's KYC verification status
 */
export const getKYCStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const status = await getKYCStatusService(userId);
    res.status(200).json({ success: true, data: status });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all documents uploaded by current user
 */
export const getKYCDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const documents = await getKYCDocumentsService(userId);
    res.status(200).json({ success: true, data: documents });
  } catch (err) {
    next(err);
  }
};

/**
 * Upload a new KYC document
 */
export const uploadKYCDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    // Check if file was uploaded
    if (!req.file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
      return;
    }

    const { document_type, description } = req.body;

    // Validate document type
    const validTypes = [
      'passport',
      'national_id',
      'drivers_license',
      'utility_bill',
      'bank_statement',
      'selfie',
      'proof_of_address',
      'proof_of_income',
      'tax_document',
      'other'
    ];

    if (!document_type || !validTypes.includes(document_type)) {
      res.status(400).json({
        success: false,
        message: "Invalid document_type. Must be one of: " + validTypes.join(', ')
      });
      return;
    }

    // Prepare document data
    const documentData = {
      document_type,
      file_name: req.file.filename,
      file_url: `/uploads/kyc/${req.file.filename}`,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      description
    };

    const document = await uploadKYCDocumentService(userId, documentData);
    res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      data: document
    });
  } catch (err) {
    // If there's an error and a file was uploaded, delete it
    if (req.file) {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'uploads', 'kyc', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    next(err);
  }
};

/**
 * Delete a document (only if not approved)
 */
export const deleteKYCDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const documentId = parseInt(req.params.id);

    if (isNaN(documentId)) {
      res.status(400).json({ success: false, message: "Invalid document ID" });
      return;
    }

    await deleteKYCDocumentService(userId, documentId);
    res.status(200).json({
      success: true,
      message: "Document deleted successfully"
    });
  } catch (err: any) {
    if (err.message === 'Document not found or does not belong to user') {
      res.status(404).json({ success: false, message: err.message });
      return;
    }
    if (err.message === 'Cannot delete approved documents') {
      res.status(403).json({ success: false, message: err.message });
      return;
    }
    next(err);
  }
};

/**
 * Get KYC requirements for a verification level
 */
export const getKYCRequirements = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const level = parseInt(req.params.level);

    if (isNaN(level) || level < 0 || level > 2) {
      res.status(400).json({
        success: false,
        message: "Invalid level. Must be 0, 1, or 2"
      });
      return;
    }

    const requirements = getKYCRequirementsService(level);
    res.status(200).json({ success: true, data: requirements });
  } catch (err) {
    next(err);
  }
};
