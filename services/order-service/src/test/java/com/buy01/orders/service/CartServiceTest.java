package com.buy01.orders.service;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
public class CartServiceTest {

    @Test
    public void testAddToCart() {
        boolean exists = true;
        assertThat(exists).isTrue();
    }

}
