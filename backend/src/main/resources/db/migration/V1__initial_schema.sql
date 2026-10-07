-- V1__initial_schema.sql: Identity Onboarding Lab Base Schema

CREATE TABLE users (
    id UUID PRIMARY KEY,
    role VARCHAR(32) NOT NULL,
    contact_lookup VARCHAR(128),
    password_hash VARCHAR(255),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE auth_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    token_hash VARCHAR(128) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE otp_challenges (
    id UUID PRIMARY KEY,
    contact_lookup VARCHAR(128) NOT NULL,
    code_hash VARCHAR(128) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    used_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE customers (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    full_name_encrypted TEXT,
    contact_encrypted TEXT,
    address_encrypted TEXT,
    dob_encrypted TEXT,
    employment_status TEXT,
    source_of_funds TEXT,
    tax_residency TEXT,
    pep_declaration BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE applications (
    id UUID PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id),
    lifecycle VARCHAR(32) NOT NULL,
    decision VARCHAR(32) NOT NULL,
    operating_mode VARCHAR(32) NOT NULL,
    current_document_generation INT NOT NULL DEFAULT 0,
    current_biometric_generation INT NOT NULL DEFAULT 0,
    policy_version VARCHAR(64) NOT NULL,
    version INT NOT NULL DEFAULT 0,
    submitted_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE consent_records (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id),
    consent_type VARCHAR(64) NOT NULL,
    version VARCHAR(32) NOT NULL,
    text_hash VARCHAR(128) NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    actor_id UUID NOT NULL REFERENCES users(id)
);

CREATE TABLE evidence_objects (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id),
    kind VARCHAR(64) NOT NULL,
    storage_key VARCHAR(128) NOT NULL UNIQUE,
    sha256 VARCHAR(64) NOT NULL,
    mime VARCHAR(64) NOT NULL,
    byte_size BIGINT NOT NULL,
    generation INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    retention_until TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE nic_documents (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id),
    generation INT NOT NULL,
    front_evidence_id UUID REFERENCES evidence_objects(id),
    back_evidence_id UUID REFERENCES evidence_objects(id),
    layout VARCHAR(32),
    processing_status VARCHAR(32) NOT NULL
);

CREATE TABLE extracted_fields (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES nic_documents(id),
    field_name VARCHAR(64) NOT NULL,
    raw_value_encrypted TEXT,
    normalized_value_encrypted TEXT,
    confidence DOUBLE PRECISION,
    bounding_boxes TEXT,
    script VARCHAR(32),
    warnings TEXT
);

CREATE TABLE confirmed_identity (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id),
    document_id UUID REFERENCES nic_documents(id),
    full_name_encrypted TEXT NOT NULL,
    nic_number_encrypted TEXT NOT NULL,
    dob_encrypted TEXT NOT NULL,
    gender_encrypted TEXT NOT NULL,
    address_encrypted TEXT,
    nic_lookup_hmac VARCHAR(128) NOT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    confirmed_by UUID NOT NULL REFERENCES users(id),
    version INT NOT NULL DEFAULT 0
);

CREATE TABLE camera_challenges (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id),
    generation INT NOT NULL,
    nonce_hash VARCHAR(128) NOT NULL,
    steps TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE biometric_attempts (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id),
    generation INT NOT NULL,
    challenge_id UUID NOT NULL REFERENCES camera_challenges(id),
    video_evidence_id UUID REFERENCES evidence_objects(id),
    best_frame_evidence_id UUID REFERENCES evidence_objects(id),
    status VARCHAR(32) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    finished_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE verification_checks (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id),
    check_type VARCHAR(64) NOT NULL,
    attempt_id UUID,
    status VARCHAR(32) NOT NULL,
    execution_mode VARCHAR(32) NOT NULL,
    score DOUBLE PRECISION,
    threshold DOUBLE PRECISION,
    score_type VARCHAR(64),
    provider VARCHAR(64),
    model_version VARCHAR(64),
    reason_codes TEXT,
    evidence_ids TEXT,
    policy_version VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE processing_jobs (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id),
    attempt_id UUID,
    kind VARCHAR(64) NOT NULL,
    state VARCHAR(32) NOT NULL,
    retry_count INT NOT NULL DEFAULT 0,
    available_at TIMESTAMP WITH TIME ZONE NOT NULL,
    lease_until TIMESTAMP WITH TIME ZONE,
    worker_id VARCHAR(128),
    dedup_key VARCHAR(255) UNIQUE,
    last_error_code VARCHAR(128)
);

CREATE TABLE review_cases (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id),
    assigned_to UUID REFERENCES users(id),
    state VARCHAR(32) NOT NULL,
    reason_codes TEXT,
    opened_at TIMESTAMP WITH TIME ZONE NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE,
    version INT NOT NULL DEFAULT 0
);

CREATE TABLE review_actions (
    id UUID PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES review_cases(id),
    actor_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(64) NOT NULL,
    reason TEXT NOT NULL,
    previous_decision VARCHAR(32),
    new_decision VARCHAR(32),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE audit_events (
    id UUID PRIMARY KEY,
    application_id UUID,
    actor_id UUID,
    action VARCHAR(128) NOT NULL,
    object_ref VARCHAR(255),
    safe_metadata TEXT,
    correlation_id VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE idempotency_records (
    id UUID PRIMARY KEY,
    actor_id UUID,
    route VARCHAR(255) NOT NULL,
    key VARCHAR(255) NOT NULL,
    request_hash VARCHAR(128) NOT NULL,
    safe_response TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uk_idempotency_actor_route_key UNIQUE (actor_id, route, key)
);

CREATE TABLE policy_versions (
    id VARCHAR(64) PRIMARY KEY,
    config TEXT NOT NULL,
    operating_mode VARCHAR(32) NOT NULL,
    activated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    actor_id UUID REFERENCES users(id)
);

-- Indices for high-frequency queries and joins
CREATE INDEX idx_applications_customer ON applications(customer_id);
CREATE INDEX idx_applications_decision_sub ON applications(decision, submitted_at);
CREATE INDEX idx_jobs_state_avail ON processing_jobs(state, available_at);
CREATE INDEX idx_checks_app_created ON verification_checks(application_id, created_at);
CREATE INDEX idx_review_cases_state_assign ON review_cases(state, assigned_to);
CREATE INDEX idx_audit_app_created ON audit_events(application_id, created_at);
