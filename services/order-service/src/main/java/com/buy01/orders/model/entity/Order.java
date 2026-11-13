package com.buy01.orders.model.entity;

import java.util.List;
import org.bson.types.Decimal128;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import com.buy01.orders.common.Product;
import com.buy01.orders.common.Status;
import lombok.AllArgsConstructor;
import lombok.Data;

@AllArgsConstructor
@Data
@Document(collection = "orders")
public class Order {
    @Id
    private String id;
    private String userId;
    private List<Product> items;
    private Decimal128 totalAmount;
    private Status status;
}
