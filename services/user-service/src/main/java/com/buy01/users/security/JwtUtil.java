package com.buy01.users.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.util.Date;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    public String generateToken(String userId, String role) {
        return Jwts.builder()
            .setSubject(userId)
            .claim("role", role)
            .setExpiration(new Date(System.currentTimeMillis() + 86400000)) // 24h
            .signWith(Keys.hmacShaKeyFor(secret.getBytes()))
            .compact();
    }
}