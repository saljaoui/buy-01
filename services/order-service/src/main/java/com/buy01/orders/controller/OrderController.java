package com.buy01.orders.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.buy01.orders.service.OrderService;
import lombok.AllArgsConstructor;

@AllArgsConstructor
@RestController
@RequestMapping("/api/order")
public class OrderController {
    
    private final OrderService orderService;
    @GetMapping("/test")
    public ResponseEntity<String> test() {
        return ResponseEntity.ok("Order service is working");
    }

    @PostMapping
    public ResponseEntity<String> createOrder(Authentication authentication) {
        String message = orderService.createOrder(authentication.getName());
        return ResponseEntity.ok(message);
    }

}
