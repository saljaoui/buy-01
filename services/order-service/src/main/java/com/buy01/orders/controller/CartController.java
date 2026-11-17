package com.buy01.orders.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.buy01.orders.model.dto.ProductResponse;
import com.buy01.orders.service.CartService;
import lombok.AllArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;

@AllArgsConstructor
@RestController
@RequestMapping("/api/cart")
public class CartController {
    private final CartService cartService;
    @PostMapping("/add-to-cart")
    public ResponseEntity<ProductResponse> addToCart(@RequestParam String productId, Authentication authentication) {
        String username = authentication.getName();
        cartService.addToCart(username, productId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/remove-from-cart")
   // @PreAuthorize ("@cartService.isProductInCart(#productId, authentication.name)")
    public ResponseEntity<ProductResponse> removeFromCart(@RequestParam String productId, String cartId, Authentication authentication) {
        cartService.removeFromCart(cartId, productId);
        return ResponseEntity.ok().build();
    }

    @GetMapping
    public ResponseEntity<?> getCart(Authentication authentication) {
        String userId = authentication.getName();
        return ResponseEntity.ok(cartService.getCartByUserId(userId));
    }

    @GetMapping ("/subject")
    public ResponseEntity<?> getSubjectCart(Authentication authentication) {
        String username = authentication.getName();
        return ResponseEntity.ok(cartService.getSubjectCart(username));
    }
}
