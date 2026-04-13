package com.buy01.products.repository;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.buy01.products.model.Product;

public interface ProductRepository extends MongoRepository<Product, String> {
    List<Product> findAllByUserId(String ownerId);
}
