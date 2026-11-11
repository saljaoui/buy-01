package com.buy01.orders.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import com.buy01.orders.model.entity.Cart;

@Repository
public interface CartRepository extends MongoRepository<Cart, String> {
    boolean existsByItemsId(String productId, String userId);
}
