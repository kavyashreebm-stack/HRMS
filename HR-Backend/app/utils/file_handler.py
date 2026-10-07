import os
import uuid
import logging
from fastapi import UploadFile

# Use /tmp/uploads on AWS Lambda if not specified
IS_LAMBDA = bool(os.getenv("AWS_EXECUTION_ENV") or os.getenv("LAMBDA_TASK_ROOT"))
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/tmp/uploads" if IS_LAMBDA else "uploads")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME") or os.getenv("AWS_STORAGE_BUCKET_NAME")

def save_upload_file(upload_file: UploadFile, folder: str) -> str:
    """
    Saves an uploaded file to S3 (if bucket configured) or to local uploads directory.
    Returns the relative path to the saved file (e.g. 'aadhar/uuid.pdf').
    """
    if not upload_file:
        return None
        
    file_extension = os.path.splitext(upload_file.filename)[1] if upload_file.filename else ""
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_key = f"{folder}/{unique_filename}"
    
    # 1. Try uploading to S3 if S3_BUCKET_NAME environment variable is set
    if S3_BUCKET_NAME:
        try:
            import boto3
            s3 = boto3.client("s3")
            upload_file.file.seek(0)
            s3.upload_fileobj(
                upload_file.file,
                S3_BUCKET_NAME,
                f"uploads/{file_key}",
                ExtraArgs={
                    "ContentType": upload_file.content_type or "application/octet-stream"
                }
            )
            logging.info(f"File uploaded to S3: s3://{S3_BUCKET_NAME}/uploads/{file_key}")
            return file_key
        except Exception as e:
            logging.error(f"S3 Upload failed, falling back to local file system: {e}")

    # 2. Save locally (or to /tmp/uploads on Lambda)
    target_dir = os.path.join(UPLOAD_DIR, folder)
    try:
        os.makedirs(target_dir, exist_ok=True)
    except Exception as e:
        logging.error(f"Could not create directory {target_dir}: {e}")
        # Final fallback to /tmp
        target_dir = os.path.join("/tmp", "uploads", folder)
        os.makedirs(target_dir, exist_ok=True)

    file_path = os.path.join(target_dir, unique_filename)
    
    # Save the file locally
    upload_file.file.seek(0)
    with open(file_path, "wb") as buffer:
        buffer.write(upload_file.file.read())
        
    # Return relative path for database storage
    return file_key

