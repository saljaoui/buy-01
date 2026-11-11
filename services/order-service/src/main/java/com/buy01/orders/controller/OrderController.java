package com.buy01.orders.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.buy01.orders.model.dto.CartItemDTO;
import com.buy01.orders.model.dto.ProductResponse;
import com.buy01.orders.service.CartService;
import lombok.AllArgsConstructor;
import org.springframework.security.core.Authentication;




@AllArgsConstructor
@RestController
@RequestMapping("/api/order")
public class OrderController {
    private final CartService cartService;

    @GetMapping("/test")
    public ResponseEntity<String> test() {
        // For demonstration purposes, we return a simple string. In a real application,
        // you would fetch the order from the database.
        return ResponseEntity.ok("Order service is working");
    }

    @PostMapping("/add-to-cart")
    public ResponseEntity<ProductResponse> addToCart(@RequestBody CartItemDTO cartItemDTO, Authentication authentication) {
        String userId = authentication.getName();
        cartService.addToCart(userId, cartItemDTO.getProductId());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/cart")
    public ResponseEntity<?> getCart(Authentication authentication) {
        String userId = authentication.getName();
        return ResponseEntity.ok(cartService.getCartByUserId(userId));
    }

}
