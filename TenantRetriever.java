package com.infoniqa.one.ddp.onboarding.security;

import com.infoniqa.one.base.domain.Tenant;
import com.infoniqa.one.base.service.authentication.web.AuthenticationToken;
import com.infoniqa.one.ddp.onboarding.domain.TenantService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TenantRetriever {

	private final TenantService tenantService;

	public String retrieveCurrentTenantName(UUID tenantIdToMatch) {
		Authentication authentication = SecurityContextHolder.getContext()
															 .getAuthentication();
		if (authentication == null) {
			throw new AccessDeniedException("Not authenticated");
		}

		if (authentication instanceof AuthenticationToken authenticationToken) {
			AuthenticationToken.Tenant currentTenant = authenticationToken.getCurrentTenant();
			if (currentTenant != null) {
				return currentTenant.name();
			}
		}

		return tenantService.findById(tenantIdToMatch)
							.map(Tenant::getCompanyName)
							.orElse(null);
	}
}
