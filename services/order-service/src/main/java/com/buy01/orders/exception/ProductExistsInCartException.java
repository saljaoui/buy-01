package com.buy01.orders.exception;

public class ProductExistsInCartException extends RuntimeException {
    public ProductExistsInCartException(String message) {
        super(message);
    }
}