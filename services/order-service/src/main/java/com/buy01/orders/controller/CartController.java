package com.buy01.orders.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.buy01.orders.model.dto.CartUpdateRequest;
import com.buy01.orders.service.CartService;

import jakarta.validation.Valid;
import lombok.AllArgsConstructor;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;

@AllArgsConstructor
@RestController
@RequestMapping("/api/cart")
public class CartController {
    private final CartService cartService;

    @PostMapping("/add-to-cart")
    public ResponseEntity<Void> addToCart(@RequestParam String productId, Authentication authentication) {
        String username = authentication.getName();
        cartService.addToCart(username, productId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/remove-from-cart")
    @PreAuthorize("@cartService.isCartOwner(#cartId, authentication.name)")
    public ResponseEntity<Void> removeFromCart(@RequestParam String productId,
                                               @RequestParam String cartId,
                                               Authentication authentication) {
        cartService.removeFromCart(cartId, productId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/subject")
    public ResponseEntity<?> getSubjectCart(Authentication authentication) {
        String username = authentication.getName();
        return ResponseEntity.ok(cartService.getSubjectCart(username));
    }

    @PutMapping
    @PreAuthorize("@cartService.isCartOwner(#request.cartId, authentication.name)")
    public ResponseEntity<Void> updateCart(@Valid @RequestBody CartUpdateRequest request,
                                           Authentication authentication) {
        String username = authentication.getName();
        cartService.updateCart(request.getCartId(), request, username);
        return ResponseEntity.ok().build();
    }
}