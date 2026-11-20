package com.buy01.orders.service;

import com.buy01.orders.client.ProductClient;
import com.buy01.orders.common.Product;
import com.buy01.orders.exception.CartNotFoundException;
import com.buy01.orders.exception.ProductExistsInCartException;
import com.buy01.orders.exception.ProductNotFoundException;
import com.buy01.orders.model.dto.CartUpdateRequest;
import com.buy01.orders.model.dto.ProductResponse;
import com.buy01.orders.model.entity.Cart;
import com.buy01.orders.repository.CartRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CartServiceTest {

    @Mock
    private CartRepository cartRepository;

    @Mock
    private ProductClient productClient;

    @InjectMocks
    private CartService cartService;

    @Test
    void addToCart_createsCartWithProduct_whenUserHasNoCart() {
        when(cartRepository.existsByUsernameAndProductId("alice", "p1")).thenReturn(false);
        when(productClient.getProduct("p1")).thenReturn(Optional.of(new ProductResponse("p1", "Lamp", 10.0)));
        when(cartRepository.findByUsername("alice")).thenReturn(Optional.empty());

        cartService.addToCart("alice", "p1");

        ArgumentCaptor<Cart> saved = ArgumentCaptor.forClass(Cart.class);
        verify(cartRepository).save(saved.capture());
        assertThat(saved.getValue().getUsername()).isEqualTo("alice");
        assertThat(saved.getValue().getItems()).extracting(Product::getId).containsExactly("p1");
        assertThat(saved.getValue().getItems().get(0).getQuantity()).isEqualTo(1);
    }

    @Test
    void addToCart_throws_whenProductAlreadyInCart() {
        when(cartRepository.existsByUsernameAndProductId("alice", "p1")).thenReturn(true);

        assertThatThrownBy(() -> cartService.addToCart("alice", "p1"))
                .isInstanceOf(ProductExistsInCartException.class);
        verify(cartRepository, never()).save(any());
    }

    @Test
    void addToCart_throws_whenProductDoesNotExist() {
        when(cartRepository.existsByUsernameAndProductId("alice", "ghost")).thenReturn(false);
        when(productClient.getProduct("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cartService.addToCart("alice", "ghost"))
                .isInstanceOf(ProductNotFoundException.class);
        verify(cartRepository, never()).save(any());
    }

    @Test
    void removeFromCart_removesProductAndSaves() {
        Cart cart = new Cart("c1", "alice", new ArrayList<>(List.of(new Product("p1", "Lamp", 10.0, 1))));
        when(cartRepository.findById("c1")).thenReturn(Optional.of(cart));

        cartService.removeFromCart("c1", "p1");

        assertThat(cart.getItems()).isEmpty();
        verify(cartRepository).save(cart);
    }

    @Test
    void removeFromCart_throws_whenCartNotFound() {
        when(cartRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cartService.removeFromCart("missing", "p1"))
                .isInstanceOf(CartNotFoundException.class);
        verify(cartRepository, never()).save(any());
    }

    @Test
    void updateCart_changesQuantity_whenProductIsInCart() {
        Cart cart = new Cart("c1", "alice", new ArrayList<>(List.of(new Product("p1", "Lamp", 10.0, 1))));
        when(cartRepository.findById("c1")).thenReturn(Optional.of(cart));

        cartService.updateCart("c1", new CartUpdateRequest("p1", 3, "c1"), "alice");

        assertThat(cart.getItems().get(0).getQuantity()).isEqualTo(3);
        verify(cartRepository).save(cart);
    }
}
