package com.example.onboarding.integration;

import java.util.List;
import java.util.UUID;

public record VisionBiometricResponse(
        UUID attemptId,
        String executionMode,
        String status,
        Double durationSeconds,
        ChallengeOutcome challengeOutcome,
        PadOutcome padOutcome,
        String bestFrameStorageKey,
        List<String> warnings
) {
    public record ChallengeOutcome(String status, List<String> stepsCompleted) {}
    public record PadOutcome(String status, Double score, String scoreType, String provider) {}
}
