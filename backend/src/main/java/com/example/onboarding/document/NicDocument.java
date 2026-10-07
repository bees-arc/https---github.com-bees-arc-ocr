package com.example.onboarding.document;

import com.example.onboarding.application.Application;
import com.example.onboarding.storage.EvidenceObject;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "nic_documents")
public class NicDocument {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Column(nullable = false)
    private int generation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "front_evidence_id")
    private EvidenceObject frontEvidence;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "back_evidence_id")
    private EvidenceObject backEvidence;

    @Enumerated(EnumType.STRING)
    @Column(length = 32)
    private NicLayout layout;

    @Enumerated(EnumType.STRING)
    @Column(name = "processing_status", nullable = false, length = 32)
    private ProcessingStatus processingStatus;

    public NicDocument() {}

    public NicDocument(UUID id, Application application, int generation, EvidenceObject frontEvidence, EvidenceObject backEvidence) {
        this.id = id;
        this.application = application;
        this.generation = generation;
        this.frontEvidence = frontEvidence;
        this.backEvidence = backEvidence;
        this.layout = NicLayout.UNKNOWN;
        this.processingStatus = ProcessingStatus.PENDING;
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

    public EvidenceObject getFrontEvidence() {
        return frontEvidence;
    }

    public void setFrontEvidence(EvidenceObject frontEvidence) {
        this.frontEvidence = frontEvidence;
    }

    public EvidenceObject getBackEvidence() {
        return backEvidence;
    }

    public void setBackEvidence(EvidenceObject backEvidence) {
        this.backEvidence = backEvidence;
    }

    public NicLayout getLayout() {
        return layout;
    }

    public void setLayout(NicLayout layout) {
        this.layout = layout;
    }

    public ProcessingStatus getProcessingStatus() {
        return processingStatus;
    }

    public void setProcessingStatus(ProcessingStatus processingStatus) {
        this.processingStatus = processingStatus;
    }
}
