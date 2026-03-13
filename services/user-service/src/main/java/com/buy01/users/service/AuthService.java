package com.buy01.users.service;

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

    public User register(String username, String email, String password, String role) {

        // Check if email or username already exists
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email already in use");
        }
        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Username already in use");
        }

        // Build and save the user
        User user = User.builder()
            .username(username)
            .email(email)
            .password(passwordEncoder.encode(password)) // 👈 BCrypt hash
            .role(role)
            .build();

        return userRepository.save(user);
    }

    public String login(String email, String password) {

        // Find user by email
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));

        // Check password
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Wrong password");
        }

        // Generate and return JWT token
        return jwtUtil.generateToken(user.getId(), user.getRole());
    }
}