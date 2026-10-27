package com.buy01.products.controller;

import com.buy01.products.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/products")
@RequiredArgsConstructor
public class InternalProductController {

    private final ProductService productService;

    @GetMapping("/{productId}/ownership")
    public boolean checkOwnership(
            @PathVariable String productId,
            @RequestParam String userId
    ) {
        return productService.isOwner(productId, userId);
    }
}