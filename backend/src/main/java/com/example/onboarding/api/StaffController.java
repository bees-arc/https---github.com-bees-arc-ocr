package com.example.onboarding.api;

import com.example.onboarding.application.Application;
import com.example.onboarding.application.ApplicationLifecycle;
import com.example.onboarding.application.ApplicationRepository;
import com.example.onboarding.application.DecisionOutcome;
import com.example.onboarding.application.OperatingMode;
import com.example.onboarding.audit.AuditEvent;
import com.example.onboarding.audit.AuditEventRepository;
import com.example.onboarding.audit.AuditService;
import com.example.onboarding.biometric.VerificationCheck;
import com.example.onboarding.biometric.VerificationCheckRepository;
import com.example.onboarding.crypto.AesGcmEncryptionService;
import com.example.onboarding.customer.Customer;
import com.example.onboarding.customer.User;
import com.example.onboarding.customer.UserRole;
import com.example.onboarding.document.ConfirmedIdentity;
import com.example.onboarding.document.ConfirmedIdentityRepository;
import com.example.onboarding.document.ExtractedField;
import com.example.onboarding.document.ExtractedFieldRepository;
import com.example.onboarding.document.NicDocument;
import com.example.onboarding.document.NicDocumentRepository;
import com.example.onboarding.review.ReviewAction;
import com.example.onboarding.review.ReviewActionRepository;
import com.example.onboarding.review.ReviewCase;
import com.example.onboarding.review.ReviewCaseRepository;
import com.example.onboarding.storage.EncryptedStorageService;
import com.example.onboarding.storage.EvidenceObject;
import com.example.onboarding.storage.EvidenceObjectRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/staff")
@PreAuthorize("hasAnyRole('REVIEWER', 'ADMIN', 'AUDITOR')")
public class StaffController {

    private final ApplicationRepository applicationRepository;
    private final ReviewCaseRepository reviewCaseRepository;
    private final ReviewActionRepository reviewActionRepository;
    private final ConfirmedIdentityRepository confirmedIdentityRepository;
    private final NicDocumentRepository nicDocumentRepository;
    private final ExtractedFieldRepository extractedFieldRepository;
    private final VerificationCheckRepository verificationCheckRepository;
    private final EvidenceObjectRepository evidenceObjectRepository;
    private final AuditEventRepository auditEventRepository;
    private final EncryptedStorageService storageService;
    private final AesGcmEncryptionService encryptionService;
    private final AuditService auditService;

    public StaffController(
            ApplicationRepository applicationRepository,
            ReviewCaseRepository reviewCaseRepository,
            ReviewActionRepository reviewActionRepository,
            ConfirmedIdentityRepository confirmedIdentityRepository,
            NicDocumentRepository nicDocumentRepository,
            ExtractedFieldRepository extractedFieldRepository,
            VerificationCheckRepository verificationCheckRepository,
            EvidenceObjectRepository evidenceObjectRepository,
            AuditEventRepository auditEventRepository,
            EncryptedStorageService storageService,
            AesGcmEncryptionService encryptionService,
            AuditService auditService) {
        this.applicationRepository = applicationRepository;
        this.reviewCaseRepository = reviewCaseRepository;
        this.reviewActionRepository = reviewActionRepository;
        this.confirmedIdentityRepository = confirmedIdentityRepository;
        this.nicDocumentRepository = nicDocumentRepository;
        this.extractedFieldRepository = extractedFieldRepository;
        this.verificationCheckRepository = verificationCheckRepository;
        this.evidenceObjectRepository = evidenceObjectRepository;
        this.auditEventRepository = auditEventRepository;
        this.storageService = storageService;
        this.encryptionService = encryptionService;
        this.auditService = auditService;
    }

    public record RecordDecisionDto(
            @NotNull Integer expectedVersion,
            @NotNull DecisionOutcome decision,
            @NotBlank String reason
    ) {}

    @GetMapping("/applications")
    public ResponseEntity<Map<String, Object>> listApplications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<Application> paged = applicationRepository.findAll(PageRequest.of(page, size));
        List<Map<String, Object>> items = paged.getContent().stream().map(app -> {
            Customer cust = app.getCustomer();
            Optional<ConfirmedIdentity> confirmed = confirmedIdentityRepository.findByApplicationId(app.getId());

            String maskedNic = "PENDING";
            if (confirmed.isPresent()) {
                String plainNic = encryptionService.decryptDatabaseField(confirmed.get().getNicNumberEncrypted());
                maskedNic = maskNic(plainNic);
            }

            return Map.<String, Object>of(
                    "id", app.getId(),
                    "lifecycle", app.getLifecycle().name(),
                    "decision", app.getDecision().name(),
                    "operatingMode", app.getOperatingMode().name(),
                    "version", app.getVersion(),
                    "customerName", cust.getFullNameEncrypted() != null ? encryptionService.decryptDatabaseField(cust.getFullNameEncrypted()) : "Unknown",
                    "maskedNic", maskedNic,
                    "submittedAt", app.getSubmittedAt() != null ? app.getSubmittedAt().toString() : ""
            );
        }).toList();

        return ResponseEntity.ok(Map.of(
                "items", items,
                "totalElements", paged.getTotalElements(),
                "totalPages", paged.getTotalPages()
        ));
    }

    @GetMapping("/applications/{id}")
    public ResponseEntity<Map<String, Object>> getApplicationDetail(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {

        Application app = applicationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Application not found: " + id));

        Customer cust = app.getCustomer();
        Optional<ConfirmedIdentity> confirmedOpt = confirmedIdentityRepository.findByApplicationId(app.getId());
        Optional<NicDocument> nicDocOpt = nicDocumentRepository.findByApplicationIdAndGeneration(app.getId(), app.getCurrentDocumentGeneration());

        Map<String, Object> extractionDiff = new HashMap<>();
        if (nicDocOpt.isPresent()) {
            List<ExtractedField> rawFields = extractedFieldRepository.findByDocumentId(nicDocOpt.get().getId());
            for (ExtractedField f : rawFields) {
                extractionDiff.put("raw_" + f.getFieldName(), encryptionService.decryptDatabaseField(f.getNormalizedValueEncrypted()));
            }
        }
        if (confirmedOpt.isPresent()) {
            ConfirmedIdentity c = confirmedOpt.get();
            extractionDiff.put("confirmed_fullName", encryptionService.decryptDatabaseField(c.getFullNameEncrypted()));
            extractionDiff.put("confirmed_nicNumber", encryptionService.decryptDatabaseField(c.getNicNumberEncrypted()));
            extractionDiff.put("confirmed_dob", encryptionService.decryptDatabaseField(c.getDobEncrypted()));
            extractionDiff.put("confirmed_gender", encryptionService.decryptDatabaseField(c.getGenderEncrypted()));
        }

        List<VerificationCheck> checks = verificationCheckRepository.findByApplicationId(app.getId());
        List<EvidenceObject> evidenceList = evidenceObjectRepository.findByApplicationId(app.getId());

        auditService.recordEvent(app.getId(), user.getId(), "CASE_VIEWED", app.getId().toString(), null, null);

        return ResponseEntity.ok(Map.of(
                "id", app.getId(),
                "lifecycle", app.getLifecycle().name(),
                "decision", app.getDecision().name(),
                "operatingMode", app.getOperatingMode().name(),
                "version", app.getVersion(),
                "profile", Map.of(
                        "fullName", cust.getFullNameEncrypted() != null ? encryptionService.decryptDatabaseField(cust.getFullNameEncrypted()) : "",
                        "dateOfBirth", cust.getDobEncrypted() != null ? encryptionService.decryptDatabaseField(cust.getDobEncrypted()) : "",
                        "address", cust.getAddressEncrypted() != null ? encryptionService.decryptDatabaseField(cust.getAddressEncrypted()) : ""
                ),
                "extractionDiff", extractionDiff,
                "checks", checks.stream().map(c -> Map.of(
                        "checkType", c.getCheckType(),
                        "status", c.getStatus().name(),
                        "executionMode", c.getExecutionMode().name(),
                        "score", c.getScore() != null ? c.getScore() : 0.0,
                        "provider", c.getProvider() != null ? c.getProvider() : "",
                        "reasonCodes", c.getReasonCodes() != null ? c.getReasonCodes() : ""
                )).toList(),
                "evidence", evidenceList.stream().map(e -> Map.of(
                        "evidenceId", e.getId(),
                        "kind", e.getKind().name(),
                        "mime", e.getMime(),
                        "generation", e.getGeneration()
                )).toList()
        ));
    }

    @PostMapping("/applications/{id}/decision")
    @PreAuthorize("hasAnyRole('REVIEWER', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> recordDecision(
            @PathVariable UUID id,
            @Valid @RequestBody RecordDecisionDto dto,
            @AuthenticationPrincipal User user) {

        Application app = applicationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Application not found: " + id));

        if (app.getVersion() != dto.expectedVersion()) {
            throw new IllegalStateException("Stale version conflict. Current version is " + app.getVersion());
        }

        // Section 3 rule: LOCAL_DEMO cannot issue APPROVED!
        if (app.getOperatingMode() == OperatingMode.LOCAL_DEMO && dto.decision() == DecisionOutcome.APPROVED) {
            throw new IllegalArgumentException("Local demo mode cannot issue official APPROVED status. Permitted outcomes: DEMO_CHECKS_PASSED, RECAPTURE_REQUIRED, REJECTED.");
        }

        DecisionOutcome previousDecision = app.getDecision();
        app.setDecision(dto.decision());
        app.setLifecycle(ApplicationLifecycle.COMPLETED);
        app.setVersion(app.getVersion() + 1);
        applicationRepository.save(app);

        ReviewCase reviewCase = reviewCaseRepository.findByApplicationId(app.getId())
                .orElse(new ReviewCase(UUID.randomUUID(), app, "MANUAL_DECISION", OffsetDateTime.now()));
        reviewCase.setState("RESOLVED");
        reviewCase.setClosedAt(OffsetDateTime.now());
        reviewCaseRepository.save(reviewCase);

        ReviewAction action = new ReviewAction(
                UUID.randomUUID(),
                reviewCase,
                user,
                "DECISION",
                dto.reason().trim(),
                previousDecision.name(),
                dto.decision().name(),
                OffsetDateTime.now()
        );
        reviewActionRepository.save(action);

        auditService.recordEvent(app.getId(), user.getId(), "REVIEWER_DECISION_RECORDED", app.getId().toString(), "newDecision=" + dto.decision() + ",reason=" + dto.reason(), null);

        return ResponseEntity.ok(Map.of(
                "status", "RECORDED",
                "newDecision", dto.decision().name(),
                "version", app.getVersion()
        ));
    }

    @GetMapping("/evidence/{evidenceId}")
    public ResponseEntity<byte[]> streamEvidence(
            @PathVariable UUID evidenceId,
            @AuthenticationPrincipal User user) {

        EvidenceObject evidence = evidenceObjectRepository.findById(evidenceId)
                .orElseThrow(() -> new IllegalArgumentException("Evidence not found: " + evidenceId));

        byte[] decryptedBytes = storageService.readDecrypted(evidence.getStorageKey());
        auditService.recordEvent(evidence.getApplication().getId(), user.getId(), "EVIDENCE_ACCESSED", evidence.getId().toString(), "kind=" + evidence.getKind(), null);

        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        try {
            mediaType = MediaType.parseMediaType(evidence.getMime());
        } catch (Exception ignored) {}

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + evidence.getId() + "\"")
                .body(decryptedBytes);
    }

    @GetMapping("/audit")
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR')")
    public ResponseEntity<Map<String, Object>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        Page<AuditEvent> paged = auditEventRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));
        return ResponseEntity.ok(Map.of(
                "items", paged.getContent(),
                "totalElements", paged.getTotalElements(),
                "totalPages", paged.getTotalPages()
        ));
    }

    private String maskNic(String nic) {
        if (nic == null || nic.length() < 5) return "*****";
        return nic.substring(0, 3) + "****" + nic.substring(nic.length() - 2);
    }
}
