package com.example.onboarding.customer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.UUID;

@Component
public class UserBootstrapService implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(UserBootstrapService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap.admin-username:staff.admin@identitylab.local}")
    private String adminUsername;

    @Value("${app.bootstrap.admin-password:AdminDemo123!}")
    private String adminPassword;

    public UserBootstrapService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.findByContactLookup(adminUsername).isEmpty()) {
            User admin = new User(
                    UUID.randomUUID(),
                    UserRole.ADMIN,
                    adminUsername,
                    passwordEncoder.encode(adminPassword),
                    true,
                    OffsetDateTime.now()
            );
            userRepository.save(admin);
            log.info("Bootstrapped default staff admin: {}", adminUsername);
        }
    }
}
