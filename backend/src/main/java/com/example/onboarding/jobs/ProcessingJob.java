package com.example.onboarding.jobs;

import com.example.onboarding.application.Application;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "processing_jobs")
public class ProcessingJob {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Column(name = "attempt_id")
    private UUID attemptId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64)
    private JobKind kind;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private JobState state;

    @Column(name = "retry_count", nullable = false)
    private int retryCount = 0;

    @Column(name = "available_at", nullable = false)
    private OffsetDateTime availableAt;

    @Column(name = "lease_until")
    private OffsetDateTime leaseUntil;

    @Column(name = "worker_id", length = 128)
    private String workerId;

    @Column(name = "dedup_key", unique = true, length = 255)
    private String dedupKey;

    @Column(name = "last_error_code", length = 128)
    private String lastErrorCode;

    public ProcessingJob() {}

    public ProcessingJob(UUID id, Application application, UUID attemptId, JobKind kind, String dedupKey) {
        this.id = id;
        this.application = application;
        this.attemptId = attemptId;
        this.kind = kind;
        this.state = JobState.QUEUED;
        this.retryCount = 0;
        this.availableAt = OffsetDateTime.now();
        this.dedupKey = dedupKey;
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

    public UUID getAttemptId() {
        return attemptId;
    }

    public void setAttemptId(UUID attemptId) {
        this.attemptId = attemptId;
    }

    public JobKind getKind() {
        return kind;
    }

    public void setKind(JobKind kind) {
        this.kind = kind;
    }

    public JobState getState() {
        return state;
    }

    public void setState(JobState state) {
        this.state = state;
    }

    public int getRetryCount() {
        return retryCount;
    }

    public void setRetryCount(int retryCount) {
        this.retryCount = retryCount;
    }

    public OffsetDateTime getAvailableAt() {
        return availableAt;
    }

    public void setAvailableAt(OffsetDateTime availableAt) {
        this.availableAt = availableAt;
    }

    public OffsetDateTime getLeaseUntil() {
        return leaseUntil;
    }

    public void setLeaseUntil(OffsetDateTime leaseUntil) {
        this.leaseUntil = leaseUntil;
    }

    public String getWorkerId() {
        return workerId;
    }

    public void setWorkerId(String workerId) {
        this.workerId = workerId;
    }

    public String getDedupKey() {
        return dedupKey;
    }

    public void setDedupKey(String dedupKey) {
        this.dedupKey = dedupKey;
    }

    public String getLastErrorCode() {
        return lastErrorCode;
    }

    public void setLastErrorCode(String lastErrorCode) {
        this.lastErrorCode = lastErrorCode;
    }
}
