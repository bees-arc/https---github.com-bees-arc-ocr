package com.example.onboarding.api;

import com.example.onboarding.audit.AuditService;
import com.example.onboarding.customer.Customer;
import com.example.onboarding.customer.CustomerRepository;
import com.example.onboarding.customer.User;
import com.example.onboarding.customer.UserRepository;
import com.example.onboarding.customer.UserRole;
import com.example.onboarding.security.AuthSessionService;
import com.example.onboarding.security.OtpChallenge;
import com.example.onboarding.security.OtpChallengeRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final OtpChallengeRepository otpChallengeRepository;
    private final AuthSessionService authSessionService;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    @Value("${app.otp.demo-enabled:true}")
    private boolean demoOtpEnabled;

    @Value("${app.otp.demo-code:123456}")
    private String demoOtpCode;

    public AuthController(
            UserRepository userRepository,
            CustomerRepository customerRepository,
            OtpChallengeRepository otpChallengeRepository,
            AuthSessionService authSessionService,
            PasswordEncoder passwordEncoder,
            AuditService auditService) {
        this.userRepository = userRepository;
        this.customerRepository = customerRepository;
        this.otpChallengeRepository = otpChallengeRepository;
        this.authSessionService = authSessionService;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    public record RequestOtpDto(@NotBlank String contactLookup) {}
    public record VerifyOtpDto(@NotBlank UUID challengeId, @NotBlank String otpCode) {}
    public record StaffLoginDto(@NotBlank String username, @NotBlank String password) {}

    @PostMapping("/otp/request")
    public ResponseEntity<Map<String, Object>> requestOtp(@Valid @RequestBody RequestOtpDto dto) {
        String code = demoOtpEnabled ? demoOtpCode : String.format("%06d", (int)(Math.random() * 900000) + 100000);
        String codeHash = hashOtp(code, dto.contactLookup());

        UUID challengeId = UUID.randomUUID();
        OtpChallenge challenge = new OtpChallenge(
                challengeId,
                dto.contactLookup().trim(),
                codeHash,
                OffsetDateTime.now().plusSeconds(300)
        );
        otpChallengeRepository.save(challenge);

        auditService.recordEvent(null, null, "OTP_REQUESTED", challengeId.toString(), "contact=" + maskContact(dto.contactLookup()), null);

        return ResponseEntity.ok(Map.of(
                "challengeId", challengeId,
                "expiresInSeconds", 300,
                "demoCodeHint", demoOtpEnabled ? demoOtpCode : null
        ));
    }

    @PostMapping("/otp/verify")
    public ResponseEntity<Map<String, Object>> verifyOtp(@Valid @RequestBody VerifyOtpDto dto) {
        OtpChallenge challenge = otpChallengeRepository.findById(dto.challengeId())
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired OTP challenge"));

        if (!challenge.isValid()) {
            throw new IllegalArgumentException("OTP challenge is expired or already used");
        }

        challenge.setAttempts(challenge.getAttempts() + 1);
        String expectedHash = hashOtp(dto.otpCode().trim(), challenge.getContactLookup());

        if (!expectedHash.equals(challenge.getCodeHash())) {
            otpChallengeRepository.save(challenge);
            throw new IllegalArgumentException("Incorrect OTP code. Attempts remaining: " + (5 - challenge.getAttempts()));
        }

        challenge.setUsedAt(OffsetDateTime.now());
        otpChallengeRepository.save(challenge);

        // Find or create applicant user
        User user = userRepository.findByContactLookup(challenge.getContactLookup())
                .orElseGet(() -> {
                    User newUser = new User(
                            UUID.randomUUID(),
                            UserRole.APPLICANT,
                            challenge.getContactLookup(),
                            null,
                            true,
                            OffsetDateTime.now()
                    );
                    return userRepository.save(newUser);
                });

        // Ensure customer record exists
        Customer customer = customerRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    Customer newCustomer = new Customer(UUID.randomUUID(), user, OffsetDateTime.now(), OffsetDateTime.now());
                    return customerRepository.save(newCustomer);
                });

        AuthSessionService.SessionResult session = authSessionService.createSession(user, 24);
        auditService.recordEvent(null, user.getId(), "APPLICANT_AUTHENTICATED", user.getId().toString(), "contact=" + maskContact(challenge.getContactLookup()), null);

        return ResponseEntity.ok(Map.of(
                "sessionId", session.sessionId(),
                "userId", user.getId(),
                "token", session.token(),
                "role", user.getRole().name()
        ));
    }

    @PostMapping("/staff/login")
    public ResponseEntity<Map<String, Object>> staffLogin(@Valid @RequestBody StaffLoginDto dto) {
        User user = userRepository.findByContactLookup(dto.username().trim())
                .filter(u -> u.getRole() != UserRole.APPLICANT)
                .orElseThrow(() -> new SecurityException("Invalid staff credentials"));

        if (!passwordEncoder.matches(dto.password(), user.getPasswordHash())) {
            throw new SecurityException("Invalid staff credentials");
        }

        AuthSessionService.SessionResult session = authSessionService.createSession(user, 12);
        auditService.recordEvent(null, user.getId(), "STAFF_LOGIN", user.getId().toString(), "username=" + dto.username(), null);

        return ResponseEntity.ok(Map.of(
                "sessionId", session.sessionId(),
                "userId", user.getId(),
                "token", session.token(),
                "role", user.getRole().name()
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            authSessionService.revoke(authHeader.substring(7));
        }
        return ResponseEntity.ok(Map.of("status", "REVOKED"));
    }

    private String hashOtp(String code, String salt) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest((code + ":" + salt).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("OTP hashing failure", e);
        }
    }

    private String maskContact(String contact) {
        if (contact == null || contact.length() < 4) return "****";
        return contact.substring(0, 3) + "***" + contact.substring(contact.length() - 2);
    }
}
