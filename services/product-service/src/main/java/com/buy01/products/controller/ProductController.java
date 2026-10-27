package com.buy01.products.controller;

import com.buy01.products.dto.ProductRequest;
import com.buy01.products.dto.ProductResponse;
import com.buy01.products.service.ProductService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public ResponseEntity<Page<ProductResponse>> getAllProducts(Pageable pageable, Authentication authentication) {
        String currentUserId = authentication != null
                ? authentication.getName()
                : null;
                
        return ResponseEntity.ok(productService.findAll(currentUserId, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductResponse> getProductById(@PathVariable String id, Authentication authentication) {
        String currentUserId = authentication != null
                ? authentication.getName()
                : null;

        return ResponseEntity.ok(productService.findById(id, currentUserId));
    }

    @PostMapping
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<ProductResponse> createProduct(
            @Valid @RequestBody ProductRequest request,
            Authentication authentication) {

        String userId = authentication.getName();
        ProductResponse created = productService.create(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<ProductResponse> updateProduct(
            @PathVariable String id,
            @Valid @RequestBody ProductRequest request,
            Authentication authentication) {

        String userId = authentication.getName();
        ProductResponse updated = productService.update(id, request, userId);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<Void> deleteProduct(
            @PathVariable String id,
            Authentication authentication) {

        String userId = authentication.getName();
        productService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }
}