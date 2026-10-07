package com.example.onboarding.jobs;

import com.example.onboarding.application.Application;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class JobService {

    private final JobRepository jobRepository;

    public JobService(JobRepository jobRepository) {
        this.jobRepository = jobRepository;
    }

    @Transactional
    public ProcessingJob scheduleJob(Application application, UUID attemptId, JobKind kind, String dedupKey) {
        Optional<ProcessingJob> existing = jobRepository.findByDedupKey(dedupKey);
        if (existing.isPresent()) {
            return existing.get();
        }
        ProcessingJob job = new ProcessingJob(UUID.randomUUID(), application, attemptId, kind, dedupKey);
        return jobRepository.save(job);
    }

    @Transactional
    public boolean claimJob(UUID jobId, String workerId, int leaseSeconds) {
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime leaseUntil = now.plusSeconds(leaseSeconds);
        return jobRepository.claimJob(jobId, workerId, leaseUntil, now) > 0;
    }

    @Transactional
    public void markCompleted(UUID jobId) {
        jobRepository.findById(jobId).ifPresent(job -> {
            job.setState(JobState.COMPLETED);
            jobRepository.save(job);
        });
    }

    @Transactional
    public void markFailed(UUID jobId, String errorCode, boolean retryable) {
        jobRepository.findById(jobId).ifPresent(job -> {
            job.setLastErrorCode(errorCode);
            if (retryable && job.getRetryCount() < 3) {
                job.setRetryCount(job.getRetryCount() + 1);
                job.setState(JobState.QUEUED);
                // Exponential backoff
                long delaySeconds = (long) Math.pow(2, job.getRetryCount());
                job.setAvailableAt(OffsetDateTime.now().plusSeconds(delaySeconds));
            } else {
                job.setState(JobState.FAILED);
            }
            jobRepository.save(job);
        });
    }
}
