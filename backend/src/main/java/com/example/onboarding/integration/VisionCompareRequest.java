package com.example.onboarding.integration;

public record VisionCompareRequest(
        String requestId,
        String portraitStorageKey,
        String liveFrameStorageKey,
        double calibratedThreshold
) {}
