# KYC CDN Storage Configuration - Status Report

**Date**: November 16, 2025
**Backend**: JackpotX Backend (jx_backend)
**CDN Provider**: https://cdn.jackpotx.net
**Status**: ⚠️ **CDN Server Issue Detected - Fallback Active**

---

## Executive Summary

The JackpotX backend **is already fully configured** to use CDN storage for KYC documents. The implementation includes:

✅ **CDN Configuration** - Properly set up in `.env`
✅ **CDN Upload Utility** - Complete implementation with error handling
✅ **KYC Controller Integration** - Automatic CDN upload on document submission
✅ **Fallback Mechanism** - Local storage fallback when CDN fails
⚠️ **CDN Server Issue** - Server returning "Failed to store file" error

**Current Behavior**: Due to CDN server issues, all KYC documents are **automatically falling back to local storage** (`/uploads/kyc/`). User uploads are **not blocked** - the system continues to work seamlessly.

---

## Configuration Details

### 1. Environment Variables (.env)

```env
# CDN Storage Configuration
# JackpotX CDN for storing user uploads (KYC documents, avatars, etc.)
CDN_AUTH_TOKEN=2ZqQk9
```

**Location**: `C:/Users/Sami/Desktop/JX/jx_backend/.env` (Line 157)

**CDN Configuration Constants**:
- **Upload URL**: `https://cdn.jackpotx.net/storage.php`
- **Base URL**: `https://cdn.jackpotx.net/cdnstorage`
- **Auth Token**: `2ZqQk9` (Bearer token)

---

## Current Implementation

### 2. CDN Storage Utility

**File**: `src/utils/cdn-storage.util.ts`

**Key Functions**:

| Function | Description |
|----------|-------------|
| `uploadToCDN(filePath, fileName?)` | Upload file from local path to CDN with Bearer auth |
| `uploadBufferToCDN(buffer, fileName, mimeType)` | Upload file buffer directly to CDN |
| `uploadAndCleanup(localPath, fileName?)` | Upload to CDN + delete local file on success |
| `deleteLocalFile(filePath)` | Safely delete local file |
| `getCDNUrl(fileName)` | Construct full CDN URL from filename |
| `isCDNUrl(url)` | Check if URL is a CDN URL |
| `getFileNameFromCDNUrl(url)` | Extract filename from CDN URL |

**Authentication**:
```typescript
const response = await axios.post(CDN_CONFIG.uploadUrl, formData, {
  headers: {
    ...formData.getHeaders(),
    'Authorization': `Bearer ${CDN_CONFIG.authToken}`,  // ✅ CORRECT
  },
  timeout: 30000,
});
```

**Upload Format** (matches CDN specification):
```typescript
formData.append('action', 'upload');
formData.append('file', fileBuffer, {
  filename: uploadFileName,
  contentType: getMimeType(uploadFileName),
});
```

---

### 3. KYC Controller Integration

**File**: `src/api/user/kyc.controller.ts` (Lines 105-118)

**Upload Flow**:

```typescript
// 1. Multer saves file temporarily to /uploads/kyc/
const localFilePath = path.join(process.cwd(), 'uploads', 'kyc', req.file.filename);

// 2. Attempt CDN upload with automatic local cleanup
try {
  cdnUrl = await uploadAndCleanup(localFilePath, req.file.filename);
  console.log(`✓ KYC document uploaded to CDN: ${cdnUrl}`);
} catch (cdnError: any) {
  console.error('✗ CDN upload failed:', cdnError.message);

  // 3. Fallback to local storage (ensures user upload is not blocked)
  cdnUrl = `/uploads/kyc/${req.file.filename}`;
  console.log(`→ Using local storage as fallback: ${cdnUrl}`);
}

// 4. Save to database (works regardless of CDN success/failure)
const documentData = {
  file_url: cdnUrl,  // Either CDN URL or local path
  // ... other fields
};
await uploadKYCDocumentService(userId, documentData);
```

**Expected CDN URLs**:
- **CDN**: `https://cdn.jackpotx.net/cdnstorage/kyc-1763235547903-536566885.jpg`
- **Local Fallback**: `/uploads/kyc/kyc-1763235547903-536566885.jpg`

---

## Current Issue: CDN Server Error

### Test Results

**Test Command**:
```bash
curl -H "Authorization: Bearer 2ZqQk9" \
     -F "action=upload" \
     -F "file=@package.json" \
     https://cdn.jackpotx.net/storage.php
```

**Response**:
```json
{
  "ok": false,
  "error": "Failed to store file"
}
```

**Status**: ❌ HTTP 500 (Internal Server Error)

**Analysis**:
1. ✅ **Authentication** is working (no "Unauthorized" error)
2. ✅ **Request format** is correct (server accepts the upload)
3. ❌ **Storage operation** is failing server-side

**Possible Causes**:
- CDN server disk space full
- File permissions issue on `/cdnstorage/` directory
- PHP `storage.php` configuration error
- Web server (Apache/Nginx) write permissions
- Directory path misconfiguration

---

## Impact Assessment

### User Impact
✅ **NO USER IMPACT** - Uploads continue to work via fallback mechanism

**What Users Experience**:
1. User uploads KYC document via frontend form
2. File is uploaded to backend successfully
3. Backend attempts CDN upload (fails silently)
4. Backend saves file to local storage instead
5. Document appears in user's KYC dashboard normally
6. Admin can view/verify document normally

**Logs (server-side only)**:
```
✗ CDN upload failed: Failed to upload to CDN: Request failed with status code 500
→ Using local storage as fallback: /uploads/kyc/kyc-1763275736355.jpg
```

### Storage Impact
⚠️ **Local Storage Usage**

Currently, KYC documents are being stored in:
```
C:/Users/Sami/Desktop/JX/jx_backend/uploads/kyc/
```

**Recommendations**:
1. Monitor disk space on backend server
2. Implement file cleanup for rejected documents
3. Fix CDN server issue to enable distributed storage

---

## Recommended Actions

### Immediate (Production Fix)

#### 1. Check CDN Server Storage
SSH into CDN server and verify:

```bash
# Check disk space
df -h

# Check cdnstorage directory permissions
ls -la /path/to/cdnstorage

# Verify directory is writable by web server
sudo chown -R www-data:www-data /path/to/cdnstorage
sudo chmod -R 755 /path/to/cdnstorage
```

#### 2. Check storage.php Configuration
Review `https://cdn.jackpotx.net/storage.php`:

```php
<?php
// Verify these configurations:
$upload_dir = '/path/to/cdnstorage/';  // Must exist and be writable
$max_file_size = 10 * 1024 * 1024;     // 10MB
$allowed_extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx'];

// Check authorization
$auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if ($auth_header !== 'Bearer 2ZqQk9') {
    die(json_encode(['ok' => false, 'error' => 'Unauthorized']));
}

// Verify file upload handling
if ($_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    error_log('Upload error: ' . $_FILES['file']['error']);
    die(json_encode(['ok' => false, 'error' => 'Upload failed']));
}

// Check move_uploaded_file() return value
$destination = $upload_dir . $filename;
if (!move_uploaded_file($_FILES['file']['tmp_name'], $destination)) {
    error_log('Failed to move file to: ' . $destination);
    die(json_encode(['ok' => false, 'error' => 'Failed to store file']));
}

// Return success with URL
echo json_encode([
    'ok' => true,
    'url' => 'https://cdn.jackpotx.net/cdnstorage/' . $filename
]);
```

#### 3. Check PHP Error Logs
```bash
# View PHP error log for detailed error
tail -f /var/log/php/error.log
# OR
tail -f /var/log/apache2/error.log
# OR
tail -f /var/log/nginx/error.log
```

#### 4. Test Direct Upload
```bash
# Create test file
echo "test content" > test.txt

# Upload via curl
curl -v -H "Authorization: Bearer 2ZqQk9" \
     -F "action=upload" \
     -F "file=@test.txt" \
     https://cdn.jackpotx.net/storage.php
```

---

### Short-term (Backend Enhancements)

#### 1. Add CDN Health Check Endpoint

Create `src/api/admin/cdn-health.controller.ts`:

```typescript
import { Request, Response } from 'express';
import { uploadBufferToCDN, isCDNUrl, getCDNUrl } from '../../utils/cdn-storage.util';
import axios from 'axios';

export const checkCDNHealth = async (req: Request, res: Response) => {
  try {
    // Test upload
    const testContent = Buffer.from(`CDN Health Check - ${Date.now()}`);
    const testFileName = `health-check-${Date.now()}.txt`;

    let uploadStatus = 'failed';
    let cdnUrl = '';
    let accessStatus = 'not_tested';

    try {
      cdnUrl = await uploadBufferToCDN(testContent, testFileName, 'text/plain');
      uploadStatus = 'success';

      // Test access
      const accessResponse = await axios.get(cdnUrl, { timeout: 5000 });
      accessStatus = accessResponse.status === 200 ? 'success' : 'failed';
    } catch (uploadError: any) {
      uploadStatus = uploadError.message;
    }

    res.json({
      success: true,
      cdn_status: {
        upload: uploadStatus,
        access: accessStatus,
        test_url: cdnUrl,
        fallback_enabled: true,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'CDN health check failed',
      error: error.message,
    });
  }
};
```

Add route in `src/routes/admin.routes.ts`:
```typescript
router.get('/cdn/health', authenticate, authorize(['admin']), checkCDNHealth);
```

#### 2. Add Retry Logic with Exponential Backoff

Update `src/utils/cdn-storage.util.ts`:

```typescript
export const uploadToCDNWithRetry = async (
  filePath: string,
  fileName?: string,
  maxRetries: number = 3
): Promise<string> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`CDN upload attempt ${attempt}/${maxRetries}`);
      return await uploadToCDN(filePath, fileName);
    } catch (error: any) {
      lastError = error;
      console.error(`Upload attempt ${attempt} failed:`, error.message);

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('All upload attempts failed');
};
```

---

### Long-term (Infrastructure)

#### 1. Migrate to Cloud Storage
Consider migrating to enterprise CDN solutions:

**Options**:
- **AWS S3** + CloudFront
  - Pros: Highly reliable, scalable, integrated with CloudFront CDN
  - Cost: ~$0.023/GB storage + $0.085/GB transfer

- **Cloudflare R2**
  - Pros: Zero egress fees, S3-compatible API
  - Cost: $0.015/GB storage, $0 egress

- **DigitalOcean Spaces**
  - Pros: Simple, affordable, S3-compatible
  - Cost: $5/month (250GB storage + 1TB transfer)

**Implementation Example (AWS S3)**:

```typescript
// src/utils/s3-storage.util.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const uploadToS3 = async (filePath: string, fileName: string): Promise<string> => {
  const fileBuffer = fs.readFileSync(filePath);

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: `kyc/${fileName}`,
    Body: fileBuffer,
    ContentType: getMimeType(fileName),
    ACL: 'public-read', // Or use CloudFront signed URLs for private access
  });

  await s3Client.send(command);

  return `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/kyc/${fileName}`;
  // OR with CloudFront: `https://${process.env.CLOUDFRONT_DOMAIN}/kyc/${fileName}`
};
```

#### 2. Implement CDN Failover
Configure multiple CDN backends:

```typescript
const CDN_PROVIDERS = [
  {
    name: 'primary',
    uploadUrl: 'https://cdn.jackpotx.net/storage.php',
    baseUrl: 'https://cdn.jackpotx.net/cdnstorage',
    authToken: process.env.CDN_AUTH_TOKEN,
  },
  {
    name: 's3',
    uploadUrl: 's3',
    baseUrl: process.env.AWS_CLOUDFRONT_URL,
    authToken: process.env.AWS_ACCESS_KEY_ID,
  },
];

export const uploadWithFailover = async (filePath: string, fileName: string): Promise<string> => {
  for (const provider of CDN_PROVIDERS) {
    try {
      if (provider.uploadUrl === 's3') {
        return await uploadToS3(filePath, fileName);
      } else {
        return await uploadToCDN(filePath, fileName, provider);
      }
    } catch (error) {
      console.error(`Provider ${provider.name} failed, trying next...`);
    }
  }
  throw new Error('All CDN providers failed');
};
```

---

## Testing & Verification

### Manual Testing

#### 1. Test Backend Upload Endpoint

```bash
# Login and get JWT token
TOKEN=$(curl -X POST https://backend.jackpotx.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq -r '.data.accessToken')

# Upload KYC document
curl -X POST https://backend.jackpotx.net/api/user/kyc/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "document=@test-id.jpg" \
  -F "document_type=national_id" \
  -F "description=Front side of ID"
```

**Expected Response (CDN working)**:
```json
{
  "success": true,
  "message": "Document uploaded successfully",
  "data": {
    "id": 123,
    "file_url": "https://cdn.jackpotx.net/cdnstorage/kyc-1763275736355.jpg",
    "status": "pending"
  }
}
```

**Expected Response (CDN down - fallback)**:
```json
{
  "success": true,
  "message": "Document uploaded successfully",
  "data": {
    "id": 123,
    "file_url": "/uploads/kyc/kyc-1763275736355.jpg",
    "status": "pending"
  }
}
```

#### 2. Verify File Storage

```bash
# If CDN working:
curl -I https://cdn.jackpotx.net/cdnstorage/kyc-1763275736355.jpg

# If fallback:
ls -lh C:/Users/Sami/Desktop/JX/jx_backend/uploads/kyc/
```

---

## Database Schema

KYC documents are stored in PostgreSQL:

```sql
SELECT
  id,
  user_id,
  document_type,
  file_url,  -- Either CDN URL or local path
  file_name,
  status,
  created_at
FROM kyc_documents
WHERE user_id = 1
ORDER BY created_at DESC;
```

**Example Records**:

| id | file_url | Status |
|----|----------|--------|
| 1 | `https://cdn.jackpotx.net/cdnstorage/kyc-123.jpg` | CDN (working) |
| 2 | `/uploads/kyc/kyc-456.jpg` | Local (fallback) |

---

## Summary

### What's Working ✅
1. ✅ CDN configuration is correct in `.env`
2. ✅ CDN upload utility is properly implemented
3. ✅ KYC controller integrates CDN upload
4. ✅ Fallback mechanism prevents user upload failures
5. ✅ Authentication token is correct
6. ✅ Request format matches CDN specification

### What's Not Working ❌
1. ❌ CDN server returning HTTP 500 "Failed to store file"
2. ❌ All uploads are falling back to local storage

### Required Actions 🔧
1. 🔧 Fix CDN server storage issue (check disk space, permissions, PHP config)
2. 🔧 Review CDN server logs for detailed error information
3. 🔧 Test CDN upload after fixes
4. 🔧 Consider migration to enterprise cloud storage (S3, R2, Spaces)

---

## Contact & Support

**CDN Server**: https://cdn.jackpotx.net
**Backend**: https://backend.jackpotx.net
**Issue**: Server-side storage failure

**Next Steps**:
1. Access CDN server and check `/var/log/` for PHP/Apache/Nginx errors
2. Verify `/cdnstorage/` directory exists and is writable
3. Test upload after applying fixes
4. Monitor production uploads to ensure CDN is working

---

**Report Generated**: November 16, 2025
**System Status**: Operational (with fallback active)
**Action Required**: Fix CDN server storage issue
