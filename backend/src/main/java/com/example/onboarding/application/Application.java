package com.example.onboarding.application;

import com.example.onboarding.customer.Customer;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "applications")
public class Application {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ApplicationLifecycle lifecycle;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private DecisionOutcome decision;

    @Enumerated(EnumType.STRING)
    @Column(name = "operating_mode", nullable = false, length = 32)
    private OperatingMode operatingMode;

    @Column(name = "current_document_generation", nullable = false)
    private int currentDocumentGeneration = 0;

    @Column(name = "current_biometric_generation", nullable = false)
    private int currentBiometricGeneration = 0;

    @Column(name = "policy_version", nullable = false, length = 64)
    private String policyVersion;

    @Version
    @Column(nullable = false)
    private int version = 0;

    @Column(name = "submitted_at")
    private OffsetDateTime submittedAt;

    @Column(name = "expires_at")
    private OffsetDateTime expiresAt;

    public Application() {}

    public Application(UUID id, Customer customer, OperatingMode operatingMode, String policyVersion) {
        this.id = id;
        this.customer = customer;
        this.lifecycle = ApplicationLifecycle.DRAFT;
        this.decision = DecisionOutcome.PENDING;
        this.operatingMode = operatingMode;
        this.policyVersion = policyVersion;
        this.currentDocumentGeneration = 0;
        this.currentBiometricGeneration = 0;
        this.version = 0;
        this.expiresAt = OffsetDateTime.now().plusDays(7);
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Customer getCustomer() {
        return customer;
    }

    public void setCustomer(Customer customer) {
        this.customer = customer;
    }

    public ApplicationLifecycle getLifecycle() {
        return lifecycle;
    }

    public void setLifecycle(ApplicationLifecycle lifecycle) {
        this.lifecycle = lifecycle;
    }

    public DecisionOutcome getDecision() {
        return decision;
    }

    public void setDecision(DecisionOutcome decision) {
        this.decision = decision;
    }

    public OperatingMode getOperatingMode() {
        return operatingMode;
    }

    public void setOperatingMode(OperatingMode operatingMode) {
        this.operatingMode = operatingMode;
    }

    public int getCurrentDocumentGeneration() {
        return currentDocumentGeneration;
    }

    public void setCurrentDocumentGeneration(int currentDocumentGeneration) {
        this.currentDocumentGeneration = currentDocumentGeneration;
    }

    public int incrementDocumentGeneration() {
        this.currentDocumentGeneration++;
        return this.currentDocumentGeneration;
    }

    public int getCurrentBiometricGeneration() {
        return currentBiometricGeneration;
    }

    public void setCurrentBiometricGeneration(int currentBiometricGeneration) {
        this.currentBiometricGeneration = currentBiometricGeneration;
    }

    public int incrementBiometricGeneration() {
        this.currentBiometricGeneration++;
        return this.currentBiometricGeneration;
    }

    public String getPolicyVersion() {
        return policyVersion;
    }

    public void setPolicyVersion(String policyVersion) {
        this.policyVersion = policyVersion;
    }

    public int getVersion() {
        return version;
    }

    public void setVersion(int version) {
        this.version = version;
    }

    public OffsetDateTime getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(OffsetDateTime submittedAt) {
        this.submittedAt = submittedAt;
    }

    public OffsetDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(OffsetDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }
}
