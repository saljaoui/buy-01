package com.buy01.media.exception;

import java.time.LocalDateTime;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import java.lang.IllegalArgumentException;
import java.util.HashMap;
import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;

@ControllerAdvice
public class GlobalExceptionHandler {
    
@ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleParseError(IllegalArgumentException ex) {
        return ResponseEntity
            .badRequest()
            .body(Map.of(
                    "error", "Invalid request format",
                    "message", ex.getMessage()
            ));
    }
}
