# File Storage Information

## Current Implementation

### What is Stored
- **File Metadata Only**: Name, size, and MIME type are stored in PostgreSQL JSONB columns
- **Location**: `issue_reviews` table in tenant databases
- **Columns**: 
  - `containmentFiles` (JSONB)
  - `rootCauseFiles` (JSONB)
  - `actionPlans[].files` (JSONB array within actionPlans)

### What is NOT Stored
- **Actual File Content**: The binary file data is NOT stored anywhere
- **File URLs**: No file storage service (S3, etc.) is integrated yet
- **File Downloads**: Files cannot be downloaded because they don't exist on the server

### Database Schema
```sql
-- Files are stored as JSONB arrays like this:
containmentFiles: [
  {
    "name": "Screenshot 2025-12-15 at 19-12-46.png",
    "size": 294607,
    "type": "image/png"
  }
]
```

## How It Works Now

1. **User uploads file** → File object is created in browser
2. **User submits form** → Only metadata (name, size, type) is extracted
3. **Metadata saved to DB** → Stored in JSONB columns
4. **File object discarded** → Original file is lost (not uploaded to server)

## What Users See

- **Previously uploaded files**: Shown with "Saved" badge (metadata only)
- **Newly uploaded files**: Shown with remove button (File objects in memory)
- **On submit**: Both existing and new file metadata are merged and saved

## Future Implementation

To implement actual file storage, you would need to:

1. **Choose Storage Service**:
   - AWS S3
   - Google Cloud Storage
   - Azure Blob Storage
   - Local filesystem (for development)

2. **Upload Files Before Saving Review**:
   ```typescript
   // Pseudo-code
   const uploadedFiles = await Promise.all(
     files.map(file => uploadToS3(file))
   );
   
   // Store URLs in database
   const fileMetadata = uploadedFiles.map(f => ({
     name: f.originalName,
     size: f.size,
     type: f.mimeType,
     url: f.s3Url  // <-- Add this
   }));
   ```

3. **Add Download Endpoint**:
   ```typescript
   // GET /api/files/[fileId]
   // Returns file from storage service
   ```

4. **Update Database Schema**:
   ```sql
   -- Add url field to file metadata
   containmentFiles: [
     {
       "name": "file.png",
       "size": 294607,
       "type": "image/png",
       "url": "https://s3.amazonaws.com/bucket/file.png"  -- NEW
     }
   ]
   ```

## Current Limitations

- ✅ File metadata is preserved
- ✅ Users can see what files were uploaded
- ❌ Files cannot be downloaded
- ❌ Files are lost after page refresh
- ❌ No file preview/display

## Recommendation

For production, implement file storage before allowing file uploads, or clearly communicate to users that files are metadata-only for now.
