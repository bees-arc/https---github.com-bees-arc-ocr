package com.example.onboarding.document;

import com.example.onboarding.application.Application;
import com.example.onboarding.customer.User;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "confirmed_identity")
public class ConfirmedIdentity {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id")
    private NicDocument document;

    @Column(name = "full_name_encrypted", nullable = false)
    private String fullNameEncrypted;

    @Column(name = "nic_number_encrypted", nullable = false)
    private String nicNumberEncrypted;

    @Column(name = "dob_encrypted", nullable = false)
    private String dobEncrypted;

    @Column(name = "gender_encrypted", nullable = false)
    private String genderEncrypted;

    @Column(name = "address_encrypted")
    private String addressEncrypted;

    @Column(name = "nic_lookup_hmac", nullable = false, length = 128)
    private String nicLookupHmac;

    @Column(name = "confirmed_at", nullable = false)
    private OffsetDateTime confirmedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "confirmed_by", nullable = false)
    private User confirmedBy;

    @Version
    @Column(nullable = false)
    private Integer version;

    public ConfirmedIdentity() {}

    public ConfirmedIdentity(UUID id, Application application, NicDocument document, String fullNameEncrypted, String nicNumberEncrypted, String dobEncrypted, String genderEncrypted, String addressEncrypted, String nicLookupHmac, OffsetDateTime confirmedAt, User confirmedBy) {
        this.id = id;
        this.application = application;
        this.document = document;
        this.fullNameEncrypted = fullNameEncrypted;
        this.nicNumberEncrypted = nicNumberEncrypted;
        this.dobEncrypted = dobEncrypted;
        this.genderEncrypted = genderEncrypted;
        this.addressEncrypted = addressEncrypted;
        this.nicLookupHmac = nicLookupHmac;
        this.confirmedAt = confirmedAt;
        this.confirmedBy = confirmedBy;
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

    public NicDocument getDocument() {
        return document;
    }

    public void setDocument(NicDocument document) {
        this.document = document;
    }

    public String getFullNameEncrypted() {
        return fullNameEncrypted;
    }

    public void setFullNameEncrypted(String fullNameEncrypted) {
        this.fullNameEncrypted = fullNameEncrypted;
    }

    public String getNicNumberEncrypted() {
        return nicNumberEncrypted;
    }

    public void setNicNumberEncrypted(String nicNumberEncrypted) {
        this.nicNumberEncrypted = nicNumberEncrypted;
    }

    public String getDobEncrypted() {
        return dobEncrypted;
    }

    public void setDobEncrypted(String dobEncrypted) {
        this.dobEncrypted = dobEncrypted;
    }

    public String getGenderEncrypted() {
        return genderEncrypted;
    }

    public void setGenderEncrypted(String genderEncrypted) {
        this.genderEncrypted = genderEncrypted;
    }

    public String getAddressEncrypted() {
        return addressEncrypted;
    }

    public void setAddressEncrypted(String addressEncrypted) {
        this.addressEncrypted = addressEncrypted;
    }

    public String getNicLookupHmac() {
        return nicLookupHmac;
    }

    public void setNicLookupHmac(String nicLookupHmac) {
        this.nicLookupHmac = nicLookupHmac;
    }

    public OffsetDateTime getConfirmedAt() {
        return confirmedAt;
    }

    public void setConfirmedAt(OffsetDateTime confirmedAt) {
        this.confirmedAt = confirmedAt;
    }

    public User getConfirmedBy() {
        return confirmedBy;
    }

    public void setConfirmedBy(User confirmedBy) {
        this.confirmedBy = confirmedBy;
    }

    public int getVersion() {
        return version != null ? version : 0;
    }

    public void setVersion(Integer version) {
        this.version = version;
    }
}
