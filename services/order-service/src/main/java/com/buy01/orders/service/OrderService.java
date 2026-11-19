package com.buy01.orders.service;

import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Service;
import com.buy01.orders.common.CartStatus;
import com.buy01.orders.model.entity.Cart;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import com.buy01.orders.client.ProductClient;
import java.util.List;
import com.buy01.orders.model.dto.ProductResponse; 
import com.buy01.orders.common.Product;

@AllArgsConstructor
@Data
@Service
public class OrderService {

    private final CartService cartService;
    private final ProductClient productClient;
    private final MongoTemplate mongoTemplate;

    public String createOrder(String username) {
        Query q = new Query(Criteria.where("username").is(username)
                .and("status").is(CartStatus.AVAILABLE));
        Update u = new Update()
                .set("status", CartStatus.CHECKING_OUT); 
        Cart cart = mongoTemplate.findAndModify(q, u,
                FindAndModifyOptions.options().returnNew(true), Cart.class);
        if (cart != null ) {
            if (cart.getItems().isEmpty()) {
                this.cartService.releaseCart(username);
                return "Cart is empty.";
            }
            placeOrder(cart);
            return "Cart status updated to CHECKING_OUT ";
        } else {
            return "No available cart found for user: " + username;
        }
    }

    private void placeOrder(Cart cart) {
        List<String> productIds = cart.getItems().stream().map(Product::getId)
        .toList();
        List<ProductResponse> items = this.productClient.getAllProducts(productIds);
        items.forEach(System.out::println);
    }
}
