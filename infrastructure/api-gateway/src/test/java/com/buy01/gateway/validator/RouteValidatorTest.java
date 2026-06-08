package com.buy01.gateway.validator;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;

class RouteValidatorTest {

    private final RouteValidator routeValidator = new RouteValidator();

    @Test
    void authRoutesArePublic() {
        var request = MockServerHttpRequest.method(HttpMethod.POST, "/api/auth/login").build();

        assertThat(routeValidator.isSecured(request)).isFalse();
    }

    @Test
    void productGetRoutesArePublic() {
        var request = MockServerHttpRequest.get("/api/products/123").build();

        assertThat(routeValidator.isSecured(request)).isFalse();
    }

    @Test
    void productWriteRoutesAreSecured() {
        var request = MockServerHttpRequest.post("/api/products").build();

        assertThat(routeValidator.isSecured(request)).isTrue();
    }

    @Test
    void mediaReadRoutesArePublic() {
        var request = MockServerHttpRequest.get("/api/media/product/123").build();

        assertThat(routeValidator.isSecured(request)).isFalse();
    }

    @Test
    void mediaWriteRoutesAreSecured() {
        var request = MockServerHttpRequest.put("/api/media/product").build();

        assertThat(routeValidator.isSecured(request)).isTrue();
    }
}
