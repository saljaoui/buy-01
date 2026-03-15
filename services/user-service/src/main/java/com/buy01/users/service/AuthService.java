package com.buy01.users.service;

import com.buy01.users.dto.AuthResponse;
import com.buy01.users.dto.LoginRequest;
import com.buy01.users.dto.RegisterRequest;
import com.buy01.users.model.User;
import com.buy01.users.repository.UserRepository;
import com.buy01.users.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

public AuthResponse register(RegisterRequest request) {

    System.out.println("Register request received");
    System.out.println("Username: " + request.getUsername());
    System.out.println("Email: " + request.getEmail());
    System.out.println("Role: " + request.getRole());

    boolean emailExists = userRepository.existsByEmail(request.getEmail());
    System.out.println("Email exists in DB: " + emailExists);

    if (emailExists) {
        System.out.println("ERROR: Email already in use");
        throw new RuntimeException("Email already in use");
    }

    boolean usernameExists = userRepository.existsByUsername(request.getUsername());
    System.out.println("Username exists in DB: " + usernameExists);

    if (usernameExists) {
        System.out.println("ERROR: Username already in use");
        throw new RuntimeException("Username already in use");
    }

    System.out.println("Creating user object...");

    User user = User.builder()
            .username(request.getUsername())
            .email(request.getEmail())
            .password(passwordEncoder.encode(request.getPassword()))
            .role(request.getRole())
            .build();

    System.out.println("Saving user to database...");

    User saved = userRepository.save(user);

    System.out.println("User saved successfully with ID: " + saved.getId());

    String token = jwtUtil.generateToken(saved.getId(), saved.getRole());

    System.out.println("JWT token generated");

    return AuthResponse.builder()
            .token(token)
            .userId(saved.getId())
            .username(saved.getUsername())
            .email(saved.getEmail())
            .role(saved.getRole())
            .build();
}


    public AuthResponse login(LoginRequest request) {

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Wrong password");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getRole());

        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }
}