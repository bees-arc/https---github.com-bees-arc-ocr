# Identity Onboarding Lab — System Architecture

Version: 1.0  
Date: 7 October 2026

## 1. System Topology

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
                  |         Spring Boot 3.3.x (Java 21)          |
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

## 2. Security Boundaries & Invariants

1. **Authoritative Backend**:
   - The frontend NEVER calculates or sets verification checks, status flags, or decisions.
   - All state transitions are guarded by optimistic versioning (`version`), application lifecycle constraints, and user ownership checks.

2. **Python Vision Isolation**:
   - Python NEVER connects to the business database.
   - Python does NOT accept raw client uploads directly; it only accesses files specified by Java using server-allocated keys under the private evidence mount.
   - Python returns raw metrics, scores, bounding boxes, and error codes; Java evaluates policies against these results.

3. **Cryptographic Protection of PII & Evidence**:
   - Applicant names, contact details, date of birth, addresses, and extracted field values are stored encrypted in the database using authenticated AES-256-GCM.
   - Duplicate NIC checks use a keyed HMAC (`nic_lookup_hmac`), never plaintext or unsalted hashes.
   - Evidence files (images and video) are encrypted at rest with opaque random storage keys.
   - Base64 binary data is NEVER stored in database rows.

4. **Zero-Fabrication Principle**:
   - If an OCR language, face recognition model, or PAD provider is absent, the system records `UNAVAILABLE` or `UNKNOWN` and issues a `REVIEW_REQUIRED` or `RECAPTURE_REQUIRED` recommendation.
   - A model returning `UNKNOWN` is never promoted to `PASS`.

5. **Durable Job Processing**:
   - Long-running vision tasks (OCR extraction, video analysis) are scheduled as asynchronous jobs in the database.
   - Worker claims jobs atomically with a time-bounded lease (`lease_until`), preventing duplicate processing.
   - Retries follow exponential backoff (max 3 demo retries).
   - Java does NOT hold database transactions open while waiting for Python HTTP requests.
