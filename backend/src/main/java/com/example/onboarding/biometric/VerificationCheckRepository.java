package com.example.onboarding.biometric;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VerificationCheckRepository extends JpaRepository<VerificationCheck, UUID> {
    List<VerificationCheck> findByApplicationId(UUID applicationId);
    Optional<VerificationCheck> findByApplicationIdAndCheckType(UUID applicationId, String checkType);
}
