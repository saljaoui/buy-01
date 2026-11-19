package com.buy01.orders.client;

import java.util.List;
import java.util.Optional;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import com.buy01.orders.model.dto.ProductResponse;

@FeignClient(name = "product-service" , dismiss404 = true)
public interface ProductClient {

    @GetMapping("/api/products/{id}")
    Optional<ProductResponse> getProduct(@PathVariable String id);

    @PostMapping ("/api/products/collections")
    List<ProductResponse> getAllProducts(@RequestBody List<String> productIds);
}