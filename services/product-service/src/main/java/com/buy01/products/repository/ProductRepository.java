package com.buy01.products.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import com.buy01.products.model.Product;

public interface ProductRepository extends MongoRepository<Product, String> {
    List<Product> findAllByUserId(String ownerId);
    Page<Product> findByUserId(String userId, Pageable pageable);
    boolean existsByIdAndUserId(String id, String userId);
}
