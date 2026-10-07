package com.example.onboarding.consent;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConsentRepository extends JpaRepository<ConsentRecord, UUID> {
    List<ConsentRecord> findByApplicationId(UUID applicationId);
    Optional<ConsentRecord> findByApplicationIdAndConsentType(UUID applicationId, ConsentType consentType);
}
