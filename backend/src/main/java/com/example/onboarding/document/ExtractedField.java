package com.example.onboarding.document;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "extracted_fields")
public class ExtractedField {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private NicDocument document;

    @Column(name = "field_name", nullable = false, length = 64)
    private String fieldName;

    @Column(name = "raw_value_encrypted")
    private String rawValueEncrypted;

    @Column(name = "normalized_value_encrypted")
    private String normalizedValueEncrypted;

    @Column
    private Double confidence;

    @Column(name = "bounding_boxes")
    private String boundingBoxes;

    @Column(length = 32)
    private String script;

    @Column
    private String warnings;

    public ExtractedField() {}

    public ExtractedField(UUID id, NicDocument document, String fieldName, String rawValueEncrypted, String normalizedValueEncrypted, Double confidence, String script) {
        this.id = id;
        this.document = document;
        this.fieldName = fieldName;
        this.rawValueEncrypted = rawValueEncrypted;
        this.normalizedValueEncrypted = normalizedValueEncrypted;
        this.confidence = confidence;
        this.script = script;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public NicDocument getDocument() {
        return document;
    }

    public void setDocument(NicDocument document) {
        this.document = document;
    }

    public String getFieldName() {
        return fieldName;
    }

    public void setFieldName(String fieldName) {
        this.fieldName = fieldName;
    }

    public String getRawValueEncrypted() {
        return rawValueEncrypted;
    }

    public void setRawValueEncrypted(String rawValueEncrypted) {
        this.rawValueEncrypted = rawValueEncrypted;
    }

    public String getNormalizedValueEncrypted() {
        return normalizedValueEncrypted;
    }

    public void setNormalizedValueEncrypted(String normalizedValueEncrypted) {
        this.normalizedValueEncrypted = normalizedValueEncrypted;
    }

    public Double getConfidence() {
        return confidence;
    }

    public void setConfidence(Double confidence) {
        this.confidence = confidence;
    }

    public String getBoundingBoxes() {
        return boundingBoxes;
    }

    public void setBoundingBoxes(String boundingBoxes) {
        this.boundingBoxes = boundingBoxes;
    }

    public String getScript() {
        return script;
    }

    public void setScript(String script) {
        this.script = script;
    }

    public String getWarnings() {
        return warnings;
    }

    public void setWarnings(String warnings) {
        this.warnings = warnings;
    }
}
