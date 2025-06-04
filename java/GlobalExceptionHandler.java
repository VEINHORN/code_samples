package com.infoniqa.one.ddp.onboarding.audit.java;

import com.infoniqa.one.ddp.onboarding.domain.exception.CompoundConstraintViolationException;
import com.infoniqa.one.ddp.onboarding.domain.exception.InvalidDocumentType;
import com.infoniqa.one.ddp.onboarding.domain.exception.OperationNotAllowedException;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.envers.exception.AuditException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.context.request.WebRequest;

import java.util.Date;
import java.util.stream.Stream;

@Slf4j
@ControllerAdvice
public class GlobalExceptionHandler {

    private static ConstraintError toConstraintError(ConstraintViolation < ? > violation) {
        return new ConstraintError(violation.getMessage(), String.valueOf(violation.getPropertyPath()),
                                   String.valueOf(violation.getInvalidValue()));
    }

    @ExceptionHandler
    @ResponseStatus(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
    public @ResponseBody ErrorMessage documentException(InvalidDocumentType invalidDocumentType, WebRequest request) {
        return new ErrorMessage(new Date(), invalidDocumentType.getMessage(), request.getDescription(false), null);
    }

    @ExceptionHandler
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public @ResponseBody ErrorMessage documentException(ConstraintViolationException constraintViolation, WebRequest request) {
        var errors = constraintViolation.getConstraintViolations()
                     .stream()
                     .map(GlobalExceptionHandler::toConstraintError)
                     .toList();
        return new ErrorMessage(new Date(), constraintViolation.getMessage(), request.getDescription(false), errors);
    }

    @ExceptionHandler
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public @ResponseBody ErrorMessage documentException(CompoundConstraintViolationException constraintViolation, WebRequest request) {

        var errors = Stream.concat(constraintViolation.getConstraintViolations()
                                   .stream(), constraintViolation.getAdditionalConstraintViolations()
                                   .stream())
                     .map(GlobalExceptionHandler::toConstraintError)
                     .toList();

        return new ErrorMessage(new Date(), constraintViolation.getMessage(), request.getDescription(false), errors);
    }

    @ExceptionHandler
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public @ResponseBody ErrorMessage handleAuditException(AuditException exception, WebRequest request) {
        log.error(exception.getMessage());
        return new ErrorMessage(new Date(), exception.getMessage(), request.getDescription(false), null);
    }

    @ExceptionHandler
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public @ResponseBody ResponseEntity < ? > handleTenantBleedingException(OperationNotAllowedException exception) {
        log.error(exception.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
               .build();
    }

    public record ErrorMessage(Date timestamp, String message, String description, Object payload) {

    }

    record ConstraintError(String message, String propertyPath, String invalidValue) {}

}