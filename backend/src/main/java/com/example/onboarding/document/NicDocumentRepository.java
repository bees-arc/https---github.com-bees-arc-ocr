package com.example.onboarding.document;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface NicDocumentRepository extends JpaRepository<NicDocument, UUID> {
    Optional<NicDocument> findByApplicationIdAndGeneration(UUID applicationId, int generation);
}
