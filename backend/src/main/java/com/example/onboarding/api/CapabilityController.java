package com.example.onboarding.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/capabilities")
public class CapabilityController {

    @Value("${app.mode:LOCAL_DEMO}")
    private String operatingMode;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getCapabilities() {
        return ResponseEntity.ok(Map.of(
                "operatingMode", operatingMode,
                "branding", "Identity Onboarding Lab",
                "ocrEngine", Map.of(
                        "name", "Tesseract OCR",
                        "version", "5.x",
                        "supportedLanguages", new String[]{"eng", "sin", "tam"},
                        "classification", "REAL"
                ),
                "livenessAnalysis", Map.of(
                        "name", "OpenCV Temporal Movement Analysis",
                        "challengeTypes", new String[]{"TURN_LEFT", "TURN_RIGHT", "BLINK"},
                        "classification", "REAL_EXPERIMENTAL"
                ),
                "padProviderStatus", Map.of(
                        "status", "UNKNOWN",
                        "classification", "UNAVAILABLE",
                        "notes", "Certified ISO 30107-3 PAD weights not loaded; movement alone does not certify PAD."
                ),
                "faceComparison", Map.of(
                        "metric", "COSINE_SIMILARITY",
                        "defaultThreshold", 0.65,
                        "classification", "REAL_EXPERIMENTAL"
                ),
                "sourceVerification", Map.of(
                        "status", "NOT_RUN",
                        "notes", "DRP / National Registry adapters disabled pending institution credentials."
                )
        ));
    }
}
