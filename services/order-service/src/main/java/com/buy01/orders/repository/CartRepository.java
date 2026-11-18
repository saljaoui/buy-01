package com.buy01.orders.repository;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;
import com.buy01.orders.model.entity.Cart;

@Repository
public interface CartRepository extends MongoRepository<Cart, String> {
    @Query(value = "{ 'username': ?0, 'items.id': ?1 }", exists = true)
    boolean existsByUsernameAndProductId(String username, String productId);

    Optional<Cart> findByUsername(String username);

    boolean existsByIdAndUsername(String cartId, String username);
}
