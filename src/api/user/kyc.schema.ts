// src/api/user/kyc.schema.ts
import { z } from "zod";

/**
 * Schema for uploading KYC document
 */
export const UploadKYCDocumentSchema = z.object({
  body: z.object({
    document_type: z.enum([
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
    description: z.string().optional()
  })
});

export type UploadKYCDocumentInputType = z.infer<typeof UploadKYCDocumentSchema>["body"];

/**
 * Schema for getting KYC requirements
 */
export const GetKYCRequirementsSchema = z.object({
  params: z.object({
    level: z.string().regex(/^[0-2]$/, "Level must be 0, 1, or 2")
  })
});

/**
 * Schema for deleting KYC document
 */
export const DeleteKYCDocumentSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number")
  })
});
