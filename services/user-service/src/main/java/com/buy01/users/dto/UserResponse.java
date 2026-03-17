package com.buy01.users.dto;

import com.buy01.users.model.Role;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserResponse {
    private String id;
    private String name;
    private String email;
    private Role role;
    private String avatar;
}
