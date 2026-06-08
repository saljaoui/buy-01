package com.buy01.products.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.buy01.products.dto.ProductDto;
import com.buy01.products.dto.ProductResponseDto;
import com.buy01.products.model.Product;
import com.buy01.products.service.ProductService;

import jakarta.validation.Valid;
import lombok.AllArgsConstructor;

@RestController
@RequestMapping("/api/products")
@AllArgsConstructor
public class ProductController {
    private final ProductService productService;
    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_SELLER')")
    public ResponseEntity<?> create(@Valid @RequestPart("product") ProductDto product, Authentication authentication) {
        requireSeller(authentication);
        String userId = authentication.getName();
        Product createdProduct = this.productService.createProduct(product, userId);
        return ResponseEntity.ok(Map.of("id", createdProduct.getId()));
    }

    @PreAuthorize("hasAuthority('ROLE_SELLER')")
    @PutMapping("/{id}")
    public ResponseEntity<Product> update(@PathVariable("id") String id, @Valid @RequestBody ProductDto product, Authentication authentication) {
        requireSeller(authentication);
        return ResponseEntity.ok(this.productService.updateProduct(id, product, authentication));
    }

    @PreAuthorize("hasAuthority('ROLE_SELLER')")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id, Authentication authentication) {
        requireSeller(authentication);
        this.productService.deleteProduct(id, authentication);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", String.format("Product \"%s\" is deleted successfully", id)));
    }

    @GetMapping
    public ResponseEntity<List<Product>> find() {
        return ResponseEntity.ok(this.productService.getProducts());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductResponseDto> find(@PathVariable String id,  Authentication authentication) {
        return ResponseEntity.ok(this.productService.getProductDetails(id, authentication));
    }

    @GetMapping("/ownedBy/{id}")
    public ResponseEntity<List<Product>> findAllBy(@PathVariable String id) {
        return ResponseEntity.ok(this.productService.getProductsOwnedBy(id));
    }

    private void requireSeller(Authentication authentication) {
        boolean seller = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_SELLER".equals(authority.getAuthority()));
        if (!seller) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Seller role required");
        }
    }
}
