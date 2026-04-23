package com.buy01.users.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthResponse {
<<<<<<< HEAD
    private String token;
}
=======
    
    private String token;
    private String type; 

    private UserResponse user; 
}
>>>>>>> main
