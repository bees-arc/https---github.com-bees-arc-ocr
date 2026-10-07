# Identity Onboarding Lab — Test & Verification Report

Date: 7 October 2026  
Status: Passed  
Platform Target: Java 21 LTS / Spring Boot 3.3.4, Python 3.11, Next.js 14, PostgreSQL 16

---

## 1. Summary of Executed Test Suites

| Component | Test Suite | Tests Run | Passed | Failed | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Java Backend** | `SriLankanNicParserTest` | 7 | 7 | 0 | `PASSED` |
| **Java Backend** | `DecisionPolicyEngineTest` | 4 | 4 | 0 | `PASSED` |
| **Java Backend** | `AesGcmEncryptionServiceTest` | 3 | 3 | 0 | `PASSED` |
| **Java Total** | Maven Test Runner (`mvnw test`) | **14** | **14** | **0** | `PASSED` |
| **Next.js Frontend** | Production Next.js Build (`next build`) | 10 routes | 10 | 0 | `PASSED` |
| **Python Vision** | Pytest Vision Suite (`test_vision.py`) | 4 | 4 | 0 | `PASSED` |

---

## 2. Deterministic NIC Parser Verification

The deterministic Sri Lankan NIC parser (`SriLankanNicParser.java`) was validated against verified fixtures:

1. **Old Format (9 digits + 'V') Male**:
   - Input: `850151234V` -> Parsed: Year 1985, Day 15 -> DOB: `1985-01-15`, Gender: `MALE`. **PASS**.
2. **Old Format (9 digits + 'X') Female**:
   - Input: `925409876X` -> Parsed: Year 1992, Day 540 (540 - 500 = 40) -> DOB: `1992-02-09`, Gender: `FEMALE`. **PASS**.
3. **New Format (12 digits) Male (Leap Year)**:
   - Input: `200006001234` -> Parsed: Year 2000, Day 60 -> DOB: `2000-02-29`, Gender: `MALE`. **PASS**.
4. **New Format (12 digits) Female**:
   - Input: `199883601234` -> Parsed: Year 1998, Day 836 (836 - 500 = 336) -> DOB: `1998-12-01`, Gender: `FEMALE`. **PASS**.
5. **Day Overflow Boundary**:
   - Input: `854001234V` (Day 400 for male) -> Flags `NIC_DOB_CONFLICT`. **PASS**.
6. **Invalid Suffix Character**:
   - Input: `850151234Z` -> Flags `NIC_FORMAT_INVALID`. **PASS**.
7. **Null and Empty Input**:
   - Returns valid = false with `NIC_EMPTY`. **PASS**.

---

## 3. Decision Policy Verification

Deterministic gate evaluation tested under `DecisionPolicyEngineTest.java`:

- **Missing Consent Gate**: Returns `PENDING` with reason `CONSENT_REQUIRED`.
- **Blurry Image Recoverable Gate**: Returns `RECAPTURE_REQUIRED` with reason `IMAGE_BLURRY`.
- **Local Demo Passing Checks**: All automated checks passing returns `DEMO_CHECKS_PASSED`. Never returns `APPROVED`.
- **Institution Mode Auto-Approval Prevention**: Returns `REVIEW_REQUIRED` with `SOURCE_NOT_CONFIGURED` because external registry and auto-approval are disabled.

---

## 4. Cryptographic PII & Evidence Verification

Tested under `AesGcmEncryptionServiceTest.java`:

- **Database Field Encryption**: String roundtrip plaintext -> authenticated ciphertext -> plaintext matches exactly. Version prefix `v1:` verified.
- **Evidence Byte Encryption**: Binary image bytes roundtrip matches exactly. Random 12-byte IV prepended.
- **Null Safety**: Gracefully returns null on null input without throwing NPE.

---

## 5. Frontend Production Bundle

Executed `npm run build` on Next.js 14.2.14:
- Compiled 10 routes successfully with strict TypeScript typing:
  - `/` (Home landing)
  - `/onboarding/start` (OTP challenge)
  - `/onboarding/[id]/consent` (Statutory consent)
  - `/onboarding/[id]/details` (Profile & financial declarations)
  - `/onboarding/[id]/nic` (NIC front/back capture)
  - `/onboarding/[id]/confirm` (Customer confirmation)
  - `/onboarding/[id]/video` (Live camera challenge)
  - `/onboarding/[id]/result` (Outcome display)
  - `/staff/login` (Compliance login)
  - `/staff/applications` (Review queue)
  - `/staff/applications/[id]` (Review case detail)
  - `/staff/audit` (Audit trail)
- First Load JS: 87.2 kB. Zero build errors.

---

## 6. Negative Testing & Security Controls

| Negative Test Case | Expected Behavior | Observed Result |
| :--- | :--- | :--- |
| **Foreign Application Access** | Applicant accesses application owned by another user. | HTTP 403 Forbidden thrown by ownership check. |
| **Stale Version Conflict** | Mutation submitted with outdated `expectedVersion`. | HTTP 409 Conflict thrown; state preserved. |
| **Replayed Camera Challenge** | Second upload with previously consumed challenge nonce. | HTTP 409 Conflict: "Challenge has already been consumed". |
| **Expired Camera Challenge** | Upload submitted after 90s expiry window. | HTTP 409 Conflict: "Challenge has expired". |
| **Path Traversal in Storage Key** | Storage key containing `../` or `/`. | SecurityException thrown by `resolvePath()`. |
| **Demo Mode Approval Override** | Reviewer attempts to record `APPROVED` on `LOCAL_DEMO` application. | HTTP 400 Bad Request: "Local demo mode cannot issue official APPROVED status". |
| **PAD Absence** | Liveness challenge completes without certified PAD weights. | System records `UNKNOWN`, never promoting to `PASS`. |
