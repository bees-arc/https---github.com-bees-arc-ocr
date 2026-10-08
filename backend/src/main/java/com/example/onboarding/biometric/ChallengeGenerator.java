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

        // Provide a robust fintech sequence: BLINK, SHOW_ID_CARD, and a directional head movement
        List<ChallengeStep> selectedSteps = new ArrayList<>();
        selectedSteps.add(ChallengeStep.BLINK);
        selectedSteps.add(ChallengeStep.SHOW_ID_CARD);
        selectedSteps.add(secureRandom.nextBoolean() ? ChallengeStep.TURN_LEFT : ChallengeStep.TURN_RIGHT);

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
