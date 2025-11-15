# Quick Start: KYC CDN Testing

## ✅ Cleanup Completed

- **Database:** All KYC tables empty (0 records)
- **Files:** uploads/kyc/ folder empty
- **Users:** 60 users reset to unverified status
- **Sequences:** Reset to start from ID 1

---

## 🚀 Test KYC Upload Now

### Step 1: Start Server
```bash
npm run dev
```

### Step 2: Frontend Test
1. Open: http://localhost:3000 (or your frontend URL)
2. Login as any user
3. Navigate to KYC Verification page
4. Upload a document:
   - **Type:** Passport, National ID, or Driver's License
   - **File:** JPG, PNG, or PDF (max 10MB)
   - **Description:** "Test document"

### Step 3: Check Logs
Look for these messages in server console:
```
✓ KYC document uploaded to CDN: https://cdn.jackpotx.net/cdnstorage/kyc-*.jpg
Deleted local file: C:\Users\Sami\Desktop\JX\jx_backend\uploads\kyc\kyc-*.jpg
```

**OR** (if CDN fails):
```
✗ CDN upload failed: ...
→ Using local storage as fallback: /uploads/kyc/kyc-*.jpg
```

### Step 4: Verify Database
```bash
export PGPASSWORD=2025
psql -U postgres -d jx-database -c "SELECT id, user_id, document_type, file_url, status FROM kyc_documents;"
```

**Expected result:**
```
 id | user_id | document_type |              file_url              | status
----+---------+---------------+------------------------------------+---------
  1 |     123 | passport      | https://cdn.jackpotx.net/cdnsto... | pending
```

### Step 5: Test CDN Access
Copy the `file_url` from database and open in browser:
```
https://cdn.jackpotx.net/cdnstorage/kyc-1763241xxx-xxxxxxx.jpg
```

Should display the uploaded document.

---

## 🔍 What to Check

### ✓ CDN Upload Success
- Server logs show: `✓ KYC document uploaded to CDN`
- Local file deleted automatically
- Database `file_url` starts with `https://cdn.jackpotx.net`
- File accessible via CDN URL in browser

### ✓ Fallback to Local (if CDN fails)
- Server logs show: `✗ CDN upload failed`
- Server logs show: `→ Using local storage as fallback`
- Local file remains in `uploads/kyc/`
- Database `file_url` starts with `/uploads/kyc/`
- File accessible via local URL: `http://localhost:3004/uploads/kyc/kyc-*.jpg`

---

## 📊 Database Queries

### Check all KYC documents:
```sql
SELECT * FROM kyc_documents ORDER BY id DESC;
```

### Check KYC verifications:
```sql
SELECT * FROM kyc_verifications ORDER BY id DESC;
```

### Check user KYC status:
```sql
SELECT id, username, kyc_verified, kyc_status FROM users WHERE id = 123;
```

### Check audit logs:
```sql
SELECT * FROM kyc_audit_logs ORDER BY created_at DESC LIMIT 10;
```

---

## 🧪 Test API Directly (Optional)

### Upload via curl:
```bash
# Get JWT token first by logging in
TOKEN="your_jwt_token_here"

# Upload document
curl -X POST http://localhost:3004/api/user/kyc/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "document=@test-passport.jpg" \
  -F "document_type=passport" \
  -F "description=Test document"
```

### Get KYC status:
```bash
curl http://localhost:3004/api/user/kyc/status \
  -H "Authorization: Bearer $TOKEN"
```

### Get documents:
```bash
curl http://localhost:3004/api/user/kyc/documents \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔧 Troubleshooting

### Problem: CDN upload always fails
**Check:**
1. `.env` has `CDN_AUTH_TOKEN=2ZqQk9`
2. Server can reach `https://cdn.jackpotx.net`
3. CDN API is operational

**Solution:**
- System will fallback to local storage automatically
- Documents will still upload successfully
- No user impact

### Problem: File not found
**Check:**
1. File was actually uploaded (check uploads/kyc/ or CDN)
2. Database has correct file_url
3. Frontend is using correct URL

### Problem: Database error
**Check:**
1. Database is running
2. Database name is `jx-database`
3. User can submit documents (no pending/approved docs)

---

## 📁 Important Files

**Configuration:**
- `.env` - Contains `CDN_AUTH_TOKEN=2ZqQk9`

**Code:**
- `src/utils/cdn-storage.util.ts` - CDN upload utility
- `src/api/user/kyc.controller.ts` - Upload handler
- `src/services/user/kyc.service.ts` - Business logic

**Scripts:**
- `cleanup-kyc-data.sql` - Database cleanup script
- `test-cdn-upload.js` - CDN test script

**Documentation:**
- `KYC_CDN_STORAGE_INTEGRATION.md` - Full documentation
- `KYC_CLEANUP_REPORT.md` - Cleanup summary
- `KYC_FLOW_DIAGRAM.txt` - Visual flow diagrams

---

## ✅ Success Criteria

Your KYC CDN integration is working if:

1. ✓ User can upload documents without errors
2. ✓ Server logs show CDN upload success
3. ✓ Database file_url contains CDN URL
4. ✓ File is accessible via CDN URL in browser
5. ✓ Local file is automatically deleted
6. ✓ Admin can view and approve documents

**Bonus (if CDN fails):**
- ✓ System falls back to local storage
- ✓ User upload still succeeds
- ✓ Admin can still view documents

---

## 🎯 Next Actions

1. **Test upload** - Submit a fresh KYC document
2. **Verify CDN** - Check logs and database
3. **Test admin** - Review and approve document
4. **Test deletion** - Delete a pending document
5. **Test resubmission** - Submit after rejection

---

**Ready to test!** 🚀

The system is clean and waiting for fresh KYC uploads with CDN integration.
