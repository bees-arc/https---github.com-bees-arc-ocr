package com.example.onboarding.api;

import com.example.onboarding.customer.User;
import com.example.onboarding.jobs.JobRepository;
import com.example.onboarding.jobs.ProcessingJob;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/jobs")
public class JobController {

    private final JobRepository jobRepository;

    public JobController(JobRepository jobRepository) {
        this.jobRepository = jobRepository;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getJob(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {

        ProcessingJob job = jobRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Job not found: " + id));

        return ResponseEntity.ok(Map.of(
                "jobId", job.getId(),
                "kind", job.getKind().name(),
                "state", job.getState().name(),
                "retryCount", job.getRetryCount(),
                "lastErrorCode", job.getLastErrorCode() != null ? job.getLastErrorCode() : ""
        ));
    }
}
