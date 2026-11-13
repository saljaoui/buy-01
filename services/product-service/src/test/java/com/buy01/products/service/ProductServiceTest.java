package com.buy01.products.service;

import com.buy01.products.dto.ProductRequest;
import com.buy01.products.dto.ProductResponse;
import com.buy01.products.event.ProductEventPublisher;
import com.buy01.products.exception.ProductNotFoundException;
import com.buy01.products.model.Product;
import com.buy01.products.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ProductEventPublisher eventPublisher;

    @InjectMocks
    private ProductService productService;

    private Product sampleProduct() {
        return Product.builder()
                .id("p1")
                .name("Laptop")
                .description("A laptop")
                .price(999.0)
                .quantity(5)
                .userId("seller1")
                .build();
    }

    @Test
    void findById_returnsProduct_whenFound() {
        when(productRepository.findById("p1")).thenReturn(Optional.of(sampleProduct()));

        ProductResponse response = productService.findById("p1", "seller1");

        assertEquals("p1", response.getId());
        assertEquals("Laptop", response.getName());
        assertTrue(response.isOwner());
    }

    @Test
    void findById_throws_whenNotFound() {
        when(productRepository.findById("missing")).thenReturn(Optional.empty());

        assertThrows(ProductNotFoundException.class, () -> productService.findById("missing", "seller1"));
    }

    @Test
    void create_savesProductWithUserId() {
        ProductRequest request = new ProductRequest();
        request.setName("Laptop");
        request.setDescription("A laptop");
        request.setPrice(999.0);
        request.setQuantity(5);
        when(productRepository.save(any(Product.class))).thenReturn(sampleProduct());

        ProductResponse response = productService.create(request, "seller1");

        assertEquals("Laptop", response.getName());
        verify(productRepository).save(any(Product.class));
    }

    @Test
    void delete_throws_whenUserIsNotOwner() {
        when(productRepository.findById("p1")).thenReturn(Optional.of(sampleProduct()));

        assertThrows(ResponseStatusException.class, () -> productService.delete("p1", "someoneElse"));
        verify(productRepository, never()).delete(any(Product.class));
        verify(eventPublisher, never()).publishProductDeleted(any());
    }
}
