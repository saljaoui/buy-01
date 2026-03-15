package com.buy01.users.dto;

import lombok.Data;

@Data
public class RegisterRequest {
    private String username;
    private String email;
    private String password;
    private String role; // "CLIENT" or "SELLER"
}