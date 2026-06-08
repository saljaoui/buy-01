package com.buy01.products.service;

import java.time.Instant;
import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import com.buy01.events.ProductDeletedEvent;
import com.buy01.products.exception.ForbiddenException;
import com.buy01.products.exception.ProductNotFoundException;
import com.buy01.products.dto.ProductDto;
import com.buy01.products.dto.ProductResponseDto;
import com.buy01.products.model.Product;
import com.buy01.products.repository.ProductRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductEventProducer eventProducer;

    public Product createProduct(ProductDto productData, String userId) {
        Product product = new Product();
        product.setName(productData.getName());
        product.setDescription(productData.getDescription());
        product.setPrice(productData.getPrice());
        product.setQuantity(productData.getQuantity());
        product.setUserId(userId);
        return this.productRepository.save(product);
    }

    public Product getProduct(String id) {
        return this.productRepository.findById(id).orElseThrow(() -> new ProductNotFoundException("Product Not Found"));
    }

    public ProductResponseDto getProductDetails(String productId, Authentication authentication) {
        Product product = this.getProduct(productId);
        ProductResponseDto productResponseDto = ProductResponseDto.toDto(product);
        boolean isOwner = authentication != null && product.getUserId().equals(authentication.getName());
        productResponseDto.setOwner(isOwner);
        return productResponseDto;
    }

    public List<Product> getProducts() {
        return this.productRepository.findAll();
    }

    public Product updateProduct(String productId, ProductDto product, Authentication authentication) {
        Product updateProduct = this.checkOwnership(authentication, productId);
        if (product.getName() != null) {
            updateProduct.setName(product.getName());
        }
        if (product.getDescription() != null) {
            updateProduct.setDescription(product.getDescription());
        }
        if (product.getPrice() != null) {
            updateProduct.setPrice(product.getPrice());
        }
        if (product.getQuantity() != null) {
            updateProduct.setQuantity(product.getQuantity());
        }
        return this.productRepository.save(updateProduct);
    }

    public void deleteProduct(String productId, Authentication authentication) {
        Product deletedProduct = this.checkOwnership(authentication, productId);
        this.productRepository.delete(deletedProduct);
        try {
            this.eventProducer.sendProductDeletedEvent(
                    new ProductDeletedEvent(productId, deletedProduct.getUserId(), Instant.now()))
                    .join();
        } catch (RuntimeException ex) {
            log.error("Kafka publish failed for deleted productId={}, restoring database state", productId, ex);
            try {
                this.productRepository.save(deletedProduct);
            } catch (Exception restoreEx) {
                log.error("Failed to restore productId={} after Kafka failure", productId, restoreEx);
                ex.addSuppressed(restoreEx);
            }
            throw new IllegalStateException("Failed to publish product delete event", ex.getCause() == null ? ex : ex.getCause());
        }
    }
    
    public List<Product> getProductsOwnedBy(String ownerId) {
        return this.productRepository.findAllByUserId(ownerId);
    }
    
    public Product checkOwnership(Authentication authentication, String productId) {
        if (authentication == null || authentication.getName() == null) {
            throw new ForbiddenException("You are not allowed to access this product");
        }
        String userId = authentication.getName();
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ProductNotFoundException("Product Not Found"));
        if (!product.getUserId().equals(userId)) {
            throw new ForbiddenException("You are not allowed to access this product");
        }
        return product;
    }
}
