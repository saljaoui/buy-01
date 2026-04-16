package com.buy01.users.service;

import com.buy01.users.dto.UpdateUserRequest;
import com.buy01.users.dto.UserResponse;
import com.buy01.users.exception.UserNotFoundException;
import com.buy01.users.model.User;
import com.buy01.users.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    

    public UserResponse getCurrentUser(String userId) {
        return toUserResponse(getUserById(userId));
    }

    public UserResponse updateCurrentUser(String userId, UpdateUserRequest request) {
        User user = getUserById(userId);
        boolean updated = false;

        if (request.getName() != null) {
            String name = request.getName().trim();
            if (name.isEmpty()) {
                throw new IllegalArgumentException("name must not be blank");
            }
            user.setName(name);
            updated = true;
        }

        if (request.getAvatar() != null) {
            String avatar = request.getAvatar().trim();
            user.setAvatar(avatar.isEmpty() ? null : avatar);
            updated = true;
        }

        if (updated) {
            user = userRepository.save(user);
        }

        return toUserResponse(user);
    }

    private User getUserById(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
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
