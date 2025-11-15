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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKYCRequirements = exports.deleteKYCDocument = exports.uploadKYCDocument = exports.getKYCDocuments = exports.getKYCStatus = void 0;
const kyc_service_1 = require("../../services/user/kyc.service");
const cdn_storage_util_1 = require("../../utils/cdn-storage.util");
const path = __importStar(require("path"));
/**
 * Get current user's KYC verification status
 */
const getKYCStatus = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const status = await (0, kyc_service_1.getKYCStatusService)(userId);
        res.status(200).json({ success: true, data: status });
    }
    catch (err) {
        next(err);
    }
};
exports.getKYCStatus = getKYCStatus;
/**
 * Get all documents uploaded by current user
 */
const getKYCDocuments = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const documents = await (0, kyc_service_1.getKYCDocumentsService)(userId);
        res.status(200).json({ success: true, data: documents });
    }
    catch (err) {
        next(err);
    }
};
exports.getKYCDocuments = getKYCDocuments;
/**
 * Upload a new KYC document
 */
const uploadKYCDocument = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
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
        // Upload to CDN storage
        let cdnUrl;
        const localFilePath = path.join(process.cwd(), 'uploads', 'kyc', req.file.filename);
        try {
            cdnUrl = await (0, cdn_storage_util_1.uploadAndCleanup)(localFilePath, req.file.filename);
            console.log(`✓ KYC document uploaded to CDN: ${cdnUrl}`);
        }
        catch (cdnError) {
            console.error('✗ CDN upload failed:', cdnError.message);
            // Fallback to local storage if CDN upload fails
            // This ensures the user's upload is not blocked by CDN issues
            cdnUrl = `/uploads/kyc/${req.file.filename}`;
            console.log(`→ Using local storage as fallback: ${cdnUrl}`);
        }
        // Prepare document data
        const documentData = {
            document_type,
            file_name: req.file.filename,
            file_url: cdnUrl,
            file_size: req.file.size,
            mime_type: req.file.mimetype,
            description
        };
        const document = await (0, kyc_service_1.uploadKYCDocumentService)(userId, documentData);
        res.status(201).json({
            success: true,
            message: "Document uploaded successfully",
            data: document
        });
    }
    catch (err) {
        // If there's an error and a file was uploaded, delete it
        if (req.file) {
            const fs = require('fs');
            const filePath = path.join(process.cwd(), 'uploads', 'kyc', req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        next(err);
    }
};
exports.uploadKYCDocument = uploadKYCDocument;
/**
 * Delete a document (only if not approved)
 */
const deleteKYCDocument = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const documentId = parseInt(req.params.id);
        if (isNaN(documentId)) {
            res.status(400).json({ success: false, message: "Invalid document ID" });
            return;
        }
        await (0, kyc_service_1.deleteKYCDocumentService)(userId, documentId);
        res.status(200).json({
            success: true,
            message: "Document deleted successfully"
        });
    }
    catch (err) {
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
exports.deleteKYCDocument = deleteKYCDocument;
/**
 * Get KYC requirements for a verification level
 */
const getKYCRequirements = async (req, res, next) => {
    try {
        const level = parseInt(req.params.level);
        if (isNaN(level) || level < 0 || level > 2) {
            res.status(400).json({
                success: false,
                message: "Invalid level. Must be 0, 1, or 2"
            });
            return;
        }
        const requirements = (0, kyc_service_1.getKYCRequirementsService)(level);
        res.status(200).json({ success: true, data: requirements });
    }
    catch (err) {
        next(err);
    }
};
exports.getKYCRequirements = getKYCRequirements;
