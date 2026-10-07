package com.example.onboarding.review;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReviewCaseRepository extends JpaRepository<ReviewCase, UUID> {
    Optional<ReviewCase> findByApplicationId(UUID applicationId);
    Page<ReviewCase> findByState(String state, Pageable pageable);
}
