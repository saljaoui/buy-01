package com.buy01.orders.controller;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/order")
public class OrderController {
    
    @GetMapping("/test")
    public ResponseEntity<String> test() {
        // For demonstration purposes, we return a simple string. In a real application, you would fetch the order from the database.
        return ResponseEntity.ok("Order service is working");
    }
}
