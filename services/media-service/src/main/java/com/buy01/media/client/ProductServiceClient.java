package com.buy01.media.client;

import java.util.List;

import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import com.buy01.media.dto.ProductOwnershipResponse;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class ProductServiceClient {

    private final DiscoveryClient discoveryClient;
    private final RestTemplate restTemplate = new RestTemplate();

    public boolean isCurrentUserOwner(String productId, String authorizationHeader) {
        String baseUrl = resolveBaseUrl();

        HttpHeaders headers = new HttpHeaders();
        if (authorizationHeader != null && !authorizationHeader.isBlank()) {
            headers.set(HttpHeaders.AUTHORIZATION, authorizationHeader);
        }

        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ProductOwnershipResponse response = restTemplate.exchange(
                    baseUrl + "/api/products/" + productId,
                    HttpMethod.GET,
                    entity,
                    ProductOwnershipResponse.class).getBody();

            return response != null && response.isOwner();
        } catch (HttpClientErrorException.NotFound ex) {
            throw ex;
        }
    }

    private String resolveBaseUrl() {
        return discoveryClient.getInstances("product-service").stream()
                .findFirst()
                .map(instance -> instance.getUri().toString())
                .orElse("http://localhost:8082");
    }
}
