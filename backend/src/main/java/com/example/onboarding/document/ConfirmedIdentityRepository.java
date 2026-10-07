package com.example.onboarding.document;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConfirmedIdentityRepository extends JpaRepository<ConfirmedIdentity, UUID> {
    Optional<ConfirmedIdentity> findByApplicationId(UUID applicationId);
    List<ConfirmedIdentity> findByNicLookupHmac(String nicLookupHmac);
}
