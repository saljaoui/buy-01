package com.buy01.gateway.security;

import com.buy01.gateway.util.JwtUtil;
import com.buy01.gateway.validator.RouteValidator;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthenticationFilterTest {

    @Mock
    private RouteValidator routeValidator;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private GatewayFilterChain chain;

    @Mock
    private Claims claims;

    @InjectMocks
    private AuthenticationFilter authenticationFilter;

    @Test
    void filter_returns401_whenSecuredRouteHasNoToken() {
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/api/cart/subject"));
        when(routeValidator.isSecured(any())).thenReturn(true);

        authenticationFilter.filter(exchange, chain).block();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        verify(chain, never()).filter(any());
    }

    @Test
    void filter_returns401_whenSecuredRouteHasInvalidToken() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/cart/subject").header("Authorization", "Bearer bad-token"));
        when(routeValidator.isSecured(any())).thenReturn(true);
        when(jwtUtil.isTokenValid("bad-token")).thenReturn(false);

        authenticationFilter.filter(exchange, chain).block();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        verify(chain, never()).filter(any());
    }

    @Test
    void filter_addsUserHeaders_whenTokenIsValid() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/cart/subject").header("Authorization", "Bearer good-token"));
        when(routeValidator.isSecured(any())).thenReturn(true);
        when(jwtUtil.isTokenValid("good-token")).thenReturn(true);
        when(jwtUtil.extractAllClaims("good-token")).thenReturn(claims);
        when(claims.getSubject()).thenReturn("user-1");
        when(claims.get("role")).thenReturn("CLIENT");
        when(chain.filter(any())).thenReturn(Mono.empty());

        authenticationFilter.filter(exchange, chain).block();

        ArgumentCaptor<ServerWebExchange> forwarded = ArgumentCaptor.forClass(ServerWebExchange.class);
        verify(chain).filter(forwarded.capture());
        assertThat(forwarded.getValue().getRequest().getHeaders().getFirst("X-User-Id")).isEqualTo("user-1");
        assertThat(forwarded.getValue().getRequest().getHeaders().getFirst("X-User-Role")).isEqualTo("CLIENT");
    }

    @Test
    void filter_removesClientSentUserHeaders() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/products").header("X-User-Id", "hacker").header("X-User-Role", "SELLER"));
        when(routeValidator.isSecured(any())).thenReturn(false);
        when(chain.filter(any())).thenReturn(Mono.empty());

        authenticationFilter.filter(exchange, chain).block();

        ArgumentCaptor<ServerWebExchange> forwarded = ArgumentCaptor.forClass(ServerWebExchange.class);
        verify(chain).filter(forwarded.capture());
        assertThat(forwarded.getValue().getRequest().getHeaders().containsKey("X-User-Id")).isFalse();
        assertThat(forwarded.getValue().getRequest().getHeaders().containsKey("X-User-Role")).isFalse();
    }

    @Test
    void filter_letsRequestThrough_whenPublicRouteHasNoToken() {
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/api/products"));
        when(routeValidator.isSecured(any())).thenReturn(false);
        when(chain.filter(any())).thenReturn(Mono.empty());

        authenticationFilter.filter(exchange, chain).block();

        verify(chain).filter(any());
        assertThat(exchange.getResponse().getStatusCode()).isNull();
    }
}
