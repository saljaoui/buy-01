package com.buy01.products.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.buy01.products.dto.ProductRequest;
import com.buy01.products.dto.ProductResponse;
import com.buy01.products.event.ProductEventPublisher;
import com.buy01.products.exception.ProductNotFoundException;
import com.buy01.products.model.Product;
import com.buy01.products.repository.ProductRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductEventPublisher eventPublisher;

    public Page<ProductResponse> findAll(String userId, Pageable pageable) {
        return productRepository.findAll(pageable)
                .map(product -> toResponse(product, userId));
    }

    public ProductResponse findById(String productId, String userId) {
        Product product = getProductOrThrow(productId);
        System.out.println("\nuserId: " + userId + ", product.getUserId(): " + product.getUserId() + "\n");
        return toResponse(product, userId);
    }

    public Page<ProductResponse> findByUserId(String userId, Pageable pageable) {
        return productRepository.findByUserId(userId, pageable)
                .map(product -> toResponse(product, userId));
    }

    public ProductResponse create(ProductRequest request, String userId) {
        Product product = Product.builder()
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .quantity(request.getQuantity())
                .userId(userId)
                .build();

        Product saved = productRepository.save(product);
        return toResponse(saved, userId);
    }

    public ProductResponse update(String productId, ProductRequest request, String userId) {
        Product product = getProductOrThrow(productId);
        checkOwnership(product, userId);

        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setQuantity(request.getQuantity());

        Product saved = productRepository.save(product);
        return toResponse(saved, userId);
    }

    public void delete(String productId, String userId) {
        Product product = getProductOrThrow(productId);
        checkOwnership(product, userId);
        productRepository.delete(product);
        eventPublisher.publishProductDeleted(productId);
    }

    // ---- helpers ----

    private Product getProductOrThrow(String productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ProductNotFoundException("Product not found with id: " + productId));

        return product;
    }

    private void checkOwnership(Product product, String userId) {
        if (!product.getUserId().equals(userId)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You do not own this product");
        }
    }

    public boolean isOwner(String productId, String userId) {
        return productRepository.existsByIdAndUserId(productId, userId);
    }

    private ProductResponse toResponse(Product product, String userId) {
        return ProductResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .price(product.getPrice())
                .quantity(product.getQuantity())
                .owner(product.getUserId().equals(userId))
                .build();
    }
}
