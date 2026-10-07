package com.example.onboarding.biometric;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface BiometricAttemptRepository extends JpaRepository<BiometricAttempt, UUID> {
    Optional<BiometricAttempt> findByApplicationIdAndGeneration(UUID applicationId, int generation);
}
