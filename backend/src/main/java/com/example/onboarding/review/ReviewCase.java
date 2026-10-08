package com.example.onboarding.review;

import com.example.onboarding.application.Application;
import com.example.onboarding.customer.User;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "review_cases")
public class ReviewCase {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to")
    private User assignedTo;

    @Column(nullable = false, length = 32)
    private String state; // OPEN, ASSIGNED, RESOLVED

    @Column(name = "reason_codes")
    private String reasonCodes;

    @Column(name = "opened_at", nullable = false)
    private OffsetDateTime openedAt;

    @Column(name = "closed_at")
    private OffsetDateTime closedAt;

    @Version
    @Column(nullable = false)
    private Integer version;

    public ReviewCase() {}

    public ReviewCase(UUID id, Application application, String reasonCodes, OffsetDateTime openedAt) {
        this.id = id;
        this.application = application;
        this.reasonCodes = reasonCodes;
        this.state = "OPEN";
        this.openedAt = openedAt;
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

    public User getAssignedTo() {
        return assignedTo;
    }

    public void setAssignedTo(User assignedTo) {
        this.assignedTo = assignedTo;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public String getReasonCodes() {
        return reasonCodes;
    }

    public void setReasonCodes(String reasonCodes) {
        this.reasonCodes = reasonCodes;
    }

    public OffsetDateTime getOpenedAt() {
        return openedAt;
    }

    public void setOpenedAt(OffsetDateTime openedAt) {
        this.openedAt = openedAt;
    }

    public OffsetDateTime getClosedAt() {
        return closedAt;
    }

    public void setClosedAt(OffsetDateTime closedAt) {
        this.closedAt = closedAt;
    }

    public int getVersion() {
        return version != null ? version : 0;
    }

    public void setVersion(Integer version) {
        this.version = version;
    }
}
