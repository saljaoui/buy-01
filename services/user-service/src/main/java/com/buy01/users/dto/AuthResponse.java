package com.buy01.users.dto;

import com.buy01.users.model.Role;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthResponse {
    private String token;
    private String userId;
    private String username;
    private String email;
    private Role role;
}