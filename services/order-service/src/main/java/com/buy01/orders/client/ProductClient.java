package com.buy01.orders.client;

import java.util.Optional;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import com.buy01.orders.model.dto.ProductResponse;

@FeignClient(name = "product-service" , dismiss404 = true)
public interface ProductClient {

    @GetMapping("/api/products/{id}")
    Optional<ProductResponse> getProduct(@PathVariable String id);
}