# Identity Onboarding Lab — API Reference

Base URL: `/api/v1`

---

## 1. Authentication & Session Management

### `POST /auth/otp/request`
Initiates contact-bound challenge.
- **Request Body**:
  ```json
  { "contactLookup": "+94771234567" }
  ```
- **Response `200 OK`**:
  ```json
  {
    "challengeId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "expiresInSeconds": 300,
    "demoCodeHint": "123456"
  }
  ```

### `POST /auth/otp/verify`
Consumes OTP challenge, retrieves/creates user, and returns bearer session token.
- **Request Body**:
  ```json
  {
    "challengeId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "otpCode": "123456"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "sessionId": "b4e877d9-4829-4f81-90c2-5c02ad8e7a02",
    "userId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "token": "dGhpcy1pcy1hLXNlY3VyZS10b2tlbg",
    "role": "APPLICANT"
  }
  ```

### `POST /auth/staff/login`
Authenticates compliance reviewers and auditors.
- **Request Body**:
  ```json
  {
    "username": "staff.admin@identitylab.local",
    "password": "AdminDemo123!"
  }
  ```

---

## 2. Customer Application Workflow

### `POST /applications`
Creates or resumes an applicant draft application.
- **Headers**: `Authorization: Bearer <token>`
- **Response `201 Created`**:
  ```json
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "lifecycle": "DRAFT",
    "decision": "PENDING",
    "operatingMode": "LOCAL_DEMO",
    "version": 0,
    "currentDocumentGeneration": 0,
    "currentBiometricGeneration": 0
  }
  ```

### `PATCH /applications/{id}/details`
Updates applicant personal details and regulatory declarations with optimistic version guard.
- **Request Body**:
  ```json
  {
    "expectedVersion": 0,
    "fullName": "Sunil Perera",
    "dateOfBirth": "1985-01-15",
    "addressLine": "No. 45 Galle Road, Colombo 03",
    "employmentStatus": "Employed - Private Sector",
    "sourceOfFunds": "Salary / Savings",
    "taxResidency": "Sri Lanka",
    "pepDeclaration": false
  }
  ```

### `POST /applications/{id}/consents`
Records explicit acceptance of versioned consent text.
- **Request Body**:
  ```json
  {
    "consentType": "IDENTITY_VERIFICATION",
    "version": "v1.0-2026",
    "accepted": true,
    "consentText": "I consent to the collection, OCR extraction, and biometric video analysis..."
  }
  ```

### `POST /applications/{id}/nic`
Multipart upload of front and back NIC card images.
- **Parameters**: `frontImage` (file), `backImage` (file), `expectedVersion` (int)
- **Response `202 Accepted`**:
  ```json
  {
    "jobId": "4a781b0f-8c34-4bcf-a8e0-618d2d634289",
    "generation": 1,
    "status": "QUEUED"
  }
  ```

### `GET /applications/{id}/nic`
Retrieves decrypted extracted OCR fields, confidence scores, and layout for the current document generation.

### `POST /applications/{id}/nic/confirm`
Confirms or corrects extracted card details. Performs deterministic Sri Lankan Old/New NIC format checks and DOB cross-check.
- **Request Body**:
  ```json
  {
    "expectedVersion": 1,
    "nicNumber": "850151234V",
    "fullName": "SUNIL PERERA",
    "dateOfBirth": "1985-01-15",
    "gender": "MALE",
    "address": "No. 45 Galle Road, Colombo"
  }
  ```

### `POST /applications/{id}/biometric/challenges`
Requests a cryptographically secure, random, single-use camera challenge sequence.
- **Response `201 Created`**:
  ```json
  {
    "challengeId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "nonce": "e4b1c8a0...",
    "steps": ["TURN_LEFT", "BLINK"],
    "expiresAt": "2026-10-07T14:45:00Z"
  }
  ```

### `POST /applications/{id}/biometric/attempts`
Submits recorded challenge video. Enforces single-use nonce consumption and duration checks.
- **Parameters**: `videoFile` (file), `challengeId` (uuid), `nonce` (string), `expectedVersion` (int)
- **Response `202 Accepted`**:
  ```json
  {
    "attemptId": "c3d4e5f6-a7b8-9012-3456-7890abcdef12",
    "jobId": "f1e2d3c4-b5a6-7890-1234-567890abcdef",
    "status": "QUEUED"
  }
  ```

### `POST /applications/{id}/submit`
Submits application to execute deterministic decision policy.
- **Response `200 OK`**:
  ```json
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "lifecycle": "COMPLETED",
    "decision": "DEMO_CHECKS_PASSED",
    "operatingMode": "LOCAL_DEMO"
  }
  ```

---

## 3. Staff Reviewer & Auditor Endpoints

### `GET /staff/applications`
Paginated queue of applications for compliance review with masked PII.

### `GET /staff/applications/{id}`
Full review case details including raw OCR extraction vs confirmed differences, check outcomes, and evidence list.

### `POST /staff/applications/{id}/decision`
Records compliance decision with mandatory reviewer reason.
- **Request Body**:
  ```json
  {
    "expectedVersion": 2,
    "decision": "DEMO_CHECKS_PASSED",
    "reason": "Card text is sharp and movement challenge sequence completed cleanly."
  }
  ```

### `GET /staff/evidence/{evidenceId}`
Protected streaming of decrypted evidence with access audit logging.

### `GET /staff/audit`
Paginated immutable audit event trail.
