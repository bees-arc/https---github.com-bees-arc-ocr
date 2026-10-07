package com.example.onboarding.api;

import com.example.onboarding.application.Application;
import com.example.onboarding.application.ApplicationRepository;
import com.example.onboarding.audit.AuditService;
import com.example.onboarding.biometric.*;
import com.example.onboarding.customer.User;
import com.example.onboarding.customer.UserRole;
import com.example.onboarding.decision.ReasonCode;
import com.example.onboarding.jobs.JobKind;
import com.example.onboarding.jobs.JobService;
import com.example.onboarding.jobs.ProcessingJob;
import com.example.onboarding.storage.EncryptedStorageService;
import com.example.onboarding.storage.EvidenceKind;
import com.example.onboarding.storage.EvidenceObject;
import com.example.onboarding.storage.EvidenceObjectRepository;
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
@RequestMapping("/api/v1/applications/{id}/biometric")
public class BiometricController {

    private final ApplicationRepository applicationRepository;
    private final CameraChallengeRepository cameraChallengeRepository;
    private final BiometricAttemptRepository biometricAttemptRepository;
    private final VerificationCheckRepository verificationCheckRepository;
    private final EvidenceObjectRepository evidenceObjectRepository;
    private final EncryptedStorageService storageService;
    private final ChallengeGenerator challengeGenerator;
    private final JobService jobService;
    private final AuditService auditService;

    public BiometricController(
            ApplicationRepository applicationRepository,
            CameraChallengeRepository cameraChallengeRepository,
            BiometricAttemptRepository biometricAttemptRepository,
            VerificationCheckRepository verificationCheckRepository,
            EvidenceObjectRepository evidenceObjectRepository,
            EncryptedStorageService storageService,
            ChallengeGenerator challengeGenerator,
            JobService jobService,
            AuditService auditService) {
        this.applicationRepository = applicationRepository;
        this.cameraChallengeRepository = cameraChallengeRepository;
        this.biometricAttemptRepository = biometricAttemptRepository;
        this.verificationCheckRepository = verificationCheckRepository;
        this.evidenceObjectRepository = evidenceObjectRepository;
        this.storageService = storageService;
        this.challengeGenerator = challengeGenerator;
        this.jobService = jobService;
        this.auditService = auditService;
    }

    @PostMapping("/challenges")
    public ResponseEntity<Map<String, Object>> createChallenge(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {

        Application application = getAuthorizedApplication(id, user);
        int generation = application.getCurrentBiometricGeneration() + 1;

        ChallengeGenerator.GeneratedChallenge generated = challengeGenerator.generateChallenge();
        String stepsJson = String.join(",", generated.steps().stream().map(Enum::name).toList());

        CameraChallenge challenge = new CameraChallenge(
                UUID.randomUUID(),
                application,
                generation,
                generated.nonceHash(),
                stepsJson,
                generated.expiresAt()
        );
        cameraChallengeRepository.save(challenge);

        auditService.recordEvent(application.getId(), user.getId(), "CHALLENGE_ISSUED", challenge.getId().toString(), "generation=" + generation, null);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "challengeId", challenge.getId(),
                "nonce", generated.nonce(),
                "steps", generated.steps(),
                "expiresAt", generated.expiresAt().toString()
        ));
    }

    @PostMapping(value = "/attempts", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> submitAttempt(
            @PathVariable UUID id,
            @RequestParam("videoFile") MultipartFile videoFile,
            @RequestParam("challengeId") UUID challengeId,
            @RequestParam("nonce") String nonce,
            @RequestParam("expectedVersion") int expectedVersion,
            @AuthenticationPrincipal User user) throws IOException {

        Application application = getAuthorizedApplication(id, user);
        if (application.getVersion() != expectedVersion) {
            throw new IllegalStateException("Stale version conflict. Application version is " + application.getVersion());
        }

        CameraChallenge challenge = cameraChallengeRepository.findById(challengeId)
                .orElseThrow(() -> new IllegalArgumentException("Unknown challenge: " + challengeId));

        if (!challenge.getApplication().getId().equals(application.getId())) {
            throw new SecurityException("Challenge does not belong to this application");
        }

        if (challenge.getConsumedAt() != null) {
            throw new IllegalStateException("Challenge has already been consumed (replay attempt)");
        }

        if (challenge.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new IllegalStateException("Challenge has expired");
        }

        String providedNonceHash = ChallengeGenerator.hashNonce(nonce.trim());
        if (!providedNonceHash.equals(challenge.getNonceHash())) {
            throw new SecurityException("Nonce hash mismatch");
        }

        // Consume challenge atomically
        challenge.setConsumedAt(OffsetDateTime.now());
        cameraChallengeRepository.save(challenge);

        int biometricGen = application.incrementBiometricGeneration();
        application.setVersion(application.getVersion() + 1);
        applicationRepository.save(application);

        // Store video encrypted
        EncryptedStorageService.StorageResult videoRes = storageService.storeEncrypted(videoFile.getBytes(), ".webm");
        EvidenceObject videoEvidence = new EvidenceObject(
                UUID.randomUUID(),
                application,
                EvidenceKind.LIVE_VIDEO,
                videoRes.storageKey(),
                videoRes.sha256(),
                videoFile.getContentType() != null ? videoFile.getContentType() : "video/webm",
                videoRes.byteSize(),
                biometricGen,
                OffsetDateTime.now()
        );
        evidenceObjectRepository.save(videoEvidence);

        BiometricAttempt attempt = new BiometricAttempt(
                UUID.randomUUID(),
                application,
                biometricGen,
                challenge,
                videoEvidence,
                OffsetDateTime.now()
        );
        biometricAttemptRepository.save(attempt);

        // Schedule analysis job
        String dedupKey = "biometric-attempt-" + attempt.getId();
        ProcessingJob job = jobService.scheduleJob(application, attempt.getId(), JobKind.BIOMETRIC_ANALYSIS, dedupKey);

        auditService.recordEvent(application.getId(), user.getId(), "BIOMETRIC_ATTEMPT_SUBMITTED", attempt.getId().toString(), "generation=" + biometricGen, null);

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of(
                "attemptId", attempt.getId(),
                "jobId", job.getId(),
                "status", "QUEUED"
        ));
    }

    @GetMapping("/checks")
    public ResponseEntity<List<Map<String, Object>>> getChecks(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {

        Application application = getAuthorizedApplication(id, user);
        List<VerificationCheck> checks = verificationCheckRepository.findByApplicationId(application.getId());

        List<Map<String, Object>> response = checks.stream().map(c -> Map.<String, Object>of(
                "id", c.getId(),
                "checkType", c.getCheckType(),
                "status", c.getStatus().name(),
                "executionMode", c.getExecutionMode().name(),
                "score", c.getScore() != null ? c.getScore() : 0.0,
                "scoreType", c.getScoreType() != null ? c.getScoreType() : "NONE",
                "threshold", c.getThreshold() != null ? c.getThreshold() : 0.0,
                "provider", c.getProvider() != null ? c.getProvider() : "unknown",
                "modelVersion", c.getModelVersion() != null ? c.getModelVersion() : "v1.0",
                "reasonCodes", c.getReasonCodes() != null ? c.getReasonCodes() : ""
        )).toList();

        return ResponseEntity.ok(response);
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
