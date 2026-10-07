package com.example.onboarding.integration;

import java.util.List;
import java.util.Map;

public record VisionExtractResponse(
        String requestId,
        int generation,
        String executionMode,
        String status,
        DocumentDetail document,
        Map<String, FieldValue> fields,
        PortraitDetail portrait,
        List<String> warnings,
        ProviderDetail provider
) {
    public record DocumentDetail(String layout, QualityDetail quality) {}
    public record QualityDetail(String status, Double blurScore, Boolean glareDetected) {}
    public record FieldValue(String value, Double confidence, String source, String script) {}
    public record PortraitDetail(String status, String portraitStorageKey) {}
    public record ProviderDetail(String name, String version) {}
}
