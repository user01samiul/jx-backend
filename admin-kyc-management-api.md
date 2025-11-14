# Admin Panel KYC Management API Documentation

## Overview

This document provides comprehensive request and response patterns for KYC (Know Your Customer) management in the admin panel. All endpoints require admin authentication via Bearer token.

**Base URL:** `https://backend.jackpotx.net/api/admin`

**Authentication Header:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## KYC Document Types

| Document Type | Description |
|---------------|-------------|
| passport | Passport document |
| national_id | National ID card |
| drivers_license | Driver's license |
| utility_bill | Utility bill for address verification |
| bank_statement | Bank statement |
| selfie | Selfie photo for identity verification |
| proof_of_address | Proof of address document |
| proof_of_income | Proof of income document |
| tax_document | Tax-related document |
| other | Other document type |

---

## KYC Status Types

| Status | Description |
|--------|-------------|
| pending | Awaiting verification |
| approved | Verification approved |
| rejected | Verification rejected |
| under_review | Currently under review |
| expired | Verification expired |
| cancelled | Verification cancelled |

---

## 1. Get Pending KYC Requests

**Endpoint:** `GET /api/admin/kyc/pending`

**Description:** Get all pending KYC verification requests with filtering options

### Request

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `search` (optional): Search by username, email, first name, or last name
- `status` (optional): Filter by KYC status
- `document_type` (optional): Filter by document type
- `user_id` (optional): Filter by specific user ID
- `start_date` (optional): Filter by start date (ISO datetime)
- `end_date` (optional): Filter by end date (ISO datetime)
- `compliance_level` (optional): Filter by compliance level (low, medium, high)
- `risk_score_min` (optional): Minimum risk score (0-100)
- `risk_score_max` (optional): Maximum risk score (0-100)

**Example:**
```
GET /api/admin/kyc/pending?page=1&limit=20&status=pending&compliance_level=high
```

### Response

**Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 123,
      "status": "pending",
      "risk_score": 25,
      "compliance_level": "low",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "username": "john_doe",
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "phone": "+1234567890",
      "country": "US",
      "document_count": 3,
      "approved_documents": 2,
      "pending_documents": 1,
      "rejected_documents": 0
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "total_pages": 1
  }
}
```

---

## 2. Get KYC by User ID

**Endpoint:** `GET /api/admin/kyc/{user_id}`

**Description:** Get detailed KYC verification information for a specific user

### Request

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Path Parameters:**
- `user_id` (required): User ID to get KYC information for

**Example:**
```
GET /api/admin/kyc/123
```

### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 123,
    "status": "pending",
    "risk_score": 25,
    "compliance_level": "low",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "verification_date": null,
    "expiry_date": null,
    "reason": null,
    "admin_notes": null,
    "username": "john_doe",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1234567890",
    "country": "US",
    "documents": [
      {
        "id": 1,
        "document_type": "passport",
        "file_url": "https://example.com/documents/passport.pdf",
        "file_name": "passport.pdf",
        "file_size": 1024000,
        "mime_type": "application/pdf",
        "status": "approved",
        "uploaded_at": "2024-01-15T10:30:00Z",
        "verified_at": "2024-01-15T11:00:00Z"
      }
    ]
  }
}
```

**Error (404):**
```json
{
  "success": false,
  "message": "KYC verification not found for this user"
}
```

---

## 3. Approve KYC Verification

**Endpoint:** `PUT /api/admin/kyc/{user_id}/approve`

**Description:** Approve KYC verification for a user

### Request

**Headers:**
```
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Path Parameters:**
- `user_id` (required): User ID to approve KYC for

**Body:**
```json
{
  "reason": "All documents verified successfully",
  "admin_notes": "User provided all required documents",
  "verification_date": "2024-01-15T12:00:00Z",
  "expiry_date": "2025-01-15T12:00:00Z",
  "risk_score": 15,
  "compliance_level": "low"
}
```

**Body Fields:**
- `reason` (optional): Reason for approval
- `admin_notes` (optional): Internal admin notes
- `verification_date` (optional): Date of verification (ISO datetime)
- `expiry_date` (optional): Expiry date for verification (ISO datetime)
- `risk_score` (optional): Risk score (0-100)
- `compliance_level` (optional): Compliance level (low, medium, high)

### Response

**Success (200):**
```json
{
  "success": true,
  "message": "KYC approved successfully",
  "data": {
    "id": 1,
    "user_id": 123,
    "status": "approved",
    "risk_score": 15,
    "compliance_level": "low",
    "verification_date": "2024-01-15T12:00:00Z",
    "expiry_date": "2025-01-15T12:00:00Z",
    "reason": "All documents verified successfully",
    "admin_notes": "User provided all required documents",
    "updated_at": "2024-01-15T12:00:00Z"
  }
}
```

**Error (400):**
```json
{
  "success": false,
  "message": "Invalid user ID"
}
```

**Error (404):**
```json
{
  "success": false,
  "message": "KYC verification not found"
}
```

---

## 4. Reject KYC Verification

**Endpoint:** `PUT /api/admin/kyc/{user_id}/reject`

**Description:** Reject KYC verification for a user

### Request

**Headers:**
```
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Path Parameters:**
- `user_id` (required): User ID to reject KYC for

**Body:**
```json
{
  "reason": "Documents are unclear and cannot be verified",
  "admin_notes": "User needs to provide clearer copies of documents",
  "verification_date": "2024-01-15T12:00:00Z"
}
```

**Body Fields:**
- `reason` (optional): Reason for rejection
- `admin_notes` (optional): Internal admin notes
- `verification_date` (optional): Date of verification (ISO datetime)

### Response

**Success (200):**
```json
{
  "success": true,
  "message": "KYC rejected successfully",
  "data": {
    "id": 1,
    "user_id": 123,
    "status": "rejected",
    "verification_date": "2024-01-15T12:00:00Z",
    "reason": "Documents are unclear and cannot be verified",
    "admin_notes": "User needs to provide clearer copies of documents",
    "updated_at": "2024-01-15T12:00:00Z"
  }
}
```

---

## 5. Get KYC Documents

**Endpoint:** `GET /api/admin/kyc/documents`

**Description:** Get all KYC documents with filtering options

### Request

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameters:**
- `user_id` (optional): Filter by specific user ID
- `document_type` (optional): Filter by document type
- `status` (optional): Filter by document status
- `start_date` (optional): Filter by start date (ISO datetime)
- `end_date` (optional): Filter by end date (ISO datetime)

**Example:**
```
GET /api/admin/kyc/documents?user_id=123&document_type=passport&status=approved
```

### Response

**Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 123,
      "document_type": "passport",
      "file_url": "https://example.com/documents/passport.pdf",
      "file_name": "passport.pdf",
      "file_size": 1024000,
      "mime_type": "application/pdf",
      "description": "Passport front and back pages",
      "status": "approved",
      "uploaded_at": "2024-01-15T10:30:00Z",
      "verified_at": "2024-01-15T11:00:00Z",
      "verification_method": "manual",
      "verified_by": "admin@casino.com",
      "rejection_reason": null,
      "admin_notes": "Document verified successfully",
      "username": "john_doe",
      "email": "john@example.com"
    }
  ]
}
```

---

## 6. Verify KYC Document

**Endpoint:** `PUT /api/admin/kyc/documents/{document_id}/verify`

**Description:** Verify a specific KYC document

### Request

**Headers:**
```
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Path Parameters:**
- `document_id` (required): Document ID to verify

**Body:**
```json
{
  "status": "approved",
  "reason": "Document is clear and valid",
  "admin_notes": "Passport details match user information",
  "verification_method": "manual",
  "verified_by": "admin@casino.com",
  "verification_date": "2024-01-15T12:00:00Z"
}
```

**Body Fields:**
- `status` (required): Document status (pending, approved, rejected, under_review, expired, cancelled)
- `reason` (optional): Reason for verification decision
- `admin_notes` (optional): Internal admin notes
- `verification_method` (optional): Verification method (manual, automated, third_party)
- `verified_by` (optional): Admin who verified the document
- `verification_date` (optional): Date of verification (ISO datetime)

### Response

**Success (200):**
```json
{
  "success": true,
  "message": "Document verified successfully",
  "data": {
    "id": 1,
    "user_id": 123,
    "document_type": "passport",
    "status": "approved",
    "verified_at": "2024-01-15T12:00:00Z",
    "verification_method": "manual",
    "verified_by": "admin@casino.com",
    "admin_notes": "Passport details match user information",
    "updated_at": "2024-01-15T12:00:00Z"
  }
}
```

**Error (400):**
```json
{
  "success": false,
  "message": "Invalid document ID"
}
```

---

## 7. Create Risk Assessment

**Endpoint:** `POST /api/admin/kyc/{user_id}/risk-assessment`

**Description:** Create a risk assessment for a user

### Request

**Headers:**
```
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Path Parameters:**
- `user_id` (required): User ID to create risk assessment for

**Body:**
```json
{
  "risk_factors": [
    "High transaction volume",
    "Multiple accounts",
    "Suspicious activity"
  ],
  "risk_score": 75,
  "risk_level": "high",
  "assessment_notes": "User shows multiple risk indicators",
  "recommended_actions": [
    "Enhanced due diligence",
    "Transaction monitoring",
    "Regular review"
  ],
  "assessment_date": "2024-01-15T12:00:00Z"
}
```

**Body Fields:**
- `risk_factors` (optional): Array of risk factors identified
- `risk_score` (required): Risk score (0-100)
- `risk_level` (required): Risk level (low, medium, high, critical)
- `assessment_notes` (optional): Notes about the assessment
- `recommended_actions` (optional): Array of recommended actions
- `assessment_date` (optional): Date of assessment (ISO datetime)

### Response

**Success (200):**
```json
{
  "success": true,
  "message": "Risk assessment created successfully",
  "data": {
    "id": 1,
    "user_id": 123,
    "risk_factors": [
      "High transaction volume",
      "Multiple accounts",
      "Suspicious activity"
    ],
    "risk_score": 75,
    "risk_level": "high",
    "assessment_notes": "User shows multiple risk indicators",
    "recommended_actions": [
      "Enhanced due diligence",
      "Transaction monitoring",
      "Regular review"
    ],
    "assessment_date": "2024-01-15T12:00:00Z",
    "created_at": "2024-01-15T12:00:00Z",
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

---

## 8. Get KYC Compliance Reports

**Endpoint:** `GET /api/admin/kyc/reports`

**Description:** Get KYC compliance reports

### Request

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameters:**
- `start_date` (required): Start date for report (ISO datetime)
- `end_date` (required): End date for report (ISO datetime)
- `report_type` (optional): Report type (daily, weekly, monthly, quarterly, annual, default: monthly)
- `include_details` (optional): Include detailed breakdown (default: false)
- `format` (optional): Report format (json, csv, pdf, default: json)

**Example:**
```
GET /api/admin/kyc/reports?start_date=2024-01-01T00:00:00Z&end_date=2024-01-31T23:59:59Z&report_type=monthly&include_details=true
```

### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "report_period": {
      "start_date": "2024-01-01T00:00:00Z",
      "end_date": "2024-01-31T23:59:59Z",
      "report_type": "monthly"
    },
    "summary": {
      "total_kyc_requests": 150,
      "approved_kyc": 120,
      "rejected_kyc": 20,
      "pending_kyc": 10,
      "approval_rate": 80.0,
      "average_processing_time": "2.5 days",
      "compliance_score": 95.5
    },
    "by_status": {
      "pending": 10,
      "approved": 120,
      "rejected": 20,
      "under_review": 5,
      "expired": 3,
      "cancelled": 2
    },
    "by_compliance_level": {
      "low": 80,
      "medium": 45,
      "high": 25
    },
    "by_risk_level": {
      "low": 100,
      "medium": 35,
      "high": 15
    },
    "details": [
      {
        "date": "2024-01-15",
        "new_requests": 5,
        "approved": 4,
        "rejected": 1,
        "pending": 0
      }
    ]
  }
}
```

---

## 9. Get KYC Audit Logs

**Endpoint:** `GET /api/admin/kyc/audit-logs`

**Description:** Get KYC audit logs for tracking all KYC-related activities

### Request

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameters:**
- `user_id` (optional): Filter by specific user ID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `action_type` (optional): Filter by action type
- `start_date` (optional): Filter by start date (ISO datetime)
- `end_date` (optional): Filter by end date (ISO datetime)

**Example:**
```
GET /api/admin/kyc/audit-logs?user_id=123&page=1&limit=20
```

### Response

**Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 123,
      "action_type": "kyc_approved",
      "action_description": "KYC verification approved",
      "performed_by": "admin@casino.com",
      "performed_at": "2024-01-15T12:00:00Z",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "details": {
        "previous_status": "pending",
        "new_status": "approved",
        "reason": "All documents verified successfully",
        "risk_score": 15,
        "compliance_level": "low"
      },
      "username": "john_doe",
      "email": "john@example.com"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "total_pages": 1
  }
}
```

---

## Common Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid user ID"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "KYC verification not found for this user"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to fetch pending KYC requests"
}
```

---

## Frontend Integration Examples

### JavaScript/TypeScript

```javascript
// Get pending KYC requests
const getPendingKYC = async (filters = {}) => {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/admin/kyc/pending?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// Approve KYC
const approveKYC = async (userId, approvalData) => {
  const response = await fetch(`/api/admin/kyc/${userId}/approve`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(approvalData)
  });
  return response.json();
};

// Reject KYC
const rejectKYC = async (userId, rejectionData) => {
  const response = await fetch(`/api/admin/kyc/${userId}/reject`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(rejectionData)
  });
  return response.json();
};

// Verify document
const verifyDocument = async (documentId, verificationData) => {
  const response = await fetch(`/api/admin/kyc/documents/${documentId}/verify`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(verificationData)
  });
  return response.json();
};
```

### cURL Examples

```bash
# Get pending KYC requests
curl -X GET "http://localhost:3000/api/admin/kyc/pending?status=pending" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Approve KYC
curl -X PUT "http://localhost:3000/api/admin/kyc/123/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"reason": "All documents verified successfully", "risk_score": 15}'

# Reject KYC
curl -X PUT "http://localhost:3000/api/admin/kyc/123/reject" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"reason": "Documents are unclear", "admin_notes": "Need clearer copies"}'

# Get KYC reports
curl -X GET "http://localhost:3000/api/admin/kyc/reports?start_date=2024-01-01T00:00:00Z&end_date=2024-01-31T23:59:59Z" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## KYC Workflow

```
User Submits KYC → Pending Review → Admin Reviews → Approve/Reject
       ↓                ↓              ↓              ↓
   Documents        Risk Assessment  Verification  Status Update
   Uploaded         Created          Process       & Notification
```

---

## Compliance Features

1. **Document Management**: Support for multiple document types
2. **Risk Assessment**: Automated and manual risk scoring
3. **Audit Logging**: Complete audit trail of all KYC activities
4. **Compliance Reporting**: Detailed compliance reports
5. **Status Tracking**: Full status lifecycle management
6. **Admin Notes**: Internal communication and documentation
7. **Verification Methods**: Manual, automated, and third-party verification
8. **Expiry Management**: Automatic expiry date tracking

---

## Notes

1. **Authentication**: All endpoints require a valid admin JWT token
2. **User ID**: Must be a valid integer
3. **Document Types**: Predefined list of supported document types
4. **Status Flow**: KYC status follows a specific workflow
5. **Risk Scoring**: 0-100 scale with risk levels (low, medium, high, critical)
6. **Compliance Levels**: Three levels (low, medium, high)
7. **Audit Trail**: All actions are logged for compliance
8. **File Management**: Document files are stored externally
9. **Verification Methods**: Multiple verification approaches supported
10. **Reporting**: Comprehensive reporting capabilities

---

## Version History

- **v1.0** - Initial KYC management implementation
- **v1.1** - Added risk assessment functionality
- **v1.2** - Enhanced compliance reporting
- **v1.3** - Added audit logging and document verification
- **v1.4** - Improved filtering and search capabilities 