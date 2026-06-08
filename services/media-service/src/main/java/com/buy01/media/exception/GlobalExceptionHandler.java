package com.buy01.media.exception;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

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
