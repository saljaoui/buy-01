package com.buy01.products.exception;

/**
 * 409 Conflict: the request is valid, but it clashes with the current state of the data.
 * Examples: duplicate value, or a status change that is not allowed (e.g. cancel a shipped order).
 */
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
