package com.example.onboarding.decision;

import com.example.onboarding.application.Application;
import com.example.onboarding.application.ApplicationLifecycle;
import com.example.onboarding.application.DecisionOutcome;
import com.example.onboarding.application.OperatingMode;
import com.example.onboarding.biometric.CheckStatus;
import com.example.onboarding.biometric.VerificationCheck;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class DecisionPolicyEngine {

    public record PolicyEvaluationResult(
            DecisionOutcome decision,
            List<String> reasonCodes,
            String policyVersion
    ) {}

    public PolicyEvaluationResult evaluate(
            Application application,
            boolean hasConsent,
            boolean hasNicConfirmation,
            boolean hasLivenessAttempt,
            List<VerificationCheck> checks
    ) {
        String policyVersion = "v1.0-standard";
        List<String> reasons = new ArrayList<>();

        if (application.getLifecycle() == ApplicationLifecycle.WITHDRAWN) {
            return new PolicyEvaluationResult(DecisionOutcome.REJECTED, List.of("APPLICATION_WITHDRAWN"), policyVersion);
        }

        if (application.getExpiresAt() != null && application.getExpiresAt().isBefore(java.time.OffsetDateTime.now())) {
            return new PolicyEvaluationResult(DecisionOutcome.REJECTED, List.of("APPLICATION_EXPIRED"), policyVersion);
        }

        if (!hasConsent) {
            return new PolicyEvaluationResult(DecisionOutcome.PENDING, List.of(ReasonCode.CONSENT_REQUIRED), policyVersion);
        }

        if (!hasNicConfirmation || !hasLivenessAttempt) {
            return new PolicyEvaluationResult(DecisionOutcome.PENDING, List.of("EVIDENCE_PENDING"), policyVersion);
        }

        // Check for recoverable capture quality
        boolean recoverableQualityFailure = false;
        for (VerificationCheck check : checks) {
            if ("IMAGE_QUALITY".equals(check.getCheckType()) && check.getStatus() == CheckStatus.FAIL) {
                recoverableQualityFailure = true;
                if (check.getReasonCodes() != null) reasons.add(check.getReasonCodes());
            }
            if ("PORTRAIT_EXTRACTION".equals(check.getCheckType()) && check.getStatus() == CheckStatus.FAIL) {
                recoverableQualityFailure = true;
                reasons.add(ReasonCode.PORTRAIT_NOT_FOUND);
            }
        }

        if (recoverableQualityFailure) {
            if (reasons.isEmpty()) reasons.add(ReasonCode.IMAGE_BLURRY);
            return new PolicyEvaluationResult(DecisionOutcome.RECAPTURE_REQUIRED, reasons, policyVersion);
        }

        // Check for required checks being ERROR, UNAVAILABLE, UNSUPPORTED, INCONCLUSIVE
        boolean reviewRequired = false;
        for (VerificationCheck check : checks) {
            if (check.getStatus() == CheckStatus.ERROR ||
                check.getStatus() == CheckStatus.INCONCLUSIVE ||
                check.getStatus() == CheckStatus.UNAVAILABLE ||
                check.getStatus() == CheckStatus.UNSUPPORTED ||
                check.getStatus() == CheckStatus.FAIL) {
                
                reviewRequired = true;
                if (check.getReasonCodes() != null && !check.getReasonCodes().isBlank()) {
                    reasons.add(check.getReasonCodes());
                } else {
                    reasons.add(check.getCheckType() + "_" + check.getStatus());
                }
            }
        }

        if (reviewRequired) {
            return new PolicyEvaluationResult(DecisionOutcome.REVIEW_REQUIRED, reasons, policyVersion);
        }

        // If Operating Mode is LOCAL_DEMO
        if (application.getOperatingMode() == OperatingMode.LOCAL_DEMO) {
            // In LOCAL_DEMO, if all required configured checks pass, return DEMO_CHECKS_PASSED
            // Never return APPROVED or claim real financial account opened!
            return new PolicyEvaluationResult(DecisionOutcome.DEMO_CHECKS_PASSED, List.of("LOCAL_DEMO_CHECKS_PASSED"), policyVersion);
        }

        // If Operating Mode is INSTITUTION
        // Institution requires approved policy + authorized source check + approved biometrics
        // By default, auto-approval is disabled, so it goes to staff review.
        reasons.add(ReasonCode.SOURCE_NOT_CONFIGURED);
        return new PolicyEvaluationResult(DecisionOutcome.REVIEW_REQUIRED, reasons, policyVersion);
    }
}
