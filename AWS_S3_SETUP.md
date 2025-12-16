# AWS S3 Setup Guide for Secure File Storage

This guide explains how to configure AWS S3 for secure document uploads in the review dialog.

## Prerequisites

- AWS Account
- AWS CLI installed (optional, for testing)
- IAM permissions to create buckets and IAM users

## Step 1: Create S3 Bucket

1. Log in to AWS Console
2. Navigate to **S3** service
3. Click **Create bucket**
4. Configure bucket settings:
   - **Bucket name**: Choose a unique name (e.g., `vapps-issue-reviews-prod`)
   - **AWS Region**: Select your preferred region (e.g., `us-east-1`)
   - **Object Ownership**: ACLs disabled (recommended)
   - **Block Public Access**: ✅ **Enable all settings** (keep bucket private)
   - **Bucket Versioning**: Optional (enable for production)
   - **Default encryption**: Enable (SSE-S3 recommended)
   - **Object Lock**: Disable (unless required)

5. Click **Create bucket**

## Step 2: Create IAM User with S3 Permissions

1. Navigate to **IAM** service in AWS Console
2. Click **Users** → **Create user**
3. Enter username (e.g., `vapps-s3-uploader`)
4. Select **Provide user access to the AWS Management Console** (optional) or **Access key - Programmatic access** (recommended)
5. Click **Next**
6. Click **Attach policies directly**
7. Click **Create policy** (opens new tab)
8. Switch to **JSON** tab and paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:HeadObject"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME"
    }
  ]
}
```

**Replace `YOUR-BUCKET-NAME` with your actual bucket name.**

9. Name the policy (e.g., `VAppsS3FileAccess`)
10. Click **Create policy**
11. Go back to user creation tab, refresh, and select the policy you just created
12. Click **Next** → **Create user**

## Step 3: Generate Access Keys

1. Click on the user you just created
2. Go to **Security credentials** tab
3. Scroll to **Access keys** section
4. Click **Create access key**
5. Select **Application running outside AWS**
6. Click **Next** → **Create access key**
7. **IMPORTANT**: Copy both:
   - **Access key ID**
   - **Secret access key** (shown only once - save it securely!)

## Step 4: Configure Environment Variables

Add these variables to your `.env` file (or environment configuration):

```bash
# AWS S3 Configuration
AWS_REGION="us-east-1"  # Match your bucket region
AWS_ACCESS_KEY_ID="your-access-key-id-here"
AWS_SECRET_ACCESS_KEY="your-secret-access-key-here"
AWS_S3_BUCKET_NAME="your-bucket-name"
AWS_S3_UPLOAD_FOLDER="issue-reviews"  # Optional: folder prefix for organization
```

## Step 5: Verify Configuration

1. Start your Next.js application
2. Navigate to a process board
3. Move an issue from "In Progress" to "In Review"
4. Upload a test file in the review dialog
5. Check AWS S3 Console → Your bucket → `issue-reviews/` folder
6. Verify the file was uploaded successfully

## Security Best Practices

✅ **Implemented:**
- Private bucket (no public access)
- Server-side encryption (SSE-S3)
- Presigned URLs for downloads (expire after 1 hour)
- IAM user with minimal required permissions
- File type validation
- File size limits (10MB default)

🔒 **Additional Recommendations:**
- Enable S3 bucket versioning for production
- Set up CloudTrail for audit logging
- Use AWS KMS for encryption (instead of SSE-S3) for enhanced security
- Implement lifecycle policies to archive old files
- Set up bucket notifications for monitoring
- Regularly rotate access keys (every 90 days)

## File Storage Structure

Files are stored in S3 with the following structure:

```
issue-reviews/
  {orgId}/
    {processId}/
      {issueId}/
        containment/
          {timestamp}-{random}.{ext}
        rootCause/
          {timestamp}-{random}.{ext}
        actionPlan/
          {timestamp}-{random}.{ext}
```

## Troubleshooting

### Error: "AWS_S3_BUCKET_NAME environment variable is not set"
- Check your `.env` file has `AWS_S3_BUCKET_NAME` set
- Restart your Next.js dev server after adding environment variables

### Error: "Access Denied" when uploading
- Verify IAM user has `s3:PutObject` permission
- Check bucket name matches `AWS_S3_BUCKET_NAME`
- Verify access key ID and secret are correct

### Error: "Failed to generate presigned URL"
- Verify IAM user has `s3:GetObject` permission
- Check the S3 key exists in the bucket
- Verify bucket region matches `AWS_REGION`

### Files not appearing in S3
- Check browser console for upload errors
- Verify network requests to `/api/files/upload` are successful
- Check S3 bucket permissions and IAM user policy

## Cost Considerations

- **Storage**: ~$0.023 per GB/month (Standard storage)
- **PUT requests**: ~$0.005 per 1,000 requests
- **GET requests**: ~$0.0004 per 1,000 requests
- **Data transfer out**: First 100 GB/month free, then ~$0.09 per GB

For typical usage (1000 files/month, 1GB total), expect ~$0.05-0.10/month.

## Support

For issues or questions, check:
- AWS S3 Documentation: https://docs.aws.amazon.com/s3/
- AWS IAM Documentation: https://docs.aws.amazon.com/iam/
