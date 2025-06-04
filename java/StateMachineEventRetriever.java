package com.infoniqa.one.ddp.onboarding.audit.java;

import com.infoniqa.one.ddp.onboarding.domain.primitive.OnboardingEvents;
import com.infoniqa.one.ddp.onboarding.domain.primitive.OnboardingStatus;
import lombok.RequiredArgsConstructor;
import org.apache.commons.collections.CollectionUtils;
import org.springframework.statemachine.config.StateMachineFactory;
import org.springframework.statemachine.security.SecurityRule;
import org.springframework.statemachine.transition.Transition;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static com.infoniqa.one.base.service.security.Security.getUserRoles;

@Component
@RequiredArgsConstructor
public class StateMachineEventRetriever {
    private final StateMachineFactory < OnboardingStatus, OnboardingEvents > stateMachineFactory;

    public Set < OnboardingEvents > getPermittedEvents(OnboardingStatus onboardingStatus) {
        var stateMachine = stateMachineFactory.getStateMachine();

        return stateMachine.getTransitions()
               .stream()
               .filter(transition - > transition.getSource()
                       .getId()
                       .equals(onboardingStatus))
               .filter(transition - > isTransitionPermitted(transition, getUserRoles()))
               .map(transition - > transition.getTrigger()
                    .getEvent())
               .collect(Collectors.toSet());
    }

    private boolean isTransitionPermitted(Transition < OnboardingStatus, OnboardingEvents > transition, Set < String > roles) {
        return Optional.ofNullable(transition.getSecurityRule())
               .map(SecurityRule::getAttributes)
               .map(attributes - > CollectionUtils.containsAny(roles, attributes))
               .orElse(true);
    }
}