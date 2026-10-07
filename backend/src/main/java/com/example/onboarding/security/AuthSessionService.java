package com.example.onboarding.security;

import com.example.onboarding.customer.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthSessionService {

    private final AuthSessionRepository sessionRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    public record SessionResult(String sessionId, String token, User user) {}

    public AuthSessionService(AuthSessionRepository sessionRepository) {
        this.sessionRepository = sessionRepository;
    }

    @Transactional
    public SessionResult createSession(User user, int durationHours) {
        byte[] tokenBytes = new byte[32];
        secureRandom.nextBytes(tokenBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
        String tokenHash = hashToken(token);
        String sessionId = UUID.randomUUID().toString();

        AuthSession session = new AuthSession(
                sessionId,
                user,
                tokenHash,
                OffsetDateTime.now().plusHours(durationHours)
        );
        sessionRepository.save(session);
        return new SessionResult(sessionId, token, user);
    }

    @Transactional(readOnly = true)
    public Optional<User> authenticate(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        String tokenHash = hashToken(token.trim());
        return sessionRepository.findByTokenHash(tokenHash)
                .filter(AuthSession::isActive)
                .map(AuthSession::getUser);
    }

    @Transactional
    public void revoke(String token) {
        if (token == null) return;
        String tokenHash = hashToken(token.trim());
        sessionRepository.findByTokenHash(tokenHash).ifPresent(s -> {
            s.setRevokedAt(OffsetDateTime.now());
            sessionRepository.save(s);
        });
    }

    public static String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("Error hashing session token", e);
        }
    }
}
