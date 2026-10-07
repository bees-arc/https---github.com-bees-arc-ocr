package com.example.onboarding.customer;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "customers")
public class Customer {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "full_name_encrypted")
    private String fullNameEncrypted;

    @Column(name = "contact_encrypted")
    private String contactEncrypted;

    @Column(name = "address_encrypted")
    private String addressEncrypted;

    @Column(name = "dob_encrypted")
    private String dobEncrypted;

    @Column(name = "employment_status")
    private String employmentStatus;

    @Column(name = "source_of_funds")
    private String sourceOfFunds;

    @Column(name = "tax_residency")
    private String taxResidency;

    @Column(name = "pep_declaration")
    private Boolean pepDeclaration = false;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public Customer() {}

    public Customer(UUID id, User user, OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this.id = id;
        this.user = user;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getFullNameEncrypted() {
        return fullNameEncrypted;
    }

    public void setFullNameEncrypted(String fullNameEncrypted) {
        this.fullNameEncrypted = fullNameEncrypted;
    }

    public String getContactEncrypted() {
        return contactEncrypted;
    }

    public void setContactEncrypted(String contactEncrypted) {
        this.contactEncrypted = contactEncrypted;
    }

    public String getAddressEncrypted() {
        return addressEncrypted;
    }

    public void setAddressEncrypted(String addressEncrypted) {
        this.addressEncrypted = addressEncrypted;
    }

    public String getDobEncrypted() {
        return dobEncrypted;
    }

    public void setDobEncrypted(String dobEncrypted) {
        this.dobEncrypted = dobEncrypted;
    }

    public String getEmploymentStatus() {
        return employmentStatus;
    }

    public void setEmploymentStatus(String employmentStatus) {
        this.employmentStatus = employmentStatus;
    }

    public String getSourceOfFunds() {
        return sourceOfFunds;
    }

    public void setSourceOfFunds(String sourceOfFunds) {
        this.sourceOfFunds = sourceOfFunds;
    }

    public String getTaxResidency() {
        return taxResidency;
    }

    public void setTaxResidency(String taxResidency) {
        this.taxResidency = taxResidency;
    }

    public Boolean getPepDeclaration() {
        return pepDeclaration;
    }

    public void setPepDeclaration(Boolean pepDeclaration) {
        this.pepDeclaration = pepDeclaration;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
