package com.buy01.products.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import com.buy01.products.exception.ForbiddenException;
import com.buy01.products.model.Product;
import com.buy01.products.repository.ProductRepository;

@ExtendWith(MockitoExtension.class)
class ProductServiceOwnershipTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ProductEventProducer eventProducer;

    @Test
    void nonOwnerCannotUpdateProduct() {
        ProductService productService = new ProductService(productRepository, eventProducer);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                "seller-1",
                "token",
                List.of(new SimpleGrantedAuthority("ROLE_SELLER")));

        Product existing = Product.builder()
                .id("product-1")
                .userId("seller-2")
                .build();

        when(productRepository.findById("product-1")).thenReturn(java.util.Optional.of(existing));

        assertThatThrownBy(() -> productService.updateProduct("product-1", new com.buy01.products.dto.ProductDto(), authentication))
                .isInstanceOf(ForbiddenException.class);

        verify(productRepository, never()).save(existing);
    }

    @Test
    void nonOwnerCannotDeleteProduct() {
        ProductService productService = new ProductService(productRepository, eventProducer);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                "seller-1",
                "token",
                List.of(new SimpleGrantedAuthority("ROLE_SELLER")));

        Product existing = Product.builder()
                .id("product-1")
                .userId("seller-2")
                .build();

        when(productRepository.findById("product-1")).thenReturn(java.util.Optional.of(existing));

        assertThatThrownBy(() -> productService.deleteProduct("product-1", authentication))
                .isInstanceOf(ForbiddenException.class);

        verify(productRepository, never()).delete(existing);
    }
}
