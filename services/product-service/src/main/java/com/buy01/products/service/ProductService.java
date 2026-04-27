package com.buy01.products.service;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import com.buy01.products.Exceptions.ForbiddenException;
import com.buy01.products.Exceptions.ProductNotFoundException;
import com.buy01.products.dto.ProductDto;
import com.buy01.products.model.Product;
import com.example.events.ProductEvent;
import com.buy01.products.service.ProductEventProducer;

import com.buy01.products.repository.ProductRepository;

import lombok.AllArgsConstructor;
import lombok.Data;

@AllArgsConstructor
@Data
@Service
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
        Product saved = this.productRepository.save(product);
        this.eventProducer.sendEvent(new ProductEvent("CREATED", saved.getId(), saved.getUserId(), saved.getPrice()));
        return saved;
    }

    public Product getProduct(String id) {
        return this.productRepository.findById(id).orElse(null);
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
        if (deletedProduct == null) {
            return;
        }
        this.productRepository.delete(deletedProduct);
        eventProducer.sendEvent(new ProductEvent("DELETED", productId, null, null));
    }
    
    public List<Product> getProductsOwnedBy(String OwnerId) {
        return this.productRepository.findAllByUserId(OwnerId);
    }
    
    public Product checkOwnership(Authentication authentication, String productId) {
        String userId = authentication.getName();
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ProductNotFoundException("Product Not Found"));
        if (!product.getUserId().equals(userId)) {
            throw new ForbiddenException("You are not allowed to access this product");
        }

        return product;
    }
}
