package com.buy01.users.exception;

public class DuplicateEmailException extends ConflictException {

    public DuplicateEmailException(String message) {
        super(message);
    }
}
