package com.example.onboarding.biometric;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CameraChallengeRepository extends JpaRepository<CameraChallenge, UUID> {
    Optional<CameraChallenge> findByApplicationIdAndGeneration(UUID applicationId, int generation);
}
