package com.buy01.gateway.validator;

import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class RouteValidator {

    private static final List<String> PUBLIC_ENDPOINTS = List.of(
            "/api/auth/register",
            "/api/auth/login",
            "/products",
            "/actuator"
    );

    public boolean isSecured(ServerHttpRequest request) {
        String path = request.getURI().getPath();

        for (String endpoint : PUBLIC_ENDPOINTS) {
            if (path.startsWith(endpoint)) {
                return false;
            }
        }

        return true;
    }
}