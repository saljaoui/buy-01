package com.buy01.users.exception;

/**
 * 409 Conflict: the request is valid, but it clashes with the current state of the data.
 */
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
