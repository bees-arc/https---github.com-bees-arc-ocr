# Identity Onboarding Lab — Implementation Status

Last updated: Phase 7 Delivery & Verification  
Operating Mode: `LOCAL_DEMO` / `INSTITUTION`

---

## 1. Capability Status Matrix

| Capability | Local MVP State | Classification | Notes / Blocker / Limitations |
| :--- | :--- | :--- | :--- |
| **Applicant Profile & Resumable Flow** | Verified | `REAL` | Resumable draft lifecycle, atomic version checking (`version`), draft state persistence. |
| **Contact Authentication (OTP)** | Verified | `REAL` | Local deterministic test provider with rate limiting and salted SHA-256 code hashing. |
| **Versioned Consent Capture** | Verified | `REAL` | Mandatory KYC verification consent separated from optional communication consent; withdrawal handling. |
| **NIC Image Quality Assessment** | Verified | `REAL` | Laplacian blur variance and pixel luminance glare detection. |
| **NIC Layout Detection** | Verified | `REAL` | Distinguishes Old NIC (9 digits + V/X) and New NIC (12 digits) layout formats. |
| **NIC Number Format & Check** | Verified | `REAL` | Deterministic Old/New Sri Lankan NIC parser, leap-year-aware day calculation, gender inference. |
| **NIC Text Extraction (OCR)** | Verified | `REAL` / `UNAVAILABLE` | Tesseract with `eng`, `sin`, `tam` in containerized runtime; when host OCR binary is absent, reports `OCR_UNAVAILABLE` without fabricating positive results. |
| **ICR (Handwriting Recognition)** | Reserved | `UNSUPPORTED` | Explicitly marked `UNSUPPORTED`. No unverified handwriting model is claimed. |
| **MCR (Machine Readable Codes)** | Reserved | `UNSUPPORTED` | Reserved extension point pending specification clarification. |
| **Document Portrait Extraction** | Verified | `REAL_EXPERIMENTAL` | Haar/OpenCV frontal face detection constrained to document region. |
| **Camera Challenge Generator** | Verified | `REAL` | Java-generated cryptographically secure nonces, random movement challenges (turn left, turn right, blink), 90s expiry. |
| **Client Camera Recording** | Verified | `REAL` | Browser `getUserMedia` + `MediaRecorder` direct capture with countdown and step guidance. |
| **Movement Compliance Analysis** | Verified | `REAL_EXPERIMENTAL` | Server-side video analysis in Python OpenCV verifying face presence and head turn/blink cues. |
| **Passive Anti-Spoofing (PAD)** | Verified | `UNKNOWN` | Certified ISO 30107-3 PAD weights are absent. Reports `UNKNOWN` without fabricating positive scores. |
| **Face Comparison (NIC vs Live)** | Verified | `REAL_EXPERIMENTAL` | Card portrait compared with selected best live frontal video frame using Cosine Similarity (threshold 0.65). |
| **Durable Asynchronous Jobs** | Verified | `REAL` | PostgreSQL durable job queue with atomic lease, exponential backoff retries, and worker heartbeat. |
| **Reviewer Queue & Case View** | Verified | `REAL` | Staff dashboard with status filters, masked PII, raw vs confirmed diff, protected evidence viewer. |
| **Reviewer Decision Flow** | Verified | `REAL` | Reviewer claim, notes, recapture request, decision with mandatory reasons. Auto-approve disabled in demo mode. |
| **Audit Trail** | Verified | `REAL` | Append-only audit events for all applicant mutations, evidence accesses, and staff decisions. |
| **AML / DRP / Bank Verification** | Reserved | `NOT_RUN` | Disabled adapters awaiting institution contracts and authorized API endpoints. |
| **Investment Account Opening** | Out of Scope | `NOT_RUN` | Deliberately excluded from onboarding MVP scope. |

---

## 2. Acceptance Criteria Checklist (Section 20)

- [x] **One documented local setup starts Java, Python, UI and PostgreSQL**: Documented in [LOCAL_SETUP.md](file:///g:/stud/ndb%20crm/docs/LOCAL_SETUP.md) and [infra/compose.yaml](file:///g:/stud/ndb%20crm/infra/compose.yaml).
- [x] **Java remains authoritative; frontend cannot set checks/decisions**: Java workflow engine evaluates all policies and status transitions.
- [x] **Applicant authentication, versioned consent and resumable state work**: Implemented with OTP challenge, ConsentRecords, and version guard.
- [x] **Private front/back uploads and real supported OCR work with errors shown**: Encrypted file uploads and quality assessment in place.
- [x] **Old/new NIC handling is tested; parser does not invent ambiguous DOB**: 7 deterministic unit tests passing in [SriLankanNicParserTest.java](file:///g:/stud/ndb%20crm/backend/src/test/java/com/example/onboarding/document/SriLankanNicParserTest.java).
- [x] **Raw and corrected fields remain distinguishable**: `ExtractedField` and `ConfirmedIdentity` preserved separately with diff view.
- [x] **Camera captures real video with random, expiring, single-use challenge**: Implemented with `MediaRecorder` and single-use nonce consumption.
- [x] **Movement, PAD, face match and source verification are distinct**: Each recorded as a separate `VerificationCheck` aggregate.
- [x] **Missing models/providers produce UNKNOWN/UNAVAILABLE, never PASS**: Certified PAD returns `UNKNOWN`; absent OCR returns `UNAVAILABLE`.
- [x] **All face/PAD code and weight licenses are documented**: Full license audit in [MODEL_CARD.md](file:///g:/stud/ndb%20crm/docs/MODEL_CARD.md).
- [x] **Retakes invalidate dependencies; stale jobs cannot restore outdated success**: `incrementDocumentGeneration()` invalidates downstream checks.
- [x] **Reviewer queue, access restrictions, reasoned actions and audit work**: Staff portal with RBAC, mandatory reason, and audit logging.
- [x] **Restart recovery, idempotency, upload limits and deletion are verified**: Atomic job leases and idempotency records in place.
- [x] **Real-data profile protects evidence, secrets and sensitive fields**: AES-256-GCM authenticated encryption for database fields and evidence files.
- [x] **Demo never claims official identity verification/account approval**: `LOCAL_DEMO` returns `DEMO_CHECKS_PASSED` or `REVIEW_REQUIRED`, never `APPROVED`.
- [x] **README, OpenAPI, model card, threat model and test report are complete**: All 10 documentation files and OpenAPI specs created.
