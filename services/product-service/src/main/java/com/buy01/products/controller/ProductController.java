package com.buy01.products.controller;
import lombok.AllArgsConstructor;
import java.util.HashMap;
import java.util.List;
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
import org.springframework.web.bind.annotation.RestController;
import com.buy01.products.dto.ProductDto;
import com.buy01.products.model.Product;
import com.buy01.products.service.ProductService;

@RestController
@RequestMapping("/api/products")
@AllArgsConstructor

public class ProductController {
    private final ProductService productService;
    @PostMapping
    @PreAuthorize("hasRole('ROLE_SELLER')")
public ResponseEntity<Product> create(@RequestBody ProductDto product, Authentication authentication) {
        String userID = authentication.getName();
        Product product2 = this.productService.createProduct(product, userID);
        return ResponseEntity.ok(product2);
    }

    @PreAuthorize("hasRole('ROLE_SELLER') and isAuthenticated()")
    @PutMapping("/{id}")
    public ResponseEntity<Product> update(@PathVariable String id, @RequestBody ProductDto product, Authentication authentication) {
        
        return ResponseEntity.ok(this.productService.updateProduct(id, product, authentication));
    }

    @PreAuthorize("hasRole('ROLE_SELLER')")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id, Authentication authentication) {
        this.productService.deleteProduct(id, authentication);
        HashMap<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", String.format("Product \"%s\" is deleted succesfully", id));
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<Product>> find() {
        return ResponseEntity.ok(this.productService.getProducts());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> find(@PathVariable String id) {
        return ResponseEntity.ok(this.productService.getProduct(id));
    }

    @GetMapping("/ownedBy/{id}")
    public ResponseEntity<List<Product>> findAllBy(@PathVariable String id) {
        return ResponseEntity.ok(this.productService.getProductsOwnedBy(id));
    }
}
