package com.example.onboarding.jobs;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JobRepository extends JpaRepository<ProcessingJob, UUID> {

    Optional<ProcessingJob> findByDedupKey(String dedupKey);

    @Query("SELECT j FROM ProcessingJob j WHERE (j.state = 'QUEUED' AND j.availableAt <= :now) " +
           "OR (j.state = 'PROCESSING' AND j.leaseUntil < :now) ORDER BY j.availableAt ASC")
    List<ProcessingJob> findClaimableJobs(@Param("now") OffsetDateTime now);

    @Modifying
    @Query("UPDATE ProcessingJob j SET j.state = 'PROCESSING', j.workerId = :workerId, j.leaseUntil = :leaseUntil " +
           "WHERE j.id = :jobId AND ((j.state = 'QUEUED') OR (j.state = 'PROCESSING' AND j.leaseUntil < :now))")
    int claimJob(@Param("jobId") UUID jobId, @Param("workerId") String workerId, @Param("leaseUntil") OffsetDateTime leaseUntil, @Param("now") OffsetDateTime now);
}
