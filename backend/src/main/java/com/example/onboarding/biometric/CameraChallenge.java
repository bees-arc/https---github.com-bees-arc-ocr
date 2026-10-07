package com.example.onboarding.biometric;

import com.example.onboarding.application.Application;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "camera_challenges")
public class CameraChallenge {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Column(nullable = false)
    private int generation;

    @Column(name = "nonce_hash", nullable = false, length = 128)
    private String nonceHash;

    @Column(nullable = false)
    private String steps; // JSON or comma-separated steps

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "consumed_at")
    private OffsetDateTime consumedAt;

    public CameraChallenge() {}

    public CameraChallenge(UUID id, Application application, int generation, String nonceHash, String steps, OffsetDateTime expiresAt) {
        this.id = id;
        this.application = application;
        this.generation = generation;
        this.nonceHash = nonceHash;
        this.steps = steps;
        this.expiresAt = expiresAt;
    }

    public boolean isUsable() {
        return consumedAt == null && expiresAt.isAfter(OffsetDateTime.now());
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

    public String getNonceHash() {
        return nonceHash;
    }

    public void setNonceHash(String nonceHash) {
        this.nonceHash = nonceHash;
    }

    public String getSteps() {
        return steps;
    }

    public void setSteps(String steps) {
        this.steps = steps;
    }

    public OffsetDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(OffsetDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }

    public OffsetDateTime getConsumedAt() {
        return consumedAt;
    }

    public void setConsumedAt(OffsetDateTime consumedAt) {
        this.consumedAt = consumedAt;
    }
}
