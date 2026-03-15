package com.buy01.users.dto;

import com.buy01.users.model.Role;

import lombok.Data;

@Data
public class RegisterRequest {
    private String username;
    private String email;
    private String password;
    private Role role; // "CLIENT" or "SELLER"
}