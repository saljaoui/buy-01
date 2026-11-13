package com.buy01.users.service;

import com.buy01.users.dto.RegisterRequest;
import com.buy01.users.exception.DuplicateEmailException;
import com.buy01.users.model.Role;
import com.buy01.users.model.User;
import com.buy01.users.repository.UserRepository;
import com.buy01.users.security.JwtUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtil jwtUtil;

    @InjectMocks
    private AuthService authService;

    private RegisterRequest request(String email, Role role) {
        RegisterRequest r = new RegisterRequest();
        r.setName("Alice");
        r.setEmail(email);
        r.setPassword("password123");
        r.setRole(role);
        return r;
    }

    @Test
    void duplicateEmailIsRejectedWhateverTheCaseOrSpacing() {
        when(userRepository.existsByEmailIgnoreCase("alice@test.com")).thenReturn(true);

        assertThrows(DuplicateEmailException.class,
                () -> authService.register(request("  Alice@Test.com ", Role.SELLER)));
        verify(userRepository, never()).save(any());
    }

    @Test
    void newSellerIsSavedWithNormalizedEmail() {
        when(userRepository.existsByEmailIgnoreCase("bob@test.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        authService.register(request(" Bob@Test.com", Role.SELLER));

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertEquals("bob@test.com", saved.getValue().getEmail());
        assertEquals(Role.SELLER, saved.getValue().getRole());
    }
}
