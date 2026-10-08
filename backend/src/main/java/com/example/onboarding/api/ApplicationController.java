package com.example.onboarding.api;

import com.example.onboarding.application.Application;
import com.example.onboarding.application.ApplicationLifecycle;
import com.example.onboarding.application.ApplicationRepository;
import com.example.onboarding.application.OperatingMode;
import com.example.onboarding.audit.AuditService;
import com.example.onboarding.biometric.VerificationCheck;
import com.example.onboarding.biometric.VerificationCheckRepository;
import com.example.onboarding.consent.ConsentRecord;
import com.example.onboarding.consent.ConsentRepository;
import com.example.onboarding.consent.ConsentType;
import com.example.onboarding.crypto.AesGcmEncryptionService;
import com.example.onboarding.customer.Customer;
import com.example.onboarding.customer.CustomerRepository;
import com.example.onboarding.customer.User;
import com.example.onboarding.customer.UserRole;
import com.example.onboarding.decision.DecisionPolicyEngine;
import com.example.onboarding.document.ConfirmedIdentityRepository;
import com.example.onboarding.review.ReviewCase;
import com.example.onboarding.review.ReviewCaseRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/applications")
public class ApplicationController {

    private final ApplicationRepository applicationRepository;
    private final CustomerRepository customerRepository;
    private final ConsentRepository consentRepository;
    private final ConfirmedIdentityRepository confirmedIdentityRepository;
    private final VerificationCheckRepository verificationCheckRepository;
    private final ReviewCaseRepository reviewCaseRepository;
    private final AesGcmEncryptionService encryptionService;
    private final DecisionPolicyEngine decisionPolicyEngine;
    private final AuditService auditService;

    @Value("${app.mode:LOCAL_DEMO}")
    private String configuredAppMode;

    public ApplicationController(
            ApplicationRepository applicationRepository,
            CustomerRepository customerRepository,
            ConsentRepository consentRepository,
            ConfirmedIdentityRepository confirmedIdentityRepository,
            VerificationCheckRepository verificationCheckRepository,
            ReviewCaseRepository reviewCaseRepository,
            AesGcmEncryptionService encryptionService,
            DecisionPolicyEngine decisionPolicyEngine,
            AuditService auditService) {
        this.applicationRepository = applicationRepository;
        this.customerRepository = customerRepository;
        this.consentRepository = consentRepository;
        this.confirmedIdentityRepository = confirmedIdentityRepository;
        this.verificationCheckRepository = verificationCheckRepository;
        this.reviewCaseRepository = reviewCaseRepository;
        this.encryptionService = encryptionService;
        this.decisionPolicyEngine = decisionPolicyEngine;
        this.auditService = auditService;
    }

    public record UpdateDetailsDto(
            @NotNull Integer expectedVersion,
            @NotBlank String fullName,
            @NotBlank String dateOfBirth,
            @NotBlank String addressLine,
            String employmentStatus,
            String sourceOfFunds,
            String taxResidency,
            Boolean pepDeclaration
    ) {}

    public record RecordConsentDto(
            @NotNull ConsentType consentType,
            @NotBlank String version,
            @NotNull Boolean accepted,
            String consentText
    ) {}

    public record SubmitDto(@NotNull Integer expectedVersion) {}

    @PostMapping
    public ResponseEntity<Map<String, Object>> createApplication(@AuthenticationPrincipal User user) {
        Customer customer = customerRepository.findByUserId(user.getId())
                .orElseThrow(() -> new IllegalStateException("Customer profile not initialized"));

        // Check if an active draft exists to resume
        Optional<Application> existing = applicationRepository.findTopByCustomerIdOrderBySubmittedAtDesc(customer.getId());
        if (existing.isPresent() && existing.get().getLifecycle() == ApplicationLifecycle.DRAFT) {
            return ResponseEntity.ok(toMap(existing.get()));
        }

        OperatingMode mode = "INSTITUTION".equalsIgnoreCase(configuredAppMode) ? OperatingMode.INSTITUTION : OperatingMode.LOCAL_DEMO;
        Application application = new Application(UUID.randomUUID(), customer, mode, "v1.0-standard");
        application = applicationRepository.save(application);

        auditService.recordEvent(application.getId(), user.getId(), "APPLICATION_CREATED", application.getId().toString(), "mode=" + mode, null);
        return ResponseEntity.status(HttpStatus.CREATED).body(toMap(application));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getApplication(@PathVariable UUID id, @AuthenticationPrincipal User user) {
        Application application = getAuthorizedApplication(id, user);
        return ResponseEntity.ok(toMap(application));
    }

    @PatchMapping("/{id}/details")
    public ResponseEntity<Map<String, Object>> updateDetails(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateDetailsDto dto,
            @AuthenticationPrincipal User user) {

        Application application = getAuthorizedApplication(id, user);
        if (application.getVersion() != dto.expectedVersion()) {
            throw new IllegalStateException("Stale version conflict. Current version is " + application.getVersion());
        }

        Customer customer = application.getCustomer();
        customer.setFullNameEncrypted(encryptionService.encryptDatabaseField(dto.fullName()));
        customer.setDobEncrypted(encryptionService.encryptDatabaseField(dto.dateOfBirth()));
        customer.setAddressEncrypted(encryptionService.encryptDatabaseField(dto.addressLine()));
        customer.setEmploymentStatus(dto.employmentStatus());
        customer.setSourceOfFunds(dto.sourceOfFunds());
        customer.setTaxResidency(dto.taxResidency());
        customer.setPepDeclaration(dto.pepDeclaration() != null && dto.pepDeclaration());
        customer.setUpdatedAt(OffsetDateTime.now());
        customerRepository.save(customer);

        application = applicationRepository.save(application);

        auditService.recordEvent(application.getId(), user.getId(), "PROFILE_DETAILS_UPDATED", application.getId().toString(), null, null);
        return ResponseEntity.ok(toMap(application));
    }

    @PostMapping("/{id}/consents")
    public ResponseEntity<Map<String, Object>> recordConsent(
            @PathVariable UUID id,
            @Valid @RequestBody RecordConsentDto dto,
            @AuthenticationPrincipal User user) {

        Application application = getAuthorizedApplication(id, user);

        String text = dto.consentText() != null ? dto.consentText() : "Default Onboarding Consent " + dto.version();
        String textHash = computeSha256(text);

        ConsentRecord consent = new ConsentRecord(
                UUID.randomUUID(),
                application,
                dto.consentType(),
                dto.version(),
                textHash,
                OffsetDateTime.now(),
                user
        );
        consentRepository.save(consent);

        auditService.recordEvent(application.getId(), user.getId(), "CONSENT_ACCEPTED", consent.getId().toString(), "type=" + dto.consentType() + ",version=" + dto.version(), null);
        return ResponseEntity.ok(Map.of("status", "RECORDED", "consentId", consent.getId()));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<Map<String, Object>> submitApplication(
            @PathVariable UUID id,
            @Valid @RequestBody SubmitDto dto,
            @AuthenticationPrincipal User user) {

        Application application = getAuthorizedApplication(id, user);
        if (application.getVersion() != dto.expectedVersion()) {
            throw new IllegalStateException("Stale version conflict. Current version is " + application.getVersion());
        }

        boolean hasConsent = consentRepository.findByApplicationIdAndConsentType(application.getId(), ConsentType.IDENTITY_VERIFICATION).isPresent();
        boolean hasNicConfirmation = confirmedIdentityRepository.findByApplicationId(application.getId()).isPresent();
        List<VerificationCheck> checks = verificationCheckRepository.findByApplicationId(application.getId());
        boolean hasLivenessAttempt = checks.stream().anyMatch(c -> "MOVEMENT_LIVENESS".equals(c.getCheckType()));

        DecisionPolicyEngine.PolicyEvaluationResult result = decisionPolicyEngine.evaluate(
                application,
                hasConsent,
                hasNicConfirmation,
                hasLivenessAttempt,
                checks
        );

        application.setDecision(result.decision());
        application.setLifecycle(ApplicationLifecycle.COMPLETED);
        application.setSubmittedAt(OffsetDateTime.now());
        application = applicationRepository.save(application);

        // Open or update review case
        ReviewCase rCase = reviewCaseRepository.findByApplicationId(application.getId())
                .orElse(new ReviewCase(UUID.randomUUID(), application, String.join(",", result.reasonCodes()), OffsetDateTime.now()));
        rCase.setReasonCodes(String.join(",", result.reasonCodes()));
        reviewCaseRepository.save(rCase);

        auditService.recordEvent(application.getId(), user.getId(), "APPLICATION_SUBMITTED", application.getId().toString(), "decision=" + result.decision(), null);
        return ResponseEntity.ok(toMap(application));
    }

    @PostMapping("/{id}/withdraw")
    public ResponseEntity<Map<String, String>> withdrawApplication(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {

        Application application = getAuthorizedApplication(id, user);
        application.setLifecycle(ApplicationLifecycle.WITHDRAWN);
        application = applicationRepository.save(application);

        auditService.recordEvent(application.getId(), user.getId(), "APPLICATION_WITHDRAWN", application.getId().toString(), null, null);
        return ResponseEntity.ok(Map.of("status", "WITHDRAWN"));
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

    private Map<String, Object> toMap(Application app) {
        Customer cust = app.getCustomer();
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", app.getId());
        map.put("lifecycle", app.getLifecycle().name());
        map.put("decision", app.getDecision().name());
        map.put("operatingMode", app.getOperatingMode().name());
        map.put("version", app.getVersion());
        map.put("currentDocumentGeneration", app.getCurrentDocumentGeneration());
        map.put("currentBiometricGeneration", app.getCurrentBiometricGeneration());
        map.put("submittedAt", app.getSubmittedAt() != null ? app.getSubmittedAt().toString() : "");
        map.put("fullName", cust.getFullNameEncrypted() != null ? encryptionService.decryptDatabaseField(cust.getFullNameEncrypted()) : "");
        map.put("dateOfBirth", cust.getDobEncrypted() != null ? encryptionService.decryptDatabaseField(cust.getDobEncrypted()) : "");
        map.put("addressLine", cust.getAddressEncrypted() != null ? encryptionService.decryptDatabaseField(cust.getAddressEncrypted()) : "");
        return map;
    }

    private String computeSha256(String text) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(text.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            return "hash-err";
        }
    }
}
