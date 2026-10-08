package com.example.onboarding.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.UUID;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException ex) {
        log.warn("Bad request: {}", ex.getMessage());
        return buildProblem("urn:onboarding:problem:bad-request", "Bad Request", HttpStatus.BAD_REQUEST, "BAD_REQUEST", ex.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleConflict(IllegalStateException ex) {
        log.warn("State conflict: {}", ex.getMessage());
        return buildProblem("urn:onboarding:problem:state-conflict", "State Conflict", HttpStatus.CONFLICT, "STATE_CONFLICT", ex.getMessage());
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<Map<String, Object>> handleForbidden(SecurityException ex) {
        log.warn("Forbidden: {}", ex.getMessage());
        return buildProblem("urn:onboarding:problem:forbidden", "Forbidden", HttpStatus.FORBIDDEN, "FORBIDDEN", ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String detail = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .reduce((a, b) -> a + "; " + b).orElse("Validation failure");
        log.warn("Validation error: {}", detail);
        return buildProblem("urn:onboarding:problem:validation-error", "Validation Failed", HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_FAILED", detail);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneral(Exception ex) {
        log.error("Internal server error: ", ex);
        return buildProblem("urn:onboarding:problem:internal-error", "Internal Error", HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", ex.getMessage());
    }

    private ResponseEntity<Map<String, Object>> buildProblem(String type, String title, HttpStatus status, String code, String detail) {
        Map<String, Object> body = Map.of(
                "type", type,
                "title", title,
                "status", status.value(),
                "code", code,
                "detail", detail != null ? detail : "",
                "correlationId", UUID.randomUUID().toString()
        );
        return ResponseEntity.status(status).body(body);
    }
}
