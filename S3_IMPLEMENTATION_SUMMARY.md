# AWS S3 File Upload Implementation Summary

## ✅ What Was Implemented

A complete, secure file upload system using AWS S3 private bucket for the review dialog. Files are uploaded securely, stored with encryption, and accessed via presigned URLs.

## 📁 Files Created/Modified

### New Files
1. **`src/lib/s3.ts`** - S3 utility library with upload, download, and file management functions
2. **`src/app/api/files/upload/route.ts`** - API endpoint for file uploads
3. **`src/app/api/files/download/route.ts`** - API endpoint for secure file downloads (presigned URLs)
4. **`AWS_S3_SETUP.md`** - Complete setup guide for AWS S3 configuration

### Modified Files
1. **`src/lib/api-client.ts`** - Added `uploadFile()` and `getFileDownloadUrl()` methods
2. **`src/components/dashboard/ReviewDialog.tsx`** - Updated to:
   - Upload files to S3 before saving review
   - Display existing files with download buttons
   - Show upload progress
   - Store S3 keys in database
3. **`prisma/tenant-migrations/006_add_issue_reviews.sql`** - Updated comments to reflect S3 key storage

## 🔧 Environment Variables Required

Add these to your `.env` file:

```bash
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key-id"
AWS_SECRET_ACCESS_KEY="your-secret-access-key"
AWS_S3_BUCKET_NAME="your-bucket-name"
AWS_S3_UPLOAD_FOLDER="issue-reviews"  # Optional, defaults to "issue-reviews"
```

## 🚀 How It Works

### File Upload Flow
1. User selects files in review dialog
2. On submit, files are uploaded to S3 via `/api/files/upload`
3. S3 returns object keys (not public URLs)
4. Keys are stored in database JSONB columns
5. Review data is saved with file metadata including S3 keys

### File Download Flow
1. User clicks "Download" on existing file
2. Frontend requests presigned URL from `/api/files/download?key=...`
3. Backend generates presigned URL (expires in 1 hour)
4. Frontend opens URL in new tab for download

### Security Features
- ✅ Private S3 bucket (no public access)
- ✅ Server-side encryption (SSE-S3)
- ✅ Presigned URLs expire after 1 hour
- ✅ File type validation
- ✅ File size limits (10MB default)
- ✅ IAM user with minimal permissions
- ✅ Unique file keys prevent conflicts

## 📊 Database Schema

Files are stored in JSONB columns with this structure:

```json
{
  "name": "document.pdf",
  "size": 102400,
  "type": "application/pdf",
  "key": "issue-reviews/orgId/processId/issueId/containment/1234567890-abc123.pdf"
}
```

The `key` field is the S3 object key used for secure downloads.

## 🎯 Usage Example

### Uploading Files
```typescript
// Automatically handled in ReviewDialog
// User selects files → Files uploaded to S3 → Keys saved to database
```

### Downloading Files
```typescript
// In ReviewDialog component
const result = await apiClient.getFileDownloadUrl(fileMeta.key);
window.open(result.url, "_blank"); // Opens presigned URL
```

## 🔍 File Storage Structure in S3

```
your-bucket/
  issue-reviews/
    {orgId}/
      {processId}/
        {issueId}/
          containment/
            1234567890-abc123.pdf
          rootCause/
            1234567890-def456.png
          actionPlan/
            1234567890-ghi789.docx
```

## ⚙️ Configuration

### File Size Limit
Default: 10MB. To change, modify `MAX_FILE_SIZE` in `src/app/api/files/upload/route.ts`:

```typescript
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
```

### Allowed File Types
Modify `ALLOWED_MIME_TYPES` in `src/app/api/files/upload/route.ts`:

```typescript
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  // Add more types as needed
];
```

### Presigned URL Expiration
Default: 1 hour. To change, modify `expiresIn` in `src/app/api/files/download/route.ts`:

```typescript
const presignedUrl = await getPresignedDownloadUrl(s3Key, 7200); // 2 hours
```

## 🧪 Testing

1. **Setup AWS S3** (see `AWS_S3_SETUP.md`)
2. **Add environment variables** to `.env`
3. **Start application**: `npm run dev`
4. **Test upload**:
   - Navigate to process board
   - Move issue to "In Review"
   - Upload a file
   - Check S3 bucket for uploaded file
5. **Test download**:
   - Reopen review dialog
   - Click "Download" on existing file
   - Verify file downloads correctly

## 🐛 Troubleshooting

### Files not uploading
- Check AWS credentials in `.env`
- Verify IAM user has `s3:PutObject` permission
- Check browser console for errors
- Verify bucket name matches `AWS_S3_BUCKET_NAME`

### Downloads not working
- Verify IAM user has `s3:GetObject` permission
- Check presigned URL generation in API route
- Verify file key exists in database

### "Access Denied" errors
- Check IAM policy includes bucket name
- Verify bucket region matches `AWS_REGION`
- Ensure access keys are correct

## 📝 Next Steps (Optional Enhancements)

- [ ] Add file preview (images, PDFs)
- [ ] Implement file deletion
- [ ] Add upload progress bar
- [ ] Support drag-and-drop file uploads
- [ ] Add file compression before upload
- [ ] Implement file versioning
- [ ] Add virus scanning integration
- [ ] Set up CloudFront CDN for faster downloads

## 📚 Documentation

- **Setup Guide**: `AWS_S3_SETUP.md`
- **S3 Library**: `src/lib/s3.ts` (well-documented)
- **API Routes**: `src/app/api/files/*/route.ts` (with error handling)

## ✨ Industry Best Practices Implemented

1. **Security**: Private bucket, encryption, presigned URLs
2. **Scalability**: Unique file keys, organized folder structure
3. **Error Handling**: Comprehensive try-catch blocks, user-friendly errors
4. **Performance**: Parallel file uploads, efficient S3 operations
5. **Maintainability**: Well-documented code, clear separation of concerns
6. **Cost Optimization**: Efficient storage structure, minimal API calls
