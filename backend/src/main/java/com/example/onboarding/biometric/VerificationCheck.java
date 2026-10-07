package com.example.onboarding.biometric;

import com.example.onboarding.application.Application;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "verification_checks")
public class VerificationCheck {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Column(name = "check_type", nullable = false, length = 64)
    private String checkType;

    @Column(name = "attempt_id")
    private UUID attemptId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private CheckStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "execution_mode", nullable = false, length = 32)
    private ExecutionMode executionMode;

    @Column
    private Double score;

    @Column
    private Double threshold;

    @Column(name = "score_type", length = 64)
    private String scoreType;

    @Column(length = 64)
    private String provider;

    @Column(name = "model_version", length = 64)
    private String modelVersion;

    @Column(name = "reason_codes")
    private String reasonCodes;

    @Column(name = "evidence_ids")
    private String evidenceIds;

    @Column(name = "policy_version", length = 64)
    private String policyVersion;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    public VerificationCheck() {}

    public VerificationCheck(UUID id, Application application, String checkType, UUID attemptId, CheckStatus status, ExecutionMode executionMode, Double score, Double threshold, String scoreType, String provider, String modelVersion, String reasonCodes, String policyVersion, OffsetDateTime createdAt) {
        this.id = id;
        this.application = application;
        this.checkType = checkType;
        this.attemptId = attemptId;
        this.status = status;
        this.executionMode = executionMode;
        this.score = score;
        this.threshold = threshold;
        this.scoreType = scoreType;
        this.provider = provider;
        this.modelVersion = modelVersion;
        this.reasonCodes = reasonCodes;
        this.policyVersion = policyVersion;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Application getApplication() {
        return application;
    }

    public void setApplication(Application application) {
        this.application = application;
    }

    public String getCheckType() {
        return checkType;
    }

    public void setCheckType(String checkType) {
        this.checkType = checkType;
    }

    public UUID getAttemptId() {
        return attemptId;
    }

    public void setAttemptId(UUID attemptId) {
        this.attemptId = attemptId;
    }

    public CheckStatus getStatus() {
        return status;
    }

    public void setStatus(CheckStatus status) {
        this.status = status;
    }

    public ExecutionMode getExecutionMode() {
        return executionMode;
    }

    public void setExecutionMode(ExecutionMode executionMode) {
        this.executionMode = executionMode;
    }

    public Double getScore() {
        return score;
    }

    public void setScore(Double score) {
        this.score = score;
    }

    public Double getThreshold() {
        return threshold;
    }

    public void setThreshold(Double threshold) {
        this.threshold = threshold;
    }

    public String getScoreType() {
        return scoreType;
    }

    public void setScoreType(String scoreType) {
        this.scoreType = scoreType;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getModelVersion() {
        return modelVersion;
    }

    public void setModelVersion(String modelVersion) {
        this.modelVersion = modelVersion;
    }

    public String getReasonCodes() {
        return reasonCodes;
    }

    public void setReasonCodes(String reasonCodes) {
        this.reasonCodes = reasonCodes;
    }

    public String getEvidenceIds() {
        return evidenceIds;
    }

    public void setEvidenceIds(String evidenceIds) {
        this.evidenceIds = evidenceIds;
    }

    public String getPolicyVersion() {
        return policyVersion;
    }

    public void setPolicyVersion(String policyVersion) {
        this.policyVersion = policyVersion;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
