package com.example.onboarding.integration;

import java.util.List;

public record VisionCompareResponse(
        String requestId,
        String executionMode,
        String status,
        Double score,
        String scoreType,
        double threshold,
        ProviderDetail provider,
        List<String> warnings
) {
    public record ProviderDetail(String name, String version) {}
}
