package com.buy01.orders.exception;

import java.nio.file.ProviderNotFoundException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import com.buy01.orders.model.dto.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import com.buy01.orders.exception.ProductExistsInCartException;

@ControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(ProductExistsInCartException.class)
    public ResponseEntity<ErrorResponse> handleInvalidFile(ProductExistsInCartException ex, HttpServletRequest request) {
        return buildResponse(HttpStatus.CONFLICT, "Product_Exists_In_Cart", ex.getMessage(), request);
    }

    private ResponseEntity<ErrorResponse> buildResponse(HttpStatus status, String errorCode, String message, HttpServletRequest request) {
        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(status.value())
                .error(errorCode)
                .message(message)
                .path(request.getRequestURI())
                .build();
        return new ResponseEntity<>(errorResponse, status);
    }
}
