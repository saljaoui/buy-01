package com.buy01.media.exception;

/**
 * 409 Conflict: the request is valid, but it clashes with the current state of the data.
 */
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
