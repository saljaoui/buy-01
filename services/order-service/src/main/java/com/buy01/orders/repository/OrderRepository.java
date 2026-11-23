package com.buy01.orders.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.buy01.orders.model.entity.Order;

@Repository 
public interface OrderRepository extends MongoRepository<Order, String>{
    
}
