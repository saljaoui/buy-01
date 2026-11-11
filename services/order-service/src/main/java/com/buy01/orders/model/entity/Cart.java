package com.buy01.orders.model.entity;

import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import com.buy01.orders.common.Product;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Document (collection = "carts")
public class Cart {
    @Id
    private String id;
    private String userId;
    private List<Product> items;
}
