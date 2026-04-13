package com.buy01.products.Exceptions;

import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.http.HttpStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class ProductNotFoundException extends RuntimeException  {
    public ProductNotFoundException(String msg) {
        super(msg);
        System.out.println(">>> INSIDE PRODUCT SERVICE: " + msg);
    }
}
