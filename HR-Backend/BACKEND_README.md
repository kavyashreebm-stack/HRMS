# 🚀 HR Onboarding Backend - Candidate Side

This backend is built with **FastAPI**, **SQLAlchemy**, and **PostgreSQL** to handle the complete candidate onboarding flow.

## 🏗️ Database Schema

### 1. `users`
| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary Key |
| `email` | String | Unique login email |
| `password_hash` | String | Hashed password |
| `role` | String | Default: `CANDIDATE` |

### 2. `candidate_profiles` (7 Sections)
Stores permanent profile data.
- **Personal**: Name, Designation, Address, Mobile, DOB, Marital Status, Gender, Languages, Identity IDs, Bank Details (Aadhar, PAN, Passport, Bank, IFSC, UAN, ESIC).
- **Education**: JSON list of degree, institute, dates, specialization.
- **Employment**: JSON list of organizations, roles, summary.
- **References**: Source (Indeed, etc.) and Personal Reference details.
- **Family**: JSON list of dependents and their Aadhaar.
- **Medical**: Blood group, disability info, medical conditions.
- **Declaration**: Signature, date, place, and file paths for Aadhar/PAN/SSLC.

### 3. `applications`
Stores specific applications submitted by candidates.
- **Department**: Target department.
- **Education/Skills**: Snapshot of top 2 records (Education, Employment, Technical Skills).
- **Status**: Applied (0%), Reviewed (20%), Interview scheduled, Offer.

### 4. `notifications`
HR-triggered alerts for candidates.

### 5. `jobs`
Available listings for the "Similar Jobs" suggestion logic.

---

## 📡 API Endpoints

### Authentication
- `POST /auth/register`: Create a new account.
- `POST /auth/login`: Get JWT token and profile status.

### Profile
- `GET /candidate/profile/{user_id}`: Fetch full 7-section profile.
- `PUT /candidate/profile/{user_id}`: Create or update profile sections.

### Job Applications
- `POST /candidate/apply`: Submit a new job application.
- `GET /candidate/applications`: List all submitted applications.

### Dashboard
- `GET /candidate/dashboard`: Returns:
  - **Stats**: Total apps, interviews, offers.
  - **Notifications**: Latest unread messages.
  - **Similar Jobs**: Jobs matching the candidate's applied department.
  - **Progress**: Profile completion % and Application tracking %.

---

## 📂 File Handling
All uploads are saved to the `uploads/` directory on the server:
- `uploads/photos/`
- `uploads/resumes/`
- `uploads/documents/` (Aadhar, PAN, SSLC)

Paths are stored in the database for frontend retrieval.

---

## 🛠️ Step-by-Step Implementation Guide

1. **Environment Setup**: Define `DATABASE_URL` in `.env`.
2. **Database Migration**: Run the SQLAlchemy model creation script to set up tables.
3. **Pydantic Validation**: Use the schemas in `app/schemas.py` to ensure data integrity during profile updates.
4. **Endpoint Integration**:
   - On **Profile Creation**, call `PUT /candidate/profile/{user_id}`.
   - For **Dashboard**, call `GET /candidate/dashboard` to populate stats and progress bars.
   - On **Job Application**, call `POST /candidate/apply`.
5. **Progress Logic**:
   - Profile % is calculated based on filled mandatory fields in the profile table.
   - Application % is updated by HR in the backend and reflected in the candidate dashboard.
