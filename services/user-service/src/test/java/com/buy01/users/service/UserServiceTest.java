package com.buy01.users.service;

import com.buy01.users.dto.UpdateUserRequest;
import com.buy01.users.dto.UserResponse;
import com.buy01.users.exception.UserNotFoundException;
import com.buy01.users.model.Role;
import com.buy01.users.model.User;
import com.buy01.users.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    private User sampleUser() {
        return User.builder()
                .id("u1")
                .name("Alice")
                .email("alice@test.com")
                .role(Role.SELLER)
                .build();
    }

    @Test
    void getCurrentUser_returnsUser_whenFound() {
        when(userRepository.findById("u1")).thenReturn(Optional.of(sampleUser()));

        UserResponse response = userService.getCurrentUser("u1");

        assertEquals("u1", response.getId());
        assertEquals("Alice", response.getName());
        assertEquals("alice@test.com", response.getEmail());
        assertEquals(Role.SELLER, response.getRole());
    }

    @Test
    void getCurrentUser_throws_whenNotFound() {
        when(userRepository.findById("missing")).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class, () -> userService.getCurrentUser("missing"));
    }

    @Test
    void updateCurrentUser_changesNameAndSaves() {
        User user = sampleUser();
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        UpdateUserRequest request = new UpdateUserRequest();
        request.setName("Bob");

        UserResponse response = userService.updateCurrentUser("u1", request);

        assertEquals("Bob", response.getName());
        verify(userRepository).save(user);
    }
}
