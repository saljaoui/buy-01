package com.buy01.users.dto;

<<<<<<< HEAD
=======
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
>>>>>>> main
import lombok.Data;

@Data
public class UpdateUserRequest {
<<<<<<< HEAD
    private String name;
=======
    @NotBlank(message = "name is required")
    @Size(min = 2, max = 50, message = "Name must be between 2 and 50 characters")
    private String name;
    
>>>>>>> main
    private String avatar;
}
