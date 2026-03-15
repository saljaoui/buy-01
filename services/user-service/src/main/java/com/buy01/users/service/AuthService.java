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

        boolean emailExists = userRepository.existsByEmail(request.getEmail());
        if (emailExists) {
        }

        boolean usernameExists = userRepository.existsByUsername(request.getUsername());
        if (usernameExists) {
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .build();

        User saved = userRepository.save(user);

        String token = jwtUtil.generateToken(saved.getId(), saved.getRole());

        return AuthResponse.builder()
                .token(token)
                .userId(saved.getId())
                .username(saved.getUsername())
                .email(saved.getEmail())
                .role(saved.getRole())
                .build();
    }

    public AuthResponse login(LoginRequest request) {

        String login = request.getLogin().trim();

        User user = userRepository
                .findByEmailOrUsername(login, login)
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid credentials");
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