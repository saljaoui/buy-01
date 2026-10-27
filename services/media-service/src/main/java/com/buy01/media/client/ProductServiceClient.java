package com.buy01.media.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "product-service")
public interface ProductServiceClient {

    @GetMapping("/internal/products/{productId}/ownership")
    boolean checkOwnership(
            @PathVariable("productId") String productId,
            @RequestParam("userId") String userId
    );
}