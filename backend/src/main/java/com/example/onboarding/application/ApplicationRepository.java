package com.example.onboarding.application;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, UUID> {
    List<Application> findByCustomerIdOrderByVersionDesc(UUID customerId);
    Optional<Application> findTopByCustomerIdOrderBySubmittedAtDesc(UUID customerId);
    Page<Application> findByLifecycle(ApplicationLifecycle lifecycle, Pageable pageable);
    Page<Application> findByDecision(DecisionOutcome decision, Pageable pageable);
}
