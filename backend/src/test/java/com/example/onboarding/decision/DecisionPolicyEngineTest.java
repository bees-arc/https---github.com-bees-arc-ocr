package com.example.onboarding.decision;

import com.example.onboarding.application.Application;
import com.example.onboarding.application.ApplicationLifecycle;
import com.example.onboarding.application.DecisionOutcome;
import com.example.onboarding.application.OperatingMode;
import com.example.onboarding.biometric.CheckStatus;
import com.example.onboarding.biometric.ExecutionMode;
import com.example.onboarding.biometric.VerificationCheck;
import com.example.onboarding.customer.Customer;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class DecisionPolicyEngineTest {

    private final DecisionPolicyEngine engine = new DecisionPolicyEngine();

    @Test
    void testMissingConsentReturnsPending() {
        Application app = new Application(UUID.randomUUID(), new Customer(), OperatingMode.LOCAL_DEMO, "v1.0");
        var result = engine.evaluate(app, false, true, true, List.of());
        assertEquals(DecisionOutcome.PENDING, result.decision());
        assertTrue(result.reasonCodes().contains(ReasonCode.CONSENT_REQUIRED));
    }

    @Test
    void testBlurryImageReturnsRecaptureRequired() {
        Application app = new Application(UUID.randomUUID(), new Customer(), OperatingMode.LOCAL_DEMO, "v1.0");
        VerificationCheck blurCheck = new VerificationCheck(
                UUID.randomUUID(), app, "IMAGE_QUALITY", UUID.randomUUID(),
                CheckStatus.FAIL, ExecutionMode.REAL, 0.2, 0.5, "BLUR_SCORE", "opencv", "v1.0",
                ReasonCode.IMAGE_BLURRY, "v1.0", OffsetDateTime.now()
        );

        var result = engine.evaluate(app, true, true, true, List.of(blurCheck));
        assertEquals(DecisionOutcome.RECAPTURE_REQUIRED, result.decision());
        assertTrue(result.reasonCodes().contains(ReasonCode.IMAGE_BLURRY));
    }

    @Test
    void testLocalDemoPassingChecksReturnsDemoChecksPassed() {
        Application app = new Application(UUID.randomUUID(), new Customer(), OperatingMode.LOCAL_DEMO, "v1.0");
        VerificationCheck ocrCheck = new VerificationCheck(
                UUID.randomUUID(), app, "DOCUMENT_OCR", UUID.randomUUID(),
                CheckStatus.PASS, ExecutionMode.REAL, 0.95, 0.7, "CONFIDENCE", "tesseract", "v1.0",
                null, "v1.0", OffsetDateTime.now()
        );
        VerificationCheck livenessCheck = new VerificationCheck(
                UUID.randomUUID(), app, "MOVEMENT_LIVENESS", UUID.randomUUID(),
                CheckStatus.PASS, ExecutionMode.REAL_EXPERIMENTAL, 1.0, 1.0, "CHALLENGE_MATCH", "opencv", "v1.0",
                null, "v1.0", OffsetDateTime.now()
        );

        var result = engine.evaluate(app, true, true, true, List.of(ocrCheck, livenessCheck));
        // Never approved in demo mode! Must be DEMO_CHECKS_PASSED
        assertEquals(DecisionOutcome.DEMO_CHECKS_PASSED, result.decision());
        assertNotEquals(DecisionOutcome.APPROVED, result.decision());
    }

    @Test
    void testInstitutionModeRequiresStaffReviewByDefault() {
        Application app = new Application(UUID.randomUUID(), new Customer(), OperatingMode.INSTITUTION, "v1.0");
        VerificationCheck ocrCheck = new VerificationCheck(
                UUID.randomUUID(), app, "DOCUMENT_OCR", UUID.randomUUID(),
                CheckStatus.PASS, ExecutionMode.REAL, 0.95, 0.7, "CONFIDENCE", "tesseract", "v1.0",
                null, "v1.0", OffsetDateTime.now()
        );

        var result = engine.evaluate(app, true, true, true, List.of(ocrCheck));
        assertEquals(DecisionOutcome.REVIEW_REQUIRED, result.decision());
        assertTrue(result.reasonCodes().contains(ReasonCode.SOURCE_NOT_CONFIGURED));
    }
}
