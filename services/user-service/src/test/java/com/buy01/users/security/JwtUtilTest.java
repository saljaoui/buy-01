package com.buy01.users.security;

import com.buy01.users.model.Role;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtUtilTest {

    private static final String SECRET = "this-is-a-test-secret-of-at-least-32-bytes!";

    private final JwtUtil jwtUtil = new JwtUtil(SECRET, Duration.ofHours(1));

    @Test
    void generateToken_createsValidTokenWithUserIdAndRole() {
        String token = jwtUtil.generateToken("u1", Role.SELLER);

        boolean valid = jwtUtil.isValid(token);

        assertThat(valid).isTrue();
        assertThat(jwtUtil.extractClaims(token).getSubject()).isEqualTo("u1");
        assertThat(jwtUtil.extractClaims(token).get("role")).isEqualTo("SELLER");
    }

    @Test
    void isValid_returnsFalse_whenTokenSignedWithOtherSecret() {
        JwtUtil otherApp = new JwtUtil("another-secret-that-is-also-32-bytes-long!!", Duration.ofHours(1));
        String forgedToken = otherApp.generateToken("u1", Role.SELLER);

        boolean valid = jwtUtil.isValid(forgedToken);

        assertThat(valid).isFalse();
    }

    @Test
    void isValid_returnsFalse_whenTokenIsExpired() {
        JwtUtil expiredMaker = new JwtUtil(SECRET, Duration.ofSeconds(-10));
        String expiredToken = expiredMaker.generateToken("u1", Role.CLIENT);

        boolean valid = jwtUtil.isValid(expiredToken);

        assertThat(valid).isFalse();
    }

    @Test
    void isValid_returnsFalse_whenTokenIsGarbage() {
        boolean valid = jwtUtil.isValid("not-a-jwt");

        assertThat(valid).isFalse();
    }

    @Test
    void constructor_throws_whenSecretIsTooShort() {
        // when / then
        assertThatThrownBy(() -> new JwtUtil("short", Duration.ofHours(1)))
                .isInstanceOf(IllegalStateException.class);
    }
}
