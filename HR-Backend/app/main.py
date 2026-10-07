from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from .database import engine, SessionLocal
from . import models, auth
from sqlalchemy.orm import Session
from sqlalchemy import text

# Import routers
from .routers import auth_router, candidate, hr

app = FastAPI(title="HR Onboarding API", version="1.0.0")

# Create all DB tables and seed HR on startup
@app.on_event("startup")
def startup_populate_db():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Run DB migrations to add new columns if they don't exist on remote DB
        try:
            db.execute(text("ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS employee_id VARCHAR"))
            db.execute(text("ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS date_of_joining VARCHAR"))
            db.execute(text("ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS technical_qualifications JSON"))
            db.execute(text("CREATE TABLE IF NOT EXISTS languages (id SERIAL PRIMARY KEY, name VARCHAR UNIQUE NOT NULL)"))
            db.execute(text("CREATE TABLE IF NOT EXISTS skills (id SERIAL PRIMARY KEY, name VARCHAR UNIQUE NOT NULL)")) 
            db.execute(text("""ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS skills JSON"""))

            # Jobs table columns that may be missing on older staging DBs
            db.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS tags JSON"))
            db.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS skills TEXT"))
            db.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS created_by UUID"))
            db.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE"))
            # Documents table (may not exist on older deployments)
            db.execute(text("""
                CREATE TABLE IF NOT EXISTS documents (
                    id SERIAL PRIMARY KEY,
                    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    document_type VARCHAR(100) NOT NULL,
                    file_name VARCHAR(255),
                    file_path VARCHAR(512) NOT NULL,
                    file_size INTEGER,
                    mime_type VARCHAR(100),
                    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                    deleted_at TIMESTAMP WITH TIME ZONE
                )
            """))
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Migration error: {e}")

        # Seed default languages
        try:
            default_langs = ["English", "Hindi", "Kannada", "Tamil", "Telugu", "Malayalam"]
            for lang_name in default_langs:
                exists = db.query(models.Language).filter(models.Language.name.ilike(lang_name)).first()
                if not exists:
                    db.add(models.Language(name=lang_name))
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Language seeding error: {e}")

        hr_email = "hrautocratengineers@gmail.com"
        hr_pass = "Hradmin@123"
        from sqlalchemy import func
        existing_hr = db.query(models.User).filter(func.lower(models.User.email) == hr_email).first()
        if not existing_hr:
            print(f"Seeding HR User: {hr_email}")
            hashed_pw = auth.get_password_hash(hr_pass)
            new_hr = models.User(
                email=hr_email,
                password_hash=hashed_pw,
                role="HR",
                is_active=True
            )
            db.add(new_hr)
            db.commit()
        else:
            # Re-hash password to ensure compatibility with current bcrypt
            print(f"Re-hashing HR User password for bcrypt compatibility")
            existing_hr.password_hash = auth.get_password_hash(hr_pass)
            existing_hr.role = "HR"
            existing_hr.is_active = True
            db.commit()
    finally:
        db.close()

# ✅ CORS — allows React frontend to talk to FastAPI
origins = [
    "http://localhost:3000",
    "http://localhost:8080",
    "https://staging.d3u94tnbl4bl76.amplifyapp.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Request
import time
from datetime import datetime

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = None
    error_msg = None
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        error_msg = str(e)
        raise e
    finally:
        duration = time.time() - start_time
        status_code = response.status_code if response else 500
        log_line = f"{datetime.now()} | {request.method} {request.url.path} | Status: {status_code} | Duration: {duration:.3f}s"
        if error_msg:
            log_line += f" | Error: {error_msg}"
        with open("requests.log", "a", encoding="utf-8") as f:
            f.write(log_line + "\n")

# ✅ Register all routers
app.include_router(auth_router.router)
app.include_router(candidate.router)
app.include_router(hr.router)

# ✅ Serve uploaded files with support for Local Disk, Lambda /tmp, and AWS S3
from fastapi.responses import FileResponse, StreamingResponse
import mimetypes

IS_LAMBDA = bool(os.getenv("AWS_EXECUTION_ENV") or os.getenv("LAMBDA_TASK_ROOT"))
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/tmp/uploads" if IS_LAMBDA else "uploads")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME") or os.getenv("AWS_STORAGE_BUCKET_NAME")

try:
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR, exist_ok=True)
except Exception:
    pass

@app.get("/uploads/{file_path:path}")
async def serve_uploaded_file(file_path: str):
    """
    Serves uploaded documents/photos/resumes.
    Checks local disk (and /tmp/uploads) first, then falls back to AWS S3 if configured.
    """
    # 1. Search local filesystem locations
    possible_paths = [
        os.path.join(UPLOAD_DIR, file_path),
        os.path.join("uploads", file_path),
        os.path.join("/tmp/uploads", file_path),
        os.path.join("/tmp", file_path)
    ]
    for path in possible_paths:
        if os.path.exists(path) and os.path.isfile(path):
            media_type, _ = mimetypes.guess_type(path)
            return FileResponse(
                path,
                media_type=media_type or "application/octet-stream",
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Content-Disposition": f"inline; filename=\"{os.path.basename(path)}\""
                }
            )
            
    # 2. Try loading from AWS S3 if S3_BUCKET_NAME is set
    if S3_BUCKET_NAME:
        try:
            import boto3
            s3 = boto3.client("s3")
            s3_key = file_path if file_path.startswith("uploads/") else f"uploads/{file_path}"
            response = s3.get_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
            media_type = response.get('ContentType') or mimetypes.guess_type(file_path)[0] or 'application/octet-stream'
            return StreamingResponse(
                response['Body'],
                media_type=media_type,
                headers={
                    "Content-Disposition": f"inline; filename=\"{os.path.basename(file_path)}\"",
                    "Access-Control-Allow-Origin": "*"
                }
            )
        except Exception as e:
            print(f"Error serving from S3 key {file_path}: {e}")

    raise HTTPException(status_code=404, detail="File not found")




@app.get("/")
def root():
    return {"message": "HR Backend is running ✅"}

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import traceback

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "*",
    "Access-Control-Allow-Headers": "*",
}

@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    with open("requests.log", "a", encoding="utf-8") as f:
        f.write(f"{datetime.now()} | HTTPException: {exc.status_code} - {exc.detail}\n")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=CORS_HEADERS
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors_summary = str(exc.errors())
    with open("requests.log", "a", encoding="utf-8") as f:
        f.write(f"{datetime.now()} | ValidationError: 422 - {errors_summary}\n")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
        headers=CORS_HEADERS
    )

@app.exception_handler(Exception)
def debug_exception_handler(request: Request, exc: Exception):
    tb = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    print("DEBUG TRACEBACK:")
    print(tb)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "traceback": tb},
        headers=CORS_HEADERS
    )

@app.get("/auth/reset-db-secret-secure")
def reset_db_route():
    db = SessionLocal()
    try:
        # Delete data in order to respect foreign keys
        db.execute(text("DELETE FROM notifications"))
        db.execute(text("DELETE FROM applications"))
        db.execute(text("DELETE FROM candidate_profiles"))
        # Keep the HR user, delete others
        db.execute(text("DELETE FROM users WHERE role != 'HR'"))
        db.commit()
        return {"status": "success", "message": "Database wiped clean! (HR Admin preserved)"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        db.close()