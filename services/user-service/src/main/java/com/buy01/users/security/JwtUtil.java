package com.buy01.users.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.buy01.users.model.Role;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;

import javax.crypto.SecretKey;

@Component
public class JwtUtil {

    private static final int MIN_SECRET_BYTES = 32; // HS256 needs a 256-bit key

    private final SecretKey signingKey;
    private final Duration expiration;

    // jwt.secret has no default: startup fails if JWT_SECRET is missing or too short
    public JwtUtil(@Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration}") Duration expiration) {
        byte[] secretBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "JWT_SECRET must be set and at least " + MIN_SECRET_BYTES + " bytes long");
        }
        this.signingKey = Keys.hmacShaKeyFor(secretBytes);
        this.expiration = expiration;
    }

    public String generateToken(String userId, Role role) {

        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expiration.toMillis());

        return Jwts.builder()
                .subject(userId)
                .claim("role", role)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(signingKey)
                .compact();
    }

    public Claims extractClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isValid(String token) {
        try {
            return !extractClaims(token).getExpiration().before(new Date());
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}