package com.example.onboarding.api;

import com.example.onboarding.application.Application;
import com.example.onboarding.application.ApplicationRepository;
import com.example.onboarding.audit.AuditService;
import com.example.onboarding.biometric.CheckStatus;
import com.example.onboarding.biometric.ExecutionMode;
import com.example.onboarding.biometric.VerificationCheck;
import com.example.onboarding.biometric.VerificationCheckRepository;
import com.example.onboarding.crypto.AesGcmEncryptionService;
import com.example.onboarding.crypto.KeyedHmacService;
import com.example.onboarding.customer.User;
import com.example.onboarding.customer.UserRole;
import com.example.onboarding.decision.ReasonCode;
import com.example.onboarding.document.*;
import com.example.onboarding.jobs.JobKind;
import com.example.onboarding.jobs.JobService;
import com.example.onboarding.jobs.ProcessingJob;
import com.example.onboarding.storage.EncryptedStorageService;
import com.example.onboarding.storage.EvidenceKind;
import com.example.onboarding.storage.EvidenceObject;
import com.example.onboarding.storage.EvidenceObjectRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/applications/{id}/nic")
public class NicController {

    private final ApplicationRepository applicationRepository;
    private final NicDocumentRepository nicDocumentRepository;
    private final ExtractedFieldRepository extractedFieldRepository;
    private final ConfirmedIdentityRepository confirmedIdentityRepository;
    private final EvidenceObjectRepository evidenceObjectRepository;
    private final VerificationCheckRepository verificationCheckRepository;
    private final EncryptedStorageService storageService;
    private final AesGcmEncryptionService encryptionService;
    private final KeyedHmacService keyedHmacService;
    private final JobService jobService;
    private final AuditService auditService;

    public NicController(
            ApplicationRepository applicationRepository,
            NicDocumentRepository nicDocumentRepository,
            ExtractedFieldRepository extractedFieldRepository,
            ConfirmedIdentityRepository confirmedIdentityRepository,
            EvidenceObjectRepository evidenceObjectRepository,
            VerificationCheckRepository verificationCheckRepository,
            EncryptedStorageService storageService,
            AesGcmEncryptionService encryptionService,
            KeyedHmacService keyedHmacService,
            JobService jobService,
            AuditService auditService) {
        this.applicationRepository = applicationRepository;
        this.nicDocumentRepository = nicDocumentRepository;
        this.extractedFieldRepository = extractedFieldRepository;
        this.confirmedIdentityRepository = confirmedIdentityRepository;
        this.evidenceObjectRepository = evidenceObjectRepository;
        this.verificationCheckRepository = verificationCheckRepository;
        this.storageService = storageService;
        this.encryptionService = encryptionService;
        this.keyedHmacService = keyedHmacService;
        this.jobService = jobService;
        this.auditService = auditService;
    }

    public record ConfirmNicDto(
            @NotNull Integer expectedVersion,
            @NotBlank String nicNumber,
            @NotBlank String fullName,
            @NotBlank String dateOfBirth,
            @NotBlank String gender,
            String address
    ) {}

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadNic(
            @PathVariable UUID id,
            @RequestParam("frontImage") MultipartFile frontFile,
            @RequestParam("backImage") MultipartFile backFile,
            @RequestParam("expectedVersion") int expectedVersion,
            @AuthenticationPrincipal User user) throws IOException {

        Application application = getAuthorizedApplication(id, user);
        if (application.getVersion() != expectedVersion) {
            throw new IllegalStateException("Stale version conflict. Application version is " + application.getVersion());
        }

        if (frontFile.isEmpty() || backFile.isEmpty()) {
            throw new IllegalArgumentException("Both front and back images are required");
        }

        // Increment generation and invalidate old downstream biometric/face results
        int generation = application.incrementDocumentGeneration();
        applicationRepository.save(application);

        // Store encrypted front image
        EncryptedStorageService.StorageResult frontRes = storageService.storeEncrypted(frontFile.getBytes(), ".jpg");
        EvidenceObject frontEvidence = new EvidenceObject(
                UUID.randomUUID(),
                application,
                EvidenceKind.NIC_FRONT,
                frontRes.storageKey(),
                frontRes.sha256(),
                frontFile.getContentType() != null ? frontFile.getContentType() : "image/jpeg",
                frontRes.byteSize(),
                generation,
                OffsetDateTime.now()
        );
        evidenceObjectRepository.save(frontEvidence);

        // Store encrypted back image
        EncryptedStorageService.StorageResult backRes = storageService.storeEncrypted(backFile.getBytes(), ".jpg");
        EvidenceObject backEvidence = new EvidenceObject(
                UUID.randomUUID(),
                application,
                EvidenceKind.NIC_BACK,
                backRes.storageKey(),
                backRes.sha256(),
                backFile.getContentType() != null ? backFile.getContentType() : "image/jpeg",
                backRes.byteSize(),
                generation,
                OffsetDateTime.now()
        );
        evidenceObjectRepository.save(backEvidence);

        // Create NicDocument aggregate
        NicDocument nicDoc = new NicDocument(UUID.randomUUID(), application, generation, frontEvidence, backEvidence);
        nicDocumentRepository.save(nicDoc);

        // Schedule async OCR processing job
        String dedupKey = "ocr-gen-" + application.getId() + "-" + generation;
        ProcessingJob job = jobService.scheduleJob(application, nicDoc.getId(), JobKind.NIC_OCR, dedupKey);

        auditService.recordEvent(application.getId(), user.getId(), "NIC_UPLOADED", nicDoc.getId().toString(), "generation=" + generation, null);

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of(
                "jobId", job.getId(),
                "generation", generation,
                "status", "QUEUED"
        ));
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getNicExtraction(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {

        Application application = getAuthorizedApplication(id, user);
        Optional<NicDocument> docOpt = nicDocumentRepository.findByApplicationIdAndGeneration(application.getId(), application.getCurrentDocumentGeneration());

        if (docOpt.isEmpty()) {
            return ResponseEntity.ok(Map.of("status", "NOT_UPLOADED"));
        }

        NicDocument doc = docOpt.get();
        List<ExtractedField> fields = extractedFieldRepository.findByDocumentId(doc.getId());

        Map<String, Object> fieldMap = new HashMap<>();
        for (ExtractedField f : fields) {
            fieldMap.put(f.getFieldName(), Map.of(
                    "value", encryptionService.decryptDatabaseField(f.getNormalizedValueEncrypted()),
                    "confidence", f.getConfidence() != null ? f.getConfidence() : 0.0,
                    "script", f.getScript() != null ? f.getScript() : "eng"
            ));
        }

        return ResponseEntity.ok(Map.of(
                "generation", doc.getGeneration(),
                "processingStatus", doc.getProcessingStatus().name(),
                "layout", doc.getLayout() != null ? doc.getLayout().name() : "UNKNOWN",
                "fields", fieldMap
        ));
    }

    @PostMapping("/confirm")
    public ResponseEntity<Map<String, Object>> confirmNic(
            @PathVariable UUID id,
            @Valid @RequestBody ConfirmNicDto dto,
            @AuthenticationPrincipal User user) {

        Application application = getAuthorizedApplication(id, user);
        if (application.getVersion() != dto.expectedVersion()) {
            throw new IllegalStateException("Stale version conflict. Application version is " + application.getVersion());
        }

        NicDocument doc = nicDocumentRepository.findByApplicationIdAndGeneration(application.getId(), application.getCurrentDocumentGeneration())
                .orElseThrow(() -> new IllegalStateException("No NIC document found for current generation"));

        // Deterministic Sri Lankan NIC validation
        SriLankanNicParser.NicParseResult parseResult = SriLankanNicParser.parse(dto.nicNumber());

        CheckStatus formatStatus = parseResult.valid() ? CheckStatus.PASS : CheckStatus.FAIL;
        String formatReason = parseResult.valid() ? null : parseResult.errorReason();

        VerificationCheck formatCheck = verificationCheckRepository.findByApplicationIdAndCheckType(application.getId(), "NIC_FORMAT_VALIDATION")
                .orElse(new VerificationCheck(UUID.randomUUID(), application, "NIC_FORMAT_VALIDATION", doc.getId(), formatStatus, ExecutionMode.REAL,
                        parseResult.valid() ? 1.0 : 0.0, 1.0, "DETERMINISTIC", "sri-lankan-nic-rules", "v1.0", formatReason, application.getPolicyVersion(), OffsetDateTime.now()));
        formatCheck.setStatus(formatStatus);
        formatCheck.setReasonCodes(formatReason);
        verificationCheckRepository.save(formatCheck);

        // Compare entered DOB vs NIC-derived DOB
        if (parseResult.valid() && parseResult.dateOfBirth() != null) {
            String derivedDobStr = parseResult.dateOfBirth().toString();
            boolean dobMatches = derivedDobStr.equals(dto.dateOfBirth().trim());
            CheckStatus dobStatus = dobMatches ? CheckStatus.PASS : CheckStatus.FAIL;

            VerificationCheck dobCheck = verificationCheckRepository.findByApplicationIdAndCheckType(application.getId(), "NIC_DOB_CONSISTENCY")
                    .orElse(new VerificationCheck(UUID.randomUUID(), application, "NIC_DOB_CONSISTENCY", doc.getId(), dobStatus, ExecutionMode.REAL,
                            dobMatches ? 1.0 : 0.0, 1.0, "CONSISTENCY", "deterministic-dob", "v1.0", dobMatches ? null : ReasonCode.NIC_DOB_CONFLICT, application.getPolicyVersion(), OffsetDateTime.now()));
            dobCheck.setStatus(dobStatus);
            dobCheck.setReasonCodes(dobMatches ? null : ReasonCode.NIC_DOB_CONFLICT);
            verificationCheckRepository.save(dobCheck);
        }

        // Blinded HMAC for duplicate lookup
        String canonicalNic = parseResult.canonicalNic() != null ? parseResult.canonicalNic() : dto.nicNumber().trim().toUpperCase();
        String nicHmac = keyedHmacService.computeNicLookupHmac(canonicalNic);

        // Check for duplicates across other applications
        List<ConfirmedIdentity> duplicates = confirmedIdentityRepository.findByNicLookupHmac(nicHmac);
        boolean duplicateSuspected = duplicates.stream().anyMatch(d -> !d.getApplication().getId().equals(application.getId()));
        if (duplicateSuspected) {
            auditService.recordEvent(application.getId(), user.getId(), "DUPLICATE_NIC_FLAGGED", application.getId().toString(), "duplicate=true", null);
        }

        // Persist confirmed identity
        ConfirmedIdentity confirmed = confirmedIdentityRepository.findByApplicationId(application.getId())
                .orElse(new ConfirmedIdentity(
                        UUID.randomUUID(),
                        application,
                        doc,
                        encryptionService.encryptDatabaseField(dto.fullName()),
                        encryptionService.encryptDatabaseField(canonicalNic),
                        encryptionService.encryptDatabaseField(dto.dateOfBirth()),
                        encryptionService.encryptDatabaseField(dto.gender()),
                        encryptionService.encryptDatabaseField(dto.address()),
                        nicHmac,
                        OffsetDateTime.now(),
                        user
                ));

        confirmed.setFullNameEncrypted(encryptionService.encryptDatabaseField(dto.fullName()));
        confirmed.setNicNumberEncrypted(encryptionService.encryptDatabaseField(canonicalNic));
        confirmed.setDobEncrypted(encryptionService.encryptDatabaseField(dto.dateOfBirth()));
        confirmed.setGenderEncrypted(encryptionService.encryptDatabaseField(dto.gender()));
        confirmed.setAddressEncrypted(encryptionService.encryptDatabaseField(dto.address()));
        confirmed.setNicLookupHmac(nicHmac);
        confirmed.setConfirmedAt(OffsetDateTime.now());
        confirmed.setDocument(doc);
        confirmedIdentityRepository.save(confirmed);

        applicationRepository.save(application);

        auditService.recordEvent(application.getId(), user.getId(), "NIC_CONFIRMED", confirmed.getId().toString(), "canonical=" + canonicalNic.replaceAll("[0-9]", "*"), null);

        return ResponseEntity.ok(Map.of(
                "status", "CONFIRMED",
                "formatValid", parseResult.valid(),
                "layout", parseResult.layout().name()
        ));
    }

    private Application getAuthorizedApplication(UUID id, User user) {
        Application application = applicationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Application not found: " + id));

        if (user.getRole() == UserRole.APPLICANT) {
            if (!application.getCustomer().getUser().getId().equals(user.getId())) {
                throw new SecurityException("Access forbidden to foreign application");
            }
        }
        return application;
    }
}
