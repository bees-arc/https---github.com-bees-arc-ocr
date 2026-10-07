package com.example.onboarding.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "audit_events")
public class AuditEvent {

    @Id
    private UUID id;

    @Column(name = "application_id")
    private UUID applicationId;

    @Column(name = "actor_id")
    private UUID actorId;

    @Column(nullable = false, length = 128)
    private String action;

    @Column(name = "object_ref", length = 255)
    private String objectRef;

    @Column(name = "safe_metadata")
    private String safeMetadata;

    @Column(name = "correlation_id", length = 128)
    private String correlationId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    public AuditEvent() {}

    public AuditEvent(UUID id, UUID applicationId, UUID actorId, String action, String objectRef, String safeMetadata, String correlationId, OffsetDateTime createdAt) {
        this.id = id;
        this.applicationId = applicationId;
        this.actorId = actorId;
        this.action = action;
        this.objectRef = objectRef;
        this.safeMetadata = safeMetadata;
        this.correlationId = correlationId;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getApplicationId() {
        return applicationId;
    }

    public void setApplicationId(UUID applicationId) {
        this.applicationId = applicationId;
    }

    public UUID getActorId() {
        return actorId;
    }

    public void setActorId(UUID actorId) {
        this.actorId = actorId;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getObjectRef() {
        return objectRef;
    }

    public void setObjectRef(String objectRef) {
        this.objectRef = objectRef;
    }

    public String getSafeMetadata() {
        return safeMetadata;
    }

    public void setSafeMetadata(String safeMetadata) {
        this.safeMetadata = safeMetadata;
    }

    public String getCorrelationId() {
        return correlationId;
    }

    public void setCorrelationId(String correlationId) {
        this.correlationId = correlationId;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
