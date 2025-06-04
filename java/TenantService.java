package com.infoniqa.one.ddp.onboarding.audit.java;

import com.infoniqa.one.base.domain.Tenant;
import com.infoniqa.one.base.domain.basicdata.BasicData;
import com.infoniqa.one.ddp.onboarding.domain.basicdata.BasicDataService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.rest.core.event.BeforeSaveEvent;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Transactional
@Service("tenant_service")
public class TenantService {
    private final ApplicationEventPublisher eventPublisher;
    private final Tenants tenants;

    private final BasicDataService basicDataService;

    public TenantService(ApplicationEventPublisher eventPublisher, Tenants tenants, @Lazy BasicDataService basicDataService) {
        this.eventPublisher = eventPublisher;
        this.tenants = tenants;
        this.basicDataService = basicDataService;
    }

    public Optional < Tenant > findById(UUID id) {
        return tenants.findById(id);
    }

    public String getTenantCountryCode(UUID id) {

        return tenants.findById(id)
        .map(tenant - > {
            if (tenant.getCountry() == null) {
                log.info("Tenant with ID '{}' has no country set", id);
                return "Other";
            }
            var countryOptional = basicDataService.findById(tenant.getCountry());
            return countryOptional.map(BasicData::getShortCode)
            .orElse("Other");
        })
        .orElse("Other");
    }

    public void createOrReplace(Tenant tenant) {
        tenants.findById(tenant.getId())
        .ifPresentOrElse(existing - > replaceExisting(existing, tenant), () - > create(tenant));
    }

    private void create(Tenant tenant) {
        eventPublisher.publishEvent(new BeforeSaveEvent(tenant));
        tenants.save(tenant);
    }

    private void replaceExisting(Tenant existingTenant, Tenant receivedTenant) {
        delete(existingTenant);
        create(receivedTenant);
    }

    private void delete(Tenant tenant) {
        tenant.getProducts()
        .clear();
        tenants.delete(tenant);
    }

    public void deleteAll() {
        tenants.deleteAll();
    }

    public List < Tenant > getAll() {
        return tenants.findAll();
    }
}