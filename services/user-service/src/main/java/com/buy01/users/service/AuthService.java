package com.buy01.users.service;

import com.buy01.users.dto.AuthResponse;
import com.buy01.users.dto.LoginRequest;
import com.buy01.users.dto.RegisterRequest;
import com.buy01.users.dto.UserResponse;
import com.buy01.users.exception.DuplicateEmailException;
import com.buy01.users.exception.InvalidCredentialsException;
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
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateEmailException("Email is already in use");
        }

        User user = User.builder()
                .name(request.getName().trim())
                .email(request.getEmail().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .avatar(request.getAvatar() != null ? request.getAvatar().trim() : null)
                .build();

        User saved = userRepository.save(user);
        String token = jwtUtil.generateToken(user.getId(), user.getRole());

        return AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .user(toUserResponse(saved))
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository
                .findByEmail(request.getEmail())
                .orElseThrow(() -> new InvalidCredentialsException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new InvalidCredentialsException("Invalid credentials");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getRole());

        return AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .user(toUserResponse(user))
                .build();
    }

    private UserResponse toUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .avatar(user.getAvatar())
                .build();
    }
}
