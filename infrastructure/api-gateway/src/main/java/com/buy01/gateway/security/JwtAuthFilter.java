package com.buy01.gateway.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class JwtAuthFilter implements GlobalFilter {

    @Value("${jwt.secret}")
    private String secret;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getPath().toString();
        String method = exchange.getRequest().getMethod().name();

        // 1. Skip public routes
        if (isPublic(path, method)) {
            return chain.filter(exchange);
        }

        // 2. Get Authorization header
        String authHeader = exchange.getRequest()
            .getHeaders().getFirst("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete(); // 401
        }

        // 3. Validate token
        try {
            String token = authHeader.substring(7);
            Claims claims = Jwts.parserBuilder()
                .setSigningKey(Keys.hmacShaKeyFor(secret.getBytes()))
                .build()
                .parseClaimsJws(token)
                .getBody();

            // 4. Add headers for downstream services
            ServerHttpRequest request = exchange.getRequest().mutate()
                .header("X-User-Id", claims.getSubject())
                .header("X-User-Role", claims.get("role", String.class))
                .build();

            return chain.filter(exchange.mutate().request(request).build());

        } catch (Exception e) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete(); // 401 if token invalid
        }
    }

    private boolean isPublic(String path, String method) {
        // Auth routes are always public
        if (path.startsWith("/auth/")) return true;

        // Public GET routes (anyone can browse products and images)
        if (method.equals("GET") && path.startsWith("/products")) return true;
        if (method.equals("GET") && path.startsWith("/media")) return true;

        return false;
    }
}