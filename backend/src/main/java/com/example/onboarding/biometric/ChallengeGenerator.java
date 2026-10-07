package com.example.onboarding.biometric;

import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class ChallengeGenerator {

    private final SecureRandom secureRandom = new SecureRandom();

    public record GeneratedChallenge(
            String nonce,
            String nonceHash,
            List<ChallengeStep> steps,
            OffsetDateTime expiresAt
    ) {}

    public GeneratedChallenge generateChallenge() {
        byte[] nonceBytes = new byte[32];
        secureRandom.nextBytes(nonceBytes);
        String nonce = Base64.getUrlEncoder().withoutPadding().encodeToString(nonceBytes);
        String nonceHash = hashNonce(nonce);

        // Pick 2 random distinct challenge actions from TURN_LEFT, TURN_RIGHT, BLINK
        List<ChallengeStep> allSteps = new ArrayList<>(List.of(ChallengeStep.values()));
        Collections.shuffle(allSteps, secureRandom);
        List<ChallengeStep> selectedSteps = allSteps.subList(0, 2);

        OffsetDateTime expiresAt = OffsetDateTime.now().plusSeconds(90);

        return new GeneratedChallenge(nonce, nonceHash, selectedSteps, expiresAt);
    }

    public static String hashNonce(String nonce) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(nonce.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("Error computing nonce hash", e);
        }
    }
}
