package com.buy01.gateway.security;

import com.buy01.gateway.util.JwtUtil;
import com.buy01.gateway.validator.RouteValidator;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Slf4j
@Component
@RequiredArgsConstructor
public class AuthenticationFilter implements GlobalFilter, Ordered {

    private final RouteValidator routeValidator;
    private final JwtUtil jwtUtil;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        boolean isSecuredRoute = routeValidator.isSecured(request);

        String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        boolean hasToken = authHeader != null && authHeader.startsWith("Bearer ");

        if (isSecuredRoute && !hasToken) {
            log.warn("Missing Authorization header for secured route: {}", request.getURI().getPath());
            return onError(exchange, HttpStatus.UNAUTHORIZED);
        }

        if (!isSecuredRoute && !hasToken) {
            return chain.filter(exchange);
        }

        String token = authHeader.substring(7);

        if (!jwtUtil.isTokenValid(token)) {
            if (isSecuredRoute) {
                log.warn("Invalid or expired JWT for secured route: {}", request.getURI().getPath());
                return onError(exchange, HttpStatus.UNAUTHORIZED);
            }
            log.debug("Invalid token on public route {}, continuing as anonymous", request.getURI().getPath());
            return chain.filter(exchange);
        }

        Claims claims = jwtUtil.extractAllClaims(token);
        String userId = claims.getSubject();
        String role = (String) claims.get("role");

        ServerHttpRequest mutatedRequest = request.mutate()
                .headers(headers -> {
                    headers.remove("X-User-Id");
                    headers.remove("X-User-Role");
                    headers.add("X-User-Id", userId);
                    headers.add("X-User-Role", role);
                })
                .build();

        log.debug("Forwarding request - userId: {}, role: {}, path: {}",
                userId, role, request.getURI().getPath());

        return chain.filter(exchange.mutate().request(mutatedRequest).build());
    }

    private Mono<Void> onError(ServerWebExchange exchange, HttpStatus status) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(status);
        return response.setComplete();
    }

    @Override
    public int getOrder() {
        return -1;
    }
}