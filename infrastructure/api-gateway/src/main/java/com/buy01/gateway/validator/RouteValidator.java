package com.buy01.gateway.validator;

import org.springframework.http.HttpMethod;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;

@Component
public class RouteValidator {

    private static final String[] PUBLIC_GET_PATHS = {
            "/api/products",
            "/api/media",
            "/actuator/health"
    };

    private static final String[] PUBLIC_POST_PATHS = {
            "/api/auth/login",
            "/api/auth/register"
    };

    public boolean isSecured(ServerHttpRequest request) {

        String path = request.getURI().getPath();
        HttpMethod method = request.getMethod();

        if (method == HttpMethod.GET) {
            for (String publicPath : PUBLIC_GET_PATHS) {
                if (path.startsWith(publicPath)) {
                    return false;
                }
            }
        }

        if (method == HttpMethod.POST) {
            for (String publicPath : PUBLIC_POST_PATHS) {
                if (path.startsWith(publicPath)) {
                    return false;
                }
            }
        }

        return true;
    }
}
