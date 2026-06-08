package com.buy01.gateway.validator;

import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;

@Component
public class RouteValidator {

    public boolean isSecured(ServerHttpRequest request) {
        String path = request.getURI().getPath();
        HttpMethod method = request.getMethod();

        if (path.startsWith("/api/auth/")) {
            return false;
        }

        if (method == HttpMethod.GET && path.startsWith("/api/products")) {
            return false;
        }

        if (method == HttpMethod.GET && path.startsWith("/api/media/primary/")) {
            return false;
        }

        if (method == HttpMethod.GET && path.startsWith("/api/media/product/")) {
            return false;
        }

        if (path.startsWith("/actuator")) {
            return false;
        }

        return true;
    }
}
