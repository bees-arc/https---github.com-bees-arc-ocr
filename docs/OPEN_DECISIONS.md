# Identity Onboarding Lab — Open Decisions Log

Per Section 22 of the master specification, the following decisions require formal institution input and are tracked here without making unauthorized assumptions.

| ID | Topic | Current Local MVP Stance | Institution Input Required | Status |
| :--- | :--- | :--- | :--- | :--- |
| **DEC-001** | Target Institution & Regulatory Framework | Neutral placeholder "Identity Onboarding Lab"; follow FIU Sri Lanka non-face-to-face guidelines as design reference. | Specific institution licensing (e.g., SEC-regulated unit trust vs CBSL-regulated banking) and applicable CDD rules. | `OPEN` |
| **DEC-002** | Meaning of MCR Requirement | Reserved extension point in architecture. Not substituted with MICR or MRZ. | Formal definition from business stakeholders regarding whether MCR refers to barcode/QR on Smart NIC or something else. | `PENDING_CLARIFICATION` |
| **DEC-003** | Authorized Identity Source Verification | External source adapter remains in `NOT_RUN` state. | Authorized access credentials and MOU with Department of Registration of Persons (DRP) or certified gateway. | `BLOCKED_INTEGRATION` |
| **DEC-004** | Certified PAD Provider Selection | Movement challenge analysis implemented; PAD reported as `UNKNOWN`. | Approved ISO 30107-3 compliant commercial/in-house PAD provider for production deployment. | `OPEN` |
| **DEC-005** | Legal Consent & Retention Policy | 24h demo retention for raw video, 7 days for test applications. Explicit withdrawal handling. | Institution legal counsel review of consent wording and statutory document retention schedules (e.g., 5-7 years). | `OPEN` |
| **DEC-006** | Face Comparison Acceptance Threshold | Experimental threshold default `0.65` cosine similarity. | Statistical calibration on diverse Sri Lankan demographic sample to establish target FAR/FRR trade-off. | `OPEN` |
