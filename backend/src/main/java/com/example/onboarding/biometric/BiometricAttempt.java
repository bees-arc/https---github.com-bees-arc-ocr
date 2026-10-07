package com.example.onboarding.biometric;

import com.example.onboarding.application.Application;
import com.example.onboarding.storage.EvidenceObject;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "biometric_attempts")
public class BiometricAttempt {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Column(nullable = false)
    private int generation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "challenge_id", nullable = false)
    private CameraChallenge challenge;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "video_evidence_id")
    private EvidenceObject videoEvidence;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "best_frame_evidence_id")
    private EvidenceObject bestFrameEvidence;

    @Column(nullable = false, length = 32)
    private String status;

    @Column(name = "started_at", nullable = false)
    private OffsetDateTime startedAt;

    @Column(name = "finished_at")
    private OffsetDateTime finishedAt;

    public BiometricAttempt() {}

    public BiometricAttempt(UUID id, Application application, int generation, CameraChallenge challenge, EvidenceObject videoEvidence, OffsetDateTime startedAt) {
        this.id = id;
        this.application = application;
        this.generation = generation;
        this.challenge = challenge;
        this.videoEvidence = videoEvidence;
        this.status = "PENDING";
        this.startedAt = startedAt;
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

    public int getGeneration() {
        return generation;
    }

    public void setGeneration(int generation) {
        this.generation = generation;
    }

    public CameraChallenge getChallenge() {
        return challenge;
    }

    public void setChallenge(CameraChallenge challenge) {
        this.challenge = challenge;
    }

    public EvidenceObject getVideoEvidence() {
        return videoEvidence;
    }

    public void setVideoEvidence(EvidenceObject videoEvidence) {
        this.videoEvidence = videoEvidence;
    }

    public EvidenceObject getBestFrameEvidence() {
        return bestFrameEvidence;
    }

    public void setBestFrameEvidence(EvidenceObject bestFrameEvidence) {
        this.bestFrameEvidence = bestFrameEvidence;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public OffsetDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(OffsetDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public OffsetDateTime getFinishedAt() {
        return finishedAt;
    }

    public void setFinishedAt(OffsetDateTime finishedAt) {
        this.finishedAt = finishedAt;
    }
}
