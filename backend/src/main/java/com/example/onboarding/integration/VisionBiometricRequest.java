package com.example.onboarding.integration;

import java.util.List;
import java.util.UUID;

public record VisionBiometricRequest(
        UUID attemptId,
        UUID applicationId,
        int generation,
        String videoStorageKey,
        List<String> expectedChallengeSteps,
        String nonce
) {}
