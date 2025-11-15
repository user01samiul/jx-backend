"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteKYCDocumentSchema = exports.GetKYCRequirementsSchema = exports.UploadKYCDocumentSchema = void 0;
// src/api/user/kyc.schema.ts
const zod_1 = require("zod");
/**
 * Schema for uploading KYC document
 */
exports.UploadKYCDocumentSchema = zod_1.z.object({
    body: zod_1.z.object({
        document_type: zod_1.z.enum([
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
        ]),
        description: zod_1.z.string().optional()
    })
});
/**
 * Schema for getting KYC requirements
 */
exports.GetKYCRequirementsSchema = zod_1.z.object({
    params: zod_1.z.object({
        level: zod_1.z.string().regex(/^[0-2]$/, "Level must be 0, 1, or 2")
    })
});
/**
 * Schema for deleting KYC document
 */
exports.DeleteKYCDocumentSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().regex(/^\d+$/, "ID must be a number")
    })
});
