package com.buy01.products.service;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.buy01.products.dto.ProductRequest;
import com.buy01.products.dto.ProductResponse;
import com.buy01.products.event.ProductEventPublisher;
import com.buy01.products.exception.ProductNotFoundException;
import com.buy01.products.model.Product;
import com.buy01.products.repository.ProductRepository;
import com.mongodb.client.result.UpdateResult;
import com.buy01.events.product.ReserveItem;
import com.buy01.events.product.ReserveItemResponse;
import lombok.RequiredArgsConstructor;
import com.buy01.events.exception.OutOfStockException;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final MongoTemplate mongoTemplate;
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

    public List<ProductResponse> findAllByIds(List<String> productIds) {
        List<Product> products = productRepository.findAllById(productIds);
        return products.stream()
                .map(product -> ProductResponse.builder()
                        .id(product.getId())
                        .name(product.getName())
                        .description(product.getDescription())
                        .price(product.getPrice())
                        .quantity(product.getQuantity())
                        .owner(false) // Assuming we don't have user context here
                        .build())
                .toList();
    }

    @Transactional
    public void reserve(List<ReserveItem> items) throws OutOfStockException {
        List<ReserveItemResponse> responses = new ArrayList<>();
        boolean success = true;
        for (ReserveItem item : items) {
            Query q = new Query(Criteria.where("id").is(item.productId())
                    .and("quantity").gte(item.quantity()));
            Update u = new Update().inc("quantity", -item.quantity());
            UpdateResult result = mongoTemplate.updateFirst(q, u, Product.class);
            if (result.getModifiedCount() != 1) {
                responses.add(new ReserveItemResponse(item.productId(), item.quantity(), false, "Out of stock"));
                success = false;  
            }
        }
        if(!success) {
            throw new OutOfStockException(responses); // rolls back everything
        }
    }
}
