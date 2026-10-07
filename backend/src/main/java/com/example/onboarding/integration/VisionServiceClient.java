package com.example.onboarding.integration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Service
public class VisionServiceClient {

    private final RestClient restClient;

    public VisionServiceClient(
            @Value("${app.vision.url}") String visionUrl,
            @Value("${app.vision.secret}") String visionSecret,
            @Value("${app.vision.timeout-ms:15000}") int timeoutMs) {

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(timeoutMs);
        factory.setReadTimeout(timeoutMs);

        this.restClient = RestClient.builder()
                .baseUrl(visionUrl)
                .requestFactory(factory)
                .defaultHeader("X-Internal-Vision-Secret", visionSecret)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public VisionExtractResponse extractNic(VisionExtractRequest request) {
        return restClient.post()
                .uri("/v1/nic/extract")
                .body(request)
                .retrieve()
                .body(VisionExtractResponse.class);
    }

    public VisionBiometricResponse analyzeBiometrics(VisionBiometricRequest request) {
        return restClient.post()
                .uri("/v1/biometrics/analyze")
                .body(request)
                .retrieve()
                .body(VisionBiometricResponse.class);
    }

    public VisionCompareResponse compareFaces(VisionCompareRequest request) {
        return restClient.post()
                .uri("/v1/faces/compare")
                .body(request)
                .retrieve()
                .body(VisionCompareResponse.class);
    }

    public Map<String, Object> getCapabilities() {
        return restClient.get()
                .uri("/v1/capabilities")
                .retrieve()
                .body(Map.class);
    }
}
