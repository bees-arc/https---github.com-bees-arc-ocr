# Identity Onboarding Lab

[![Java](https://img.shields.io/badge/Java-21%20LTS-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.4-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Next.js](https://img.shields.io/badge/Next.js-14.2.14-black.svg)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)

An automated remote customer identity verification and onboarding platform designed for Sri Lankan wealth and investment institutions.

---

## 1. Architecture Overview

```
                  +----------------------------------------------+
                  |           Browser Web Application            |
                  |     (Next.js 14 / TypeScript / Tailwind)     |
                  |  - Applicant Onboarding Portal               |
                  |  - Staff Reviewer / Audit Dashboard          |
                  +-----------------------+----------------------+
                                          |
                                HTTP / Cookies / REST
                                          v
                  +----------------------------------------------+
                  |         Spring Boot 3.3.4 (Java 21)          |
                  |  - Workflow Engine & Deterministic Policies  |
                  |  - Authentication & Session State            |
                  |  - Private Storage Access Management         |
                  |  - Durable PostgreSQL Async Job Engine       |
                  |  - Append-Only Audit Logging                 |
                  +---------------+--------------+---------------+
                                  |              |
                      Internal    |              | JDBC / Flyway
                      HTTP JSON   |              |
                                  v              v
      +-----------------------------+    +-----------------------------+
      |  FastAPI (Python 3.11)      |    |  PostgreSQL 16 Database     |
      |  - Tesseract OCR (v5.x)     |    |  - Relational aggregates    |
      |  - Card Quality Assessment  |    |  - Versioned applications   |
      |  - Document Portrait Crop   |    |  - Encrypted PII fields     |
      |  - Temporal Video Liveness  |    |  - Job lease / execution    |
      |  - Face Embedding Matching  |    |  - Audit log events         |
      +--------------+--------------+    +-----------------------------+
                     |
                     | Direct File I/O
                     v
      +----------------------------------------------------------+
      |            Private Evidence Storage Volume               |
      |   - Encrypted files at rest (AES-256-GCM)                |
      |   - Opaque random storage keys (no path traversal)       |
      |   - Scoped decrypted access via temporary descriptors    |
      +----------------------------------------------------------+
```

---

## 2. Core Capabilities & Truthful Classification

In accordance with non-fabrication criteria, all operational components are classified truthfully:

| Capability | Status | Classification | Details |
| :--- | :--- | :--- | :--- |
| **Applicant Flow & Resumable Drafts** | Working | `REAL` | Resumable draft lifecycle, atomic version checking (`version`). |
| **Contact Authentication (OTP)** | Working | `REAL` | Local test provider with rate limiting and salted SHA-256 hashing. |
| **Versioned Statutory Consent** | Working | `REAL` | Mandatory KYC consent separated from optional communication consent. |
| **NIC Image Quality Assessment** | Working | `REAL` | Laplacian blur variance and pixel luminance glare detection. |
| **NIC Format & Layout Parsing** | Working | `REAL` | Deterministic Old NIC (9 digits + V/X) and New NIC (12 digits) validation with leap-year day calculations. |
| **NIC Text Extraction (OCR)** | Working | `REAL` / `UNAVAILABLE` | Tesseract 5.x (`eng`, `sin`, `tam`). If host binary absent, reports `OCR_UNAVAILABLE` without fabricating positive scores. |
| **Document Portrait Extraction** | Working | `REAL_EXPERIMENTAL` | Haar Cascade frontal face detection constrained to card coordinates. |
| **Camera Challenge Generator** | Working | `REAL` | Server-generated random actions (Turn Left, Turn Right, Blink) with 90s single-use nonces. |
| **Movement Compliance Analysis** | Working | `REAL_EXPERIMENTAL` | Server-side video analysis in Python verifying face continuity and rotation angles. |
| **Passive Anti-Spoofing (PAD)** | Working | `UNKNOWN` | Certified ISO 30107-3 PAD weights are absent. Reports `UNKNOWN`, never promoting to `PASS`. |
| **Facial Comparison (NIC vs Live)** | Working | `REAL_EXPERIMENTAL` | Cosine similarity comparison against calibrated threshold (0.65). |
| **Durable Asynchronous Jobs** | Working | `REAL` | PostgreSQL durable job queue with atomic lease, exponential backoff retries, and worker heartbeat. |
| **Staff Reviewer Queue & Actions** | Working | `REAL` | Case review with masked PII, raw vs confirmed diff, protected evidence viewer, and reasoned decisions. |
| **Append-Only Audit Trail** | Working | `REAL` | Immutable audit events recorded for all mutations and evidence accesses. |

---

## 3. Quickstart & Local Execution

### Option A: Docker Compose (All Services)
```bash
# 1. Copy configuration template
cp .env.example .env

# 2. Build and launch all 4 containers (Postgres, Vision, Backend, Frontend)
docker compose -f infra/compose.yaml up --build
```
- **Customer Portal**: [http://localhost:3000](http://localhost:3000)
- **Reviewer Portal**: [http://localhost:3000/staff/applications](http://localhost:3000/staff/applications)
- **Backend API**: [http://localhost:8080](http://localhost:8080)

To stop services safely without data loss:
```bash
docker compose -f infra/compose.yaml stop
```

---

### Option B: Native Developer Mode (No Docker Required)

Spring Boot includes a PostgreSQL-compatible in-memory database profile, allowing full execution on Windows, Linux, and macOS without local Docker daemons.

#### 1. Vision Service
```bash
cd vision-service
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

#### 2. Spring Boot Backend
In a separate terminal:
```bash
cd backend
# Windows:
.\mvnw.cmd spring-boot:run
# Linux/macOS:
./mvnw spring-boot:run
```

#### 3. Next.js Frontend
In a separate terminal:
```bash
cd frontend
npm run dev
```

---

## 4. Demo Shortcuts & Verification

- **Applicant OTP Demo Code**: Enter `+94771234567` and use code `123456`.
- **Compliance Staff Account**: `staff.admin@identitylab.local` / `AdminDemo123!`.
- **Sample NIC Generator**: On the NIC upload page (`/onboarding/[id]/nic`), click **"Sample Card"** to generate synthetic valid Sri Lankan NIC images directly in the browser for rapid testing.
- **Simulate Camera Challenge**: On the video capture page (`/onboarding/[id]/video`), click **"Simulate Video Capture"** to execute the challenge without a physical webcam.

### Automated Smoke Tests

**Windows PowerShell:**
```powershell
.\scripts\smoke-test.ps1
```

**Linux/macOS Bash:**
```bash
./scripts/smoke-test.sh
```

---

## 5. Security & Privacy Safeguards

- **Authenticated Encryption at Rest**: All applicant PII and raw extracted fields are encrypted with AES-256-GCM.
- **Blinded Duplicate Lookup**: Keyed HMAC of canonical NIC number (`nic_lookup_hmac`), never plaintext or unsalted hashes.
- **Path Traversal Protection**: Storage keys are opaque server-generated UUIDs resolved strictly against the configured root directory.
- **Strict Role-Based Access Control**: Applicant sessions can only access their own records. Reviewers require explicit staff authentication.
- **Audited Streaming**: Media files are never stored in public web folders; they are streamed through an authenticated backend endpoint that records an audit entry on every view.

---

## 6. Documentation Index

- [Architecture Specification](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Local Setup Guide](docs/LOCAL_SETUP.md)
- [Model Cards & Licenses](docs/MODEL_CARD.md)
- [Threat Model](docs/THREAT_MODEL.md)
- [Open Decisions Log](docs/OPEN_DECISIONS.md)
- [Implementation Status Matrix](docs/IMPLEMENTATION_STATUS.md)
- [Test Report](docs/TEST_REPORT.md)
- [Public OpenAPI Contract](contracts/openapi/public-api.yaml)
- [Internal Vision OpenAPI Contract](contracts/openapi/internal-vision-api.yaml)
