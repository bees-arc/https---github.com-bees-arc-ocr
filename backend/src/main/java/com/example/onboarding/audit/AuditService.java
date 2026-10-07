package com.example.onboarding.audit;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class AuditService {

    private final AuditEventRepository auditEventRepository;

    public AuditService(AuditEventRepository auditEventRepository) {
        this.auditEventRepository = auditEventRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordEvent(UUID applicationId, UUID actorId, String action, String objectRef, String safeMetadata, String correlationId) {
        AuditEvent event = new AuditEvent(
                UUID.randomUUID(),
                applicationId,
                actorId,
                action,
                objectRef,
                safeMetadata,
                correlationId != null ? correlationId : UUID.randomUUID().toString(),
                OffsetDateTime.now()
        );
        auditEventRepository.save(event);
    }
}
