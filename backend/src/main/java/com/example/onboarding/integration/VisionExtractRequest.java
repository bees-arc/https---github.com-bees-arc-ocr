package com.example.onboarding.integration;

import java.util.List;
import java.util.UUID;

public record VisionExtractRequest(
        String requestId,
        UUID jobId,
        UUID applicationId,
        int generation,
        String frontStorageKey,
        String backStorageKey,
        List<String> requestedScripts
) {}
