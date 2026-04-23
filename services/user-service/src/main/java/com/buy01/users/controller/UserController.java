package com.buy01.users.controller;

import com.buy01.users.dto.UpdateUserRequest;
import com.buy01.users.dto.UserResponse;
import com.buy01.users.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
<<<<<<< HEAD
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
=======
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
>>>>>>> main
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
<<<<<<< HEAD
    public ResponseEntity<UserResponse> getCurrentUser(@AuthenticationPrincipal String userId) {
=======
    public ResponseEntity<UserResponse> getCurrentUser(@RequestHeader("X-User-Id") String userId) {
>>>>>>> main
        return ResponseEntity.ok(userService.getCurrentUser(userId));
    }

    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateCurrentUser(
<<<<<<< HEAD
            @AuthenticationPrincipal String userId,
=======
            @RequestHeader("X-User-Id") String userId,
>>>>>>> main
            @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(userService.updateCurrentUser(userId, request));
    }

}
