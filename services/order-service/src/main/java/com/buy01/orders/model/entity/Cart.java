package com.buy01.orders.model.entity;

import java.util.ArrayList;
import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import com.buy01.orders.common.CartStatus;
import com.buy01.orders.common.Product;
import lombok.AllArgsConstructor;
import lombok.Data;

@AllArgsConstructor
@Data
@Document (collection = "carts")
public class Cart {
    @Id
    private String id;
    private String username;
    private List<Product> items = new ArrayList<>();
    private CartStatus status;
    public Cart() {
        this.status = CartStatus.AVAILABLE;
    }
}
