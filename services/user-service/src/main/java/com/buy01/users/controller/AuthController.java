package com.buy01.users.controller;

import com.buy01.users.model.User;
import com.buy01.users.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    
    @GetMapping("/ping")
    public String ping() {
        return "user-service ok";
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        User user = authService.register(
            body.get("username"),
            body.get("email"),
            body.get("password"),
            body.get("role")
        );
        return ResponseEntity.status(201).body(user);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String token = authService.login(
            body.get("email"),
            body.get("password")
        );
        return ResponseEntity.ok(Map.of("token", token));
    }
}