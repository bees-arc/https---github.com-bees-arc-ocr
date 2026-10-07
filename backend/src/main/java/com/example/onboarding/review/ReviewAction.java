package com.example.onboarding.review;

import com.example.onboarding.customer.User;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "review_actions")
public class ReviewAction {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "case_id", nullable = false)
    private ReviewCase reviewCase;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id", nullable = false)
    private User actor;

    @Column(nullable = false, length = 64)
    private String action; // CLAIM, DECISION, RECAPTURE_REQUEST, NOTE

    @Column(nullable = false)
    private String reason;

    @Column(name = "previous_decision", length = 32)
    private String previousDecision;

    @Column(name = "new_decision", length = 32)
    private String newDecision;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    public ReviewAction() {}

    public ReviewAction(UUID id, ReviewCase reviewCase, User actor, String action, String reason, String previousDecision, String newDecision, OffsetDateTime createdAt) {
        this.id = id;
        this.reviewCase = reviewCase;
        this.actor = actor;
        this.action = action;
        this.reason = reason;
        this.previousDecision = previousDecision;
        this.newDecision = newDecision;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public ReviewCase getReviewCase() {
        return reviewCase;
    }

    public void setReviewCase(ReviewCase reviewCase) {
        this.reviewCase = reviewCase;
    }

    public User getActor() {
        return actor;
    }

    public void setActor(User actor) {
        this.actor = actor;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getPreviousDecision() {
        return previousDecision;
    }

    public void setPreviousDecision(String previousDecision) {
        this.previousDecision = previousDecision;
    }

    public String getNewDecision() {
        return newDecision;
    }

    public void setNewDecision(String newDecision) {
        this.newDecision = newDecision;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
