package com.buy01.products.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.concurrent.CompletableFuture;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import com.buy01.events.ProductDeletedEvent;
import com.buy01.products.model.Product;
import com.buy01.products.repository.ProductRepository;

@ExtendWith(MockitoExtension.class)
class ProductServiceEventTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ProductEventProducer eventProducer;

    @Test
    void deleteProductPublishesDeleteEvent() {
        ProductService productService = new ProductService(productRepository, eventProducer);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                "seller-1",
                "token",
                List.of(new SimpleGrantedAuthority("ROLE_SELLER")));

        Product existing = Product.builder()
                .id("product-1")
                .userId("seller-1")
                .build();

        when(productRepository.findById("product-1")).thenReturn(java.util.Optional.of(existing));
        doNothing().when(productRepository).delete(existing);
        when(eventProducer.sendProductDeletedEvent(org.mockito.ArgumentMatchers.any(ProductDeletedEvent.class)))
                .thenReturn(CompletableFuture.completedFuture(null));

        productService.deleteProduct("product-1", authentication);

        verify(productRepository).delete(existing);
        verify(eventProducer).sendProductDeletedEvent(org.mockito.ArgumentMatchers.argThat(event ->
                event != null
                        && "product-1".equals(event.productId())
                        && "seller-1".equals(event.deletedBy())));
    }

    @Test
    void deleteProductRestoresRecordWhenKafkaPublishFails() {
        ProductService productService = new ProductService(productRepository, eventProducer);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                "seller-1",
                "token",
                List.of(new SimpleGrantedAuthority("ROLE_SELLER")));

        Product existing = Product.builder()
                .id("product-1")
                .userId("seller-1")
                .build();

        when(productRepository.findById("product-1")).thenReturn(java.util.Optional.of(existing));
        when(eventProducer.sendProductDeletedEvent(org.mockito.ArgumentMatchers.any(ProductDeletedEvent.class)))
                .thenReturn(CompletableFuture.failedFuture(new RuntimeException("Kafka down")));

        assertThatThrownBy(() -> productService.deleteProduct("product-1", authentication))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Failed to publish product delete event");

        verify(productRepository).delete(existing);
        verify(productRepository).save(existing);
    }
}
