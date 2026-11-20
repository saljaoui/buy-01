package com.buy01.gateway.validator;

import org.junit.jupiter.api.Test;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;

import static org.assertj.core.api.Assertions.assertThat;

class RouteValidatorTest {

    private final RouteValidator routeValidator = new RouteValidator();

    @Test
    void isSecured_returnsFalse_forGetProducts() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/products/p1").build();

        boolean secured = routeValidator.isSecured(request);

        assertThat(secured).isFalse();
    }

    @Test
    void isSecured_returnsFalse_forLoginAndRegister() {
        MockServerHttpRequest login = MockServerHttpRequest.post("/api/auth/login").build();
        MockServerHttpRequest register = MockServerHttpRequest.post("/api/auth/register").build();

        assertThat(routeValidator.isSecured(login)).isFalse();
        assertThat(routeValidator.isSecured(register)).isFalse();
    }

    @Test
    void isSecured_returnsTrue_forPostProducts() {
        MockServerHttpRequest request = MockServerHttpRequest.post("/api/products").build();

        boolean secured = routeValidator.isSecured(request);

        assertThat(secured).isTrue();
    }

    @Test
    void isSecured_returnsTrue_forDeleteMedia() {
        MockServerHttpRequest request = MockServerHttpRequest.delete("/api/media/m1").build();

        boolean secured = routeValidator.isSecured(request);

        assertThat(secured).isTrue();
    }

    @Test
    void isSecured_returnsTrue_forGetCartAndProfile() {
        MockServerHttpRequest cart = MockServerHttpRequest.get("/api/cart/subject").build();
        MockServerHttpRequest profile = MockServerHttpRequest.get("/api/users/me").build();

        assertThat(routeValidator.isSecured(cart)).isTrue();
        assertThat(routeValidator.isSecured(profile)).isTrue();
    }
}
