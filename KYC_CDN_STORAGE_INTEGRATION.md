# KYC CDN Storage Integration

## Overview

The KYC (Know Your Customer) document upload system has been integrated with JackpotX CDN storage (https://cdn.jackpotx.net) to ensure reliable, scalable, and secure storage of user verification documents.

## What Changed

### Previous Implementation
- KYC documents were stored locally in `uploads/kyc/` directory
- Files were served directly from the backend server
- URLs format: `/uploads/kyc/kyc-{timestamp}-{random}.{ext}`
- Limited scalability and redundancy

### New Implementation
- KYC documents are automatically uploaded to CDN storage
- Files are accessible via CDN URLs for better performance
- URLs format: `https://cdn.jackpotx.net/cdnstorage/kyc-{timestamp}-{random}.{ext}`
- Automatic cleanup of local files after successful CDN upload
- Fallback to local storage if CDN upload fails

## Technical Details

### CDN Configuration

**Environment Variable** (`.env`):
```bash
# CDN Storage Configuration
# JackpotX CDN for storing user uploads (KYC documents, avatars, etc.)
CDN_AUTH_TOKEN=2ZqQk9
```

**CDN Endpoints**:
- Upload API: `https://cdn.jackpotx.net/storage.php`
- Storage Base URL: `https://cdn.jackpotx.net/cdnstorage/`
- Authorization: `Bearer 2ZqQk9`

### File Upload Flow

1. **User submits KYC document** via frontend
2. **Multer saves file temporarily** to `uploads/kyc/` directory
3. **File is uploaded to CDN** using `uploadAndCleanup()` utility
4. **Local file is deleted** after successful CDN upload
5. **CDN URL is saved** to database in `kyc_documents.file_url`
6. **Frontend displays document** using CDN URL

### Fallback Mechanism

If CDN upload fails for any reason:
- The system automatically falls back to local storage
- File remains in `uploads/kyc/` directory
- Local URL (`/uploads/kyc/...`) is saved to database
- Error is logged for admin investigation
- User upload is not blocked - system remains operational

### Database Schema

The `kyc_documents` table stores document information:

```sql
CREATE TABLE kyc_documents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  document_type VARCHAR(50) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,  -- Now stores CDN URL
  file_size INTEGER,
  mime_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  -- ... other fields
);
```

**Example URLs**:
- CDN URL: `https://cdn.jackpotx.net/cdnstorage/kyc-1763235547903-536566885.jpg`
- Local URL (fallback): `/uploads/kyc/kyc-1763235547903-536566885.jpg`

## Files Modified

### 1. CDN Storage Utility
**File**: `src/utils/cdn-storage.util.ts`

**Purpose**: Centralized utility for CDN operations

**Key Functions**:
- `uploadToCDN(filePath, fileName)` - Upload file from local path to CDN
- `uploadBufferToCDN(buffer, fileName, mimeType)` - Upload file buffer to CDN
- `uploadAndCleanup(localFilePath, fileName)` - Upload to CDN and delete local file
- `deleteLocalFile(filePath)` - Delete local file safely
- `getCDNUrl(fileName)` - Construct CDN URL from filename
- `isCDNUrl(url)` - Check if URL is a CDN URL
- `getFileNameFromCDNUrl(url)` - Extract filename from CDN URL

### 2. KYC Controller (User-facing)
**File**: `src/api/user/kyc.controller.ts`

**Changes**:
- Imported `uploadAndCleanup` utility
- Updated `uploadKYCDocument()` to upload to CDN before saving to database
- Added error handling with fallback to local storage
- Added logging for CDN upload success/failure

**Code snippet**:
```typescript
// Upload to CDN storage
let cdnUrl: string;
try {
  const localFilePath = path.join(process.cwd(), 'uploads', 'kyc', req.file.filename);
  cdnUrl = await uploadAndCleanup(localFilePath, req.file.filename);
  console.log(`KYC document uploaded to CDN: ${cdnUrl}`);
} catch (cdnError: any) {
  console.error('CDN upload failed:', cdnError);
  // Fallback to local storage if CDN upload fails
  cdnUrl = `/uploads/kyc/${req.file.filename}`;
  console.log('Using local storage as fallback');
}
```

### 3. KYC Service (Business Logic)
**File**: `src/services/user/kyc.service.ts`

**Changes**:
- Imported `isCDNUrl` utility
- Updated `deleteKYCDocumentService()` to check if file is on CDN
- Only delete local files, not CDN files (for audit trail)
- Added logging for file deletion operations

**Code snippet**:
```typescript
// Delete file from filesystem (only if it's a local file, not CDN)
if (!isCDNUrl(document.file_url)) {
  const filePath = path.join(process.cwd(), document.file_url);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`Deleted local file: ${filePath}`);
  }
} else {
  console.log(`File is on CDN, skipping local deletion: ${document.file_url}`);
  // Note: CDN files are not deleted to maintain audit trail
}
```

### 4. Environment Configuration
**File**: `.env`

**Changes**:
- Added `CDN_AUTH_TOKEN=2ZqQk9`

## Migration Guide

### For Existing Documents

If you have existing KYC documents stored locally, you have two options:

#### Option 1: Leave as-is (Recommended)
- Existing documents will continue to work with local URLs
- New uploads will automatically use CDN
- No migration required

#### Option 2: Manual Migration
1. **Upload existing files to CDN**:
   ```bash
   cd uploads/kyc
   for file in kyc-*.jpg kyc-*.png kyc-*.pdf; do
     curl -H "Authorization: Bearer 2ZqQk9" \
          -F "action=upload" \
          -F "file=@$file" \
          https://cdn.jackpotx.net/storage.php
   done
   ```

2. **Update database URLs**:
   ```sql
   -- Check existing local URLs
   SELECT id, file_name, file_url FROM kyc_documents WHERE file_url LIKE '/uploads/kyc/%';

   -- Update to CDN URLs (after confirming all files are uploaded)
   UPDATE kyc_documents
   SET file_url = REPLACE(file_url, '/uploads/kyc/', 'https://cdn.jackpotx.net/cdnstorage/')
   WHERE file_url LIKE '/uploads/kyc/%';
   ```

3. **Verify migration**:
   ```sql
   SELECT file_url FROM kyc_documents LIMIT 10;
   ```

A migration script is available at: `migrations/migrate-kyc-to-cdn.sql`

## Testing

### Test KYC Document Upload

1. **Start the server**:
   ```bash
   npm run dev
   ```

2. **Upload a test document** via API:
   ```bash
   # Login to get token
   TOKEN="your_jwt_token_here"

   # Upload KYC document
   curl -X POST http://localhost:3004/api/user/kyc/upload \
     -H "Authorization: Bearer $TOKEN" \
     -F "document=@test-passport.jpg" \
     -F "document_type=passport" \
     -F "description=Test passport upload"
   ```

3. **Check response**:
   ```json
   {
     "success": true,
     "message": "Document uploaded successfully",
     "data": {
       "id": 123,
       "file_url": "https://cdn.jackpotx.net/cdnstorage/kyc-1763235547903-536566885.jpg",
       "file_name": "kyc-1763235547903-536566885.jpg",
       "status": "pending"
     }
   }
   ```

4. **Verify file is accessible**:
   - Open the `file_url` in browser
   - File should load from CDN

5. **Check server logs**:
   ```
   KYC document uploaded to CDN: https://cdn.jackpotx.net/cdnstorage/kyc-1763235547903-536566885.jpg
   Deleted local file: C:\Users\Sami\Desktop\JX\jx_backend\uploads\kyc\kyc-1763235547903-536566885.jpg
   ```

### Test Fallback Mechanism

To test the fallback to local storage:

1. **Temporarily disable CDN** by changing the auth token in `.env`:
   ```bash
   CDN_AUTH_TOKEN=invalid_token
   ```

2. **Upload a document** - should succeed with local URL

3. **Check response**:
   ```json
   {
     "file_url": "/uploads/kyc/kyc-1763235547903-536566885.jpg"
   }
   ```

4. **Restore CDN token**:
   ```bash
   CDN_AUTH_TOKEN=2ZqQk9
   ```

## Frontend Integration

The frontend already handles CDN URLs correctly. No changes required.

**Frontend File**: (React component provided in user's message)

The `getKYCDocuments()` API returns documents with CDN URLs:
```typescript
const documents = await getKYCDocuments();
// documents[0].file_url = "https://cdn.jackpotx.net/cdnstorage/kyc-xxx.jpg"
```

The frontend displays these URLs in the document list and allows admins to view them.

## Security Considerations

### CDN Authorization
- All CDN uploads require `Authorization: Bearer 2ZqQk9` header
- Token is stored securely in `.env` file
- Token should be rotated periodically for security

### File Access
- CDN files are publicly accessible via URL (no auth required for viewing)
- This is intentional for KYC verification workflow
- Only approved personnel should have access to CDN URLs
- Database access is restricted to authenticated users

### Audit Trail
- All document uploads are logged in `kyc_audit_logs` table
- CDN files are NOT deleted when user deletes document (audit trail)
- Only database records are removed
- Admins can track all document operations

## Monitoring

### Success Indicators
- Server logs show: `KYC document uploaded to CDN: https://...`
- Server logs show: `Deleted local file: ...`
- Database `file_url` contains CDN URLs
- Files are accessible via CDN URLs

### Failure Indicators
- Server logs show: `CDN upload failed: ...`
- Server logs show: `Using local storage as fallback`
- Database `file_url` contains local URLs (`/uploads/kyc/...`)
- Files accumulate in `uploads/kyc/` directory

### Troubleshooting

**Problem**: CDN uploads always fail

**Solutions**:
1. Verify `CDN_AUTH_TOKEN` is correct in `.env`
2. Check network connectivity to `https://cdn.jackpotx.net`
3. Verify CDN API is operational
4. Check server logs for detailed error messages

**Problem**: Files remain in local directory

**Solutions**:
1. Check if CDN upload succeeded (search logs for "uploaded to CDN")
2. Verify file permissions allow deletion
3. Check disk space for cleanup operations
4. Review error logs for deletion failures

**Problem**: Frontend shows broken images

**Solutions**:
1. Verify CDN URLs are publicly accessible
2. Check CORS headers on CDN
3. Verify file was actually uploaded to CDN
4. Try accessing CDN URL directly in browser

## Performance Benefits

### Before CDN Integration
- Files served from backend server
- Limited bandwidth and connections
- Server resources used for static file serving
- Single point of failure

### After CDN Integration
- Files served from dedicated CDN infrastructure
- Unlimited bandwidth and global distribution
- Backend resources freed for API processing
- Better reliability and uptime

### Expected Improvements
- **Faster load times**: CDN edge servers closer to users
- **Reduced server load**: Static files offloaded to CDN
- **Better scalability**: CDN handles traffic spikes
- **Improved reliability**: CDN redundancy and failover

## Future Enhancements

### Potential Improvements
1. **Image optimization**: Compress and resize images before CDN upload
2. **Signed URLs**: Generate time-limited URLs for enhanced security
3. **CDN deletion**: Implement CDN file deletion via API
4. **Multiple CDN providers**: Add failover to secondary CDN
5. **Encryption**: Encrypt sensitive documents before upload
6. **Thumbnails**: Generate thumbnails for faster previews

### Avatar Uploads
This CDN integration can be extended to other file uploads:
- User avatars
- Game banners
- Promotional images
- Admin uploads

## Support

For issues or questions:
1. Check server logs in `logs/access.log` and console output
2. Review this documentation
3. Check database for document records
4. Verify CDN configuration in `.env`
5. Test CDN API manually with curl

## References

- CDN Storage API: `https://cdn.jackpotx.net/storage.php`
- CDN Storage Base URL: `https://cdn.jackpotx.net/cdnstorage/`
- Utility File: `src/utils/cdn-storage.util.ts`
- Controller: `src/api/user/kyc.controller.ts`
- Service: `src/services/user/kyc.service.ts`
- Migration: `migrations/migrate-kyc-to-cdn.sql`
