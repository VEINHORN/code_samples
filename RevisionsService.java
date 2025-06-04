package com.infoniqa.one.ddp.onboarding.audit;

import com.infoniqa.one.ddp.onboarding.audit.dto.RevisionRecord;

import com.infoniqa.one.ddp.onboarding.domain.Employee;
import com.infoniqa.one.ddp.onboarding.domain.primitive.OnboardingStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.envers.AuditReader;
import org.hibernate.envers.AuditReaderFactory;
import org.hibernate.envers.query.AuditEntity;
import org.hibernate.envers.query.AuditQuery;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class RevisionsService {

    private final EntityManagerFactory entityManagerFactory;

    private final RevisionsComparator revisionsComparator;

    public List<RevisionRecord> createAuditReport(UUID employeeId) {
        log.debug("#createAuditReport: employeeId={}", employeeId);
        List<RevisionRecord> revisionRecords = new ArrayList<>();

        try (EntityManager entityManager = entityManagerFactory.createEntityManager()) {
            AuditReader auditReader = AuditReaderFactory.get(entityManager);
            List<Number> revisionNumbers = auditReader.getRevisions(Employee.class, employeeId);
            boolean hasSetDefaultAsPrevious = false;
            for (int i = 1; i < revisionNumbers.size(); i++) {
                Number previousRevisionNumber = revisionNumbers.get(i - 1);
                Number currentRevisionNumber = revisionNumbers.get(i);

                Employee previousEmployee = auditReader.find(Employee.class, employeeId, previousRevisionNumber);
                Employee currentEmployee = auditReader.find(Employee.class, employeeId, currentRevisionNumber);
                if (previousEmployee.getOnboardingStatus().equals(currentEmployee.getOnboardingStatus())) {
                    continue;
                }
                boolean shouldUseDefaultAsPrevious = previousEmployee.getOnboardingStatus().equals(OnboardingStatus.OPEN)
                    && currentEmployee.getOnboardingStatus().equals(OnboardingStatus.SENT_TO_BPO)
                    && !hasSetDefaultAsPrevious;
                if (shouldUseDefaultAsPrevious) {
                    hasSetDefaultAsPrevious = true;
                }
                Set<RevisionRecord> differences = revisionsComparator.getEmployeesDeltasBetweenTransitions(
                    previousEmployee,
                    currentEmployee,
                    shouldUseDefaultAsPrevious
                );
                revisionRecords.addAll(differences);
            }
        }
        return revisionRecords;
    }
}
